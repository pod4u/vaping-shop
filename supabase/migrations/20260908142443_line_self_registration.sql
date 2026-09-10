create table public.line_registration_sessions (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_account_id text not null,
  provider_user_id text not null,
  token_hash text not null,
  expires_at timestamp with time zone not null,
  used_at timestamp with time zone,
  invalidated_at timestamp with time zone,
  active boolean not null default true,
  customer_id integer,
  customer_identity_id uuid,
  created_at timestamp with time zone not null default now(),

  constraint line_registration_sessions_provider_not_blank_check
    check (btrim(provider) <> ''),
  constraint line_registration_sessions_provider_account_not_blank_check
    check (btrim(provider_account_id) <> ''),
  constraint line_registration_sessions_provider_user_not_blank_check
    check (btrim(provider_user_id) <> ''),
  constraint line_registration_sessions_token_hash_check
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint line_registration_sessions_expiry_check
    check (expires_at > created_at and expires_at <= created_at + interval '10 minutes'),
  constraint line_registration_sessions_customer_id_fkey
    foreign key (customer_id) references public.customers (id) on delete set null,
  constraint line_registration_sessions_identity_id_fkey
    foreign key (customer_identity_id) references public.customer_identities (id) on delete set null,
  constraint line_registration_sessions_lifecycle_check
    check (
      (
        active
        and used_at is null
        and invalidated_at is null
        and customer_id is null
        and customer_identity_id is null
      )
      or
      (
        not active
        and used_at is not null
        and invalidated_at is null
        and customer_id is not null
        and customer_identity_id is not null
      )
      or
      (
        not active
        and used_at is null
        and invalidated_at is not null
        and customer_id is null
        and customer_identity_id is null
      )
    )
);

comment on table public.line_registration_sessions is
  'Server-only, short-lived LINE-bound registration sessions. Only HMAC token digests are stored.';

comment on column public.line_registration_sessions.token_hash is
  'HMAC-SHA256 digest of the opaque browser token. The plaintext token is never persisted.';

create unique index line_registration_sessions_one_active_identity_idx
  on public.line_registration_sessions (provider, provider_account_id, provider_user_id)
  where active;

create index line_registration_sessions_expires_at_idx
  on public.line_registration_sessions (expires_at)
  where active;

create index line_registration_sessions_customer_id_idx
  on public.line_registration_sessions (customer_id)
  where customer_id is not null;

create index line_registration_sessions_identity_id_idx
  on public.line_registration_sessions (customer_identity_id)
  where customer_identity_id is not null;

alter table public.line_registration_sessions enable row level security;

revoke all on table public.line_registration_sessions
  from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.line_registration_sessions
  to service_role;

alter table public.customer_identity_verification_audit_logs
  add column registration_session_id uuid
    references public.line_registration_sessions (id)
    on delete set null;

alter table public.customer_identity_verification_audit_logs
  drop constraint customer_identity_verification_audit_logs_event_type_check;

alter table public.customer_identity_verification_audit_logs
  add constraint customer_identity_verification_audit_logs_event_type_check
  check (event_type in (
    'created',
    'superseded',
    'failed',
    'locked',
    'expired',
    'verified',
    'identity_conflict',
    'registration_started',
    'registration_superseded',
    'registration_verified'
  ));

alter table public.customer_identity_verification_audit_logs
  add constraint customer_identity_verification_audit_token_source_check
  check (num_nonnulls(token_record_id, registration_session_id) <= 1);

create index customer_identity_verification_audit_registration_session_idx
  on public.customer_identity_verification_audit_logs (registration_session_id)
  where registration_session_id is not null;

create function public.create_line_registration_session(
  p_provider text,
  p_provider_account_id text,
  p_provider_user_id text,
  p_token_hash text,
  p_expires_at timestamp with time zone,
  p_request_ip text,
  p_user_agent text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session_id uuid;
  v_now timestamp with time zone := now();
  v_superseded public.line_registration_sessions%rowtype;
begin
  if p_provider is null or btrim(p_provider) = ''
    or p_provider_account_id is null or btrim(p_provider_account_id) = ''
    or p_provider_user_id is null or btrim(p_provider_user_id) = ''
    or p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$'
  then
    raise exception 'invalid LINE registration session input' using errcode = '22023';
  end if;

  if p_expires_at <= v_now or p_expires_at > v_now + interval '10 minutes' then
    raise exception 'invalid LINE registration session expiry' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      btrim(p_provider) || E'\\x1f' || btrim(p_provider_account_id) || E'\\x1f' || btrim(p_provider_user_id),
      0
    )
  );

  for v_superseded in
    update public.line_registration_sessions
    set active = false,
        invalidated_at = v_now
    where provider = btrim(p_provider)
      and provider_account_id = btrim(p_provider_account_id)
      and provider_user_id = btrim(p_provider_user_id)
      and active
    returning *
  loop
    insert into public.customer_identity_verification_audit_logs (
      event_type,
      provider,
      provider_account_id,
      provider_user_id,
      registration_session_id,
      request_ip,
      user_agent,
      created_at
    ) values (
      'registration_superseded',
      v_superseded.provider,
      v_superseded.provider_account_id,
      v_superseded.provider_user_id,
      v_superseded.id,
      nullif(left(p_request_ip, 64), ''),
      nullif(left(p_user_agent, 500), ''),
      v_now
    );
  end loop;

  insert into public.line_registration_sessions (
    provider,
    provider_account_id,
    provider_user_id,
    token_hash,
    expires_at
  ) values (
    btrim(p_provider),
    btrim(p_provider_account_id),
    btrim(p_provider_user_id),
    p_token_hash,
    p_expires_at
  )
  returning id into v_session_id;

  insert into public.customer_identity_verification_audit_logs (
    event_type,
    provider,
    provider_account_id,
    provider_user_id,
    registration_session_id,
    request_ip,
    user_agent,
    created_at
  ) values (
    'registration_started',
    btrim(p_provider),
    btrim(p_provider_account_id),
    btrim(p_provider_user_id),
    v_session_id,
    nullif(left(p_request_ip, 64), ''),
    nullif(left(p_user_agent, 500), ''),
    v_now
  );

  update public.line_registration_sessions
  set active = false,
      invalidated_at = v_now
  where active
    and expires_at <= v_now;

  delete from public.line_registration_sessions
  where not active
    and coalesce(used_at, invalidated_at, expires_at) < v_now - interval '30 days';

  return v_session_id;
end;
$$;

create function public.register_line_customer_with_address(
  p_registration_session_id uuid,
  p_token_hash text,
  p_full_name text,
  p_phone text,
  p_line_id text,
  p_email text,
  p_legacy_address text,
  p_district text,
  p_sub_district text,
  p_province text,
  p_postal_code text,
  p_shipping_address text,
  p_accept_marketing boolean,
  p_ip_address text,
  p_user_agent text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session public.line_registration_sessions%rowtype;
  v_customer_id integer;
  v_identity_id uuid;
  v_now timestamp with time zone := now();
begin
  if p_registration_session_id is null
    or p_token_hash is null
    or p_token_hash !~ '^[0-9a-f]{64}$'
  then
    return jsonb_build_object('status', 'invalid');
  end if;

  select *
  into v_session
  from public.line_registration_sessions
  where id = p_registration_session_id
  for update;

  if not found or not v_session.active or v_session.used_at is not null then
    return jsonb_build_object('status', 'invalid');
  end if;

  if v_session.expires_at <= v_now then
    update public.line_registration_sessions
    set active = false,
        invalidated_at = v_now
    where id = v_session.id;

    insert into public.customer_identity_verification_audit_logs (
      event_type,
      provider,
      provider_account_id,
      provider_user_id,
      registration_session_id,
      request_ip,
      user_agent,
      created_at
    ) values (
      'expired',
      v_session.provider,
      v_session.provider_account_id,
      v_session.provider_user_id,
      v_session.id,
      nullif(left(p_ip_address, 64), ''),
      nullif(left(p_user_agent, 500), ''),
      v_now
    );

    return jsonb_build_object('status', 'expired');
  end if;

  if v_session.token_hash <> p_token_hash then
    return jsonb_build_object('status', 'invalid');
  end if;

  if exists (
    select 1
    from public.customer_identities
    where provider = v_session.provider
      and provider_account_id = v_session.provider_account_id
      and provider_user_id = v_session.provider_user_id
      and status = 'verified'
  ) then
    update public.line_registration_sessions
    set active = false,
        invalidated_at = v_now
    where id = v_session.id;

    return jsonb_build_object('status', 'already_linked');
  end if;

  v_customer_id := public.register_customer_with_address(
    p_full_name,
    p_phone,
    p_line_id,
    p_email,
    p_legacy_address,
    p_district,
    p_sub_district,
    p_province,
    p_postal_code,
    p_shipping_address,
    p_accept_marketing,
    p_ip_address,
    p_user_agent
  );

  insert into public.customer_identities (
    customer_id,
    provider,
    provider_account_id,
    provider_user_id,
    status,
    verified_at,
    verified_by
  ) values (
    v_customer_id,
    v_session.provider,
    v_session.provider_account_id,
    v_session.provider_user_id,
    'verified',
    v_now,
    'line-self-registration'
  )
  returning id into v_identity_id;

  update public.line_registration_sessions
  set active = false,
      used_at = v_now,
      customer_id = v_customer_id,
      customer_identity_id = v_identity_id
  where id = v_session.id;

  insert into public.customer_identity_verification_audit_logs (
    event_type,
    customer_id,
    provider,
    provider_account_id,
    provider_user_id,
    registration_session_id,
    requested_by,
    approved_by,
    request_ip,
    user_agent,
    created_at
  ) values (
    'registration_verified',
    v_customer_id,
    v_session.provider,
    v_session.provider_account_id,
    v_session.provider_user_id,
    v_session.id,
    'line-self-registration',
    'line-self-registration',
    nullif(left(p_ip_address, 64), ''),
    nullif(left(p_user_agent, 500), ''),
    v_now
  );

  return jsonb_build_object(
    'status', 'verified',
    'customer_id', v_customer_id,
    'customer_identity_id', v_identity_id,
    'provider_user_id', v_session.provider_user_id
  );
end;
$$;

comment on function public.create_line_registration_session(
  text, text, text, text, timestamp with time zone, text, text
) is 'Creates one active, short-lived LINE-bound registration session without storing its plaintext token.';

comment on function public.register_line_customer_with_address(
  uuid, text, text, text, text, text, text, text, text, text, text, text,
  boolean, text, text
) is 'Atomically consumes a LINE registration session and creates customer, default address, consent, and verified LINE identity records.';

revoke all on function public.create_line_registration_session(
  text, text, text, text, timestamp with time zone, text, text
) from public, anon, authenticated;
grant execute on function public.create_line_registration_session(
  text, text, text, text, timestamp with time zone, text, text
) to service_role;

revoke all on function public.register_line_customer_with_address(
  uuid, text, text, text, text, text, text, text, text, text, text, text,
  boolean, text, text
) from public, anon, authenticated;
grant execute on function public.register_line_customer_with_address(
  uuid, text, text, text, text, text, text, text, text, text, text, text,
  boolean, text, text
) to service_role;
