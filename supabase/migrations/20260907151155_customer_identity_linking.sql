create table public.customer_identity_link_tokens (
  id uuid primary key default gen_random_uuid(),
  customer_id integer not null,
  provider text not null,
  provider_account_id text not null,
  provider_user_id text not null,
  token_hash text not null,
  expires_at timestamp with time zone not null,
  used_at timestamp with time zone,
  failed_attempts integer not null default 0,
  locked_until timestamp with time zone,
  invalidated_at timestamp with time zone,
  active boolean not null default true,
  created_by text not null,
  created_at timestamp with time zone not null default now(),

  constraint customer_identity_link_tokens_customer_id_fkey
    foreign key (customer_id)
    references public.customers (id)
    on delete cascade,
  constraint customer_identity_link_tokens_provider_not_blank_check
    check (btrim(provider) <> ''),
  constraint customer_identity_link_tokens_provider_account_id_not_blank_check
    check (btrim(provider_account_id) <> ''),
  constraint customer_identity_link_tokens_provider_user_id_not_blank_check
    check (btrim(provider_user_id) <> ''),
  constraint customer_identity_link_tokens_token_hash_check
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint customer_identity_link_tokens_created_by_not_blank_check
    check (btrim(created_by) <> ''),
  constraint customer_identity_link_tokens_expiry_check
    check (expires_at > created_at and expires_at <= created_at + interval '10 minutes'),
  constraint customer_identity_link_tokens_failed_attempts_check
    check (failed_attempts between 0 and 5),
  constraint customer_identity_link_tokens_lock_check
    check (locked_until is null or locked_until > created_at),
  constraint customer_identity_link_tokens_lifecycle_check
    check (
      (active and used_at is null and invalidated_at is null)
      or
      (not active and num_nonnulls(used_at, invalidated_at) = 1)
    )
);

comment on table public.customer_identity_link_tokens is
  'Server-only, short-lived HMAC hashes for linking an internal customer to a provider identity.';

comment on column public.customer_identity_link_tokens.token_hash is
  'Keyed HMAC digest only. Plaintext verification codes must never be persisted or logged.';

create unique index customer_identity_link_tokens_one_active_identity_idx
  on public.customer_identity_link_tokens (provider, provider_account_id, provider_user_id)
  where active;

create index customer_identity_link_tokens_customer_id_idx
  on public.customer_identity_link_tokens (customer_id);

create index customer_identity_link_tokens_identity_created_at_idx
  on public.customer_identity_link_tokens (
    provider,
    provider_account_id,
    provider_user_id,
    created_at desc
  );

create index customer_identity_link_tokens_expires_at_idx
  on public.customer_identity_link_tokens (expires_at);

create table public.customer_identity_verification_audit_logs (
  id bigint generated always as identity primary key,
  event_type text not null,
  customer_id integer,
  provider text not null,
  provider_account_id text not null,
  provider_user_id text not null,
  token_record_id uuid,
  requested_by text,
  approved_by text,
  failed_attempts integer not null default 0,
  request_ip text,
  user_agent text,
  created_at timestamp with time zone not null default now(),

  constraint customer_identity_verification_audit_logs_customer_id_fkey
    foreign key (customer_id)
    references public.customers (id)
    on delete set null,
  constraint customer_identity_verification_audit_logs_event_type_check
    check (event_type in (
      'created',
      'superseded',
      'failed',
      'locked',
      'expired',
      'verified',
      'identity_conflict'
    )),
  constraint customer_identity_verification_audit_logs_provider_not_blank_check
    check (btrim(provider) <> ''),
  constraint customer_identity_verification_audit_logs_provider_account_id_not_blank_check
    check (btrim(provider_account_id) <> ''),
  constraint customer_identity_verification_audit_logs_provider_user_id_not_blank_check
    check (btrim(provider_user_id) <> ''),
  constraint customer_identity_verification_audit_logs_failed_attempts_check
    check (failed_attempts between 0 and 5),
  constraint customer_identity_verification_audit_logs_request_ip_length_check
    check (request_ip is null or char_length(request_ip) <= 64),
  constraint customer_identity_verification_audit_logs_user_agent_length_check
    check (user_agent is null or char_length(user_agent) <= 500)
);

comment on table public.customer_identity_verification_audit_logs is
  'Restricted audit trail for customer identity linking. Never store plaintext codes, addresses, or LINE message bodies.';

create index customer_identity_verification_audit_customer_created_at_idx
  on public.customer_identity_verification_audit_logs (customer_id, created_at desc);

create index customer_identity_verification_audit_token_record_id_idx
  on public.customer_identity_verification_audit_logs (token_record_id);

alter table public.customer_identity_link_tokens enable row level security;
alter table public.customer_identity_verification_audit_logs enable row level security;

revoke all on table public.customer_identity_link_tokens from public, anon, authenticated, service_role;
revoke all on table public.customer_identity_verification_audit_logs from public, anon, authenticated, service_role;
revoke all on sequence public.customer_identity_verification_audit_logs_id_seq from public, anon, authenticated, service_role;

grant select, insert, update, delete on table public.customer_identity_link_tokens to service_role;
grant select, insert on table public.customer_identity_verification_audit_logs to service_role;
grant usage, select on sequence public.customer_identity_verification_audit_logs_id_seq to service_role;

create function public.create_customer_identity_link_token(
  p_customer_id integer,
  p_provider text,
  p_provider_account_id text,
  p_provider_user_id text,
  p_token_hash text,
  p_expires_at timestamp with time zone,
  p_created_by text,
  p_request_ip text,
  p_user_agent text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_token_id uuid;
  v_now timestamp with time zone := now();
  v_superseded record;
begin
  if p_provider is null or btrim(p_provider) = ''
    or p_provider_account_id is null or btrim(p_provider_account_id) = ''
    or p_provider_user_id is null or btrim(p_provider_user_id) = ''
    or p_created_by is null or btrim(p_created_by) = ''
    or p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$'
  then
    raise exception 'invalid identity linking input' using errcode = '22023';
  end if;

  if p_expires_at <= v_now or p_expires_at > v_now + interval '10 minutes' then
    raise exception 'invalid identity linking expiry' using errcode = '22023';
  end if;

  perform 1
  from public.customers
  where id = p_customer_id
    and is_active is true
    and nullif(btrim(phone), '') is not null
  for update;

  if not found then
    raise exception 'customer cannot be linked' using errcode = 'P0002';
  end if;

  for v_superseded in
    update public.customer_identity_link_tokens
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
      customer_id,
      provider,
      provider_account_id,
      provider_user_id,
      token_record_id,
      requested_by,
      failed_attempts,
      created_at
    )
    values (
      'superseded',
      v_superseded.customer_id,
      v_superseded.provider,
      v_superseded.provider_account_id,
      v_superseded.provider_user_id,
      v_superseded.id,
      p_created_by,
      v_superseded.failed_attempts,
      v_now
    );
  end loop;

  insert into public.customer_identity_link_tokens (
    customer_id,
    provider,
    provider_account_id,
    provider_user_id,
    token_hash,
    expires_at,
    created_by
  )
  values (
    p_customer_id,
    btrim(p_provider),
    btrim(p_provider_account_id),
    btrim(p_provider_user_id),
    p_token_hash,
    p_expires_at,
    btrim(p_created_by)
  )
  returning id into v_token_id;

  insert into public.customer_identity_verification_audit_logs (
    event_type,
    customer_id,
    provider,
    provider_account_id,
    provider_user_id,
    token_record_id,
    requested_by,
    request_ip,
    user_agent,
    created_at
  )
  values (
    'created',
    p_customer_id,
    btrim(p_provider),
    btrim(p_provider_account_id),
    btrim(p_provider_user_id),
    v_token_id,
    btrim(p_created_by),
    nullif(left(p_request_ip, 64), ''),
    nullif(left(p_user_agent, 500), ''),
    v_now
  );

  delete from public.customer_identity_link_tokens
  where not active
    and coalesce(used_at, invalidated_at, expires_at) < v_now - interval '30 days';

  return v_token_id;
end;
$$;

create function public.record_customer_identity_link_failure(
  p_token_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_token public.customer_identity_link_tokens%rowtype;
  v_now timestamp with time zone := now();
  v_attempts integer;
  v_event_type text;
begin
  select *
  into v_token
  from public.customer_identity_link_tokens
  where id = p_token_id
  for update;

  if not found or not v_token.active or v_token.used_at is not null then
    return jsonb_build_object('status', 'invalid');
  end if;

  if v_token.expires_at <= v_now then
    update public.customer_identity_link_tokens
    set active = false,
        invalidated_at = v_now
    where id = v_token.id;
    v_event_type := 'expired';
    v_attempts := v_token.failed_attempts;
  elsif v_token.locked_until is not null and v_token.locked_until > v_now then
    v_event_type := 'locked';
    v_attempts := v_token.failed_attempts;
  else
    v_attempts := case
      when v_token.locked_until is not null and v_token.locked_until <= v_now then 1
      else least(v_token.failed_attempts + 1, 5)
    end;
    v_event_type := case when v_attempts >= 5 then 'locked' else 'failed' end;

    update public.customer_identity_link_tokens
    set failed_attempts = v_attempts,
        locked_until = case
          when v_attempts >= 5 then v_now + interval '15 minutes'
          else null
        end
    where id = v_token.id;
  end if;

  insert into public.customer_identity_verification_audit_logs (
    event_type,
    customer_id,
    provider,
    provider_account_id,
    provider_user_id,
    token_record_id,
    requested_by,
    failed_attempts,
    created_at
  )
  values (
    v_event_type,
    v_token.customer_id,
    v_token.provider,
    v_token.provider_account_id,
    v_token.provider_user_id,
    v_token.id,
    v_token.created_by,
    v_attempts,
    v_now
  );

  return jsonb_build_object(
    'status', case when v_event_type = 'locked' then 'locked' else 'invalid' end,
    'failed_attempts', v_attempts
  );
end;
$$;

create function public.consume_customer_identity_link_token(
  p_token_id uuid,
  p_token_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_token public.customer_identity_link_tokens%rowtype;
  v_identity_id uuid;
  v_existing_customer_id integer;
  v_now timestamp with time zone := now();
begin
  select *
  into v_token
  from public.customer_identity_link_tokens
  where id = p_token_id
  for update;

  if not found or not v_token.active or v_token.used_at is not null then
    return jsonb_build_object('status', 'invalid');
  end if;

  if v_token.expires_at <= v_now then
    update public.customer_identity_link_tokens
    set active = false,
        invalidated_at = v_now
    where id = v_token.id;

    insert into public.customer_identity_verification_audit_logs (
      event_type, customer_id, provider, provider_account_id, provider_user_id,
      token_record_id, requested_by, failed_attempts, created_at
    ) values (
      'expired', v_token.customer_id, v_token.provider, v_token.provider_account_id,
      v_token.provider_user_id, v_token.id, v_token.created_by,
      v_token.failed_attempts, v_now
    );

    return jsonb_build_object('status', 'invalid');
  end if;

  if v_token.locked_until is not null and v_token.locked_until > v_now then
    return jsonb_build_object('status', 'locked');
  end if;

  if p_token_hash is null or v_token.token_hash <> p_token_hash then
    return jsonb_build_object('status', 'invalid');
  end if;

  select id, customer_id
  into v_identity_id, v_existing_customer_id
  from public.customer_identities
  where provider = v_token.provider
    and provider_account_id = v_token.provider_account_id
    and provider_user_id = v_token.provider_user_id
  for update;

  if found and v_existing_customer_id <> v_token.customer_id then
    update public.customer_identity_link_tokens
    set active = false,
        invalidated_at = v_now
    where id = v_token.id;

    insert into public.customer_identity_verification_audit_logs (
      event_type, customer_id, provider, provider_account_id, provider_user_id,
      token_record_id, requested_by, failed_attempts, created_at
    ) values (
      'identity_conflict', v_token.customer_id, v_token.provider,
      v_token.provider_account_id, v_token.provider_user_id, v_token.id,
      v_token.created_by, v_token.failed_attempts, v_now
    );

    return jsonb_build_object('status', 'invalid');
  end if;

  if v_identity_id is null then
    insert into public.customer_identities (
      customer_id,
      provider,
      provider_account_id,
      provider_user_id,
      status,
      verified_at,
      verified_by
    )
    values (
      v_token.customer_id,
      v_token.provider,
      v_token.provider_account_id,
      v_token.provider_user_id,
      'verified',
      v_now,
      v_token.created_by
    )
    returning id into v_identity_id;
  else
    update public.customer_identities
    set status = 'verified',
        verified_at = v_now,
        verified_by = v_token.created_by,
        revoked_at = null
    where id = v_identity_id;
  end if;

  update public.customer_identity_link_tokens
  set active = false,
      used_at = v_now,
      locked_until = null
  where id = v_token.id;

  insert into public.customer_identity_verification_audit_logs (
    event_type,
    customer_id,
    provider,
    provider_account_id,
    provider_user_id,
    token_record_id,
    requested_by,
    approved_by,
    failed_attempts,
    created_at
  )
  values (
    'verified',
    v_token.customer_id,
    v_token.provider,
    v_token.provider_account_id,
    v_token.provider_user_id,
    v_token.id,
    v_token.created_by,
    v_token.created_by,
    v_token.failed_attempts,
    v_now
  );

  return jsonb_build_object(
    'status', 'verified',
    'customer_id', v_token.customer_id,
    'customer_identity_id', v_identity_id
  );
end;
$$;

comment on function public.create_customer_identity_link_token(
  integer, text, text, text, text, timestamp with time zone, text, text, text
) is 'Atomically supersedes an active linking token and stores a new HMAC digest.';

comment on function public.record_customer_identity_link_failure(uuid) is
  'Atomically records a failed linking attempt and applies a 15-minute lock after five failures.';

comment on function public.consume_customer_identity_link_token(uuid, text) is
  'Atomically consumes a valid token and creates or verifies the bound customer identity.';

revoke all on function public.create_customer_identity_link_token(
  integer, text, text, text, text, timestamp with time zone, text, text, text
) from public, anon, authenticated;
revoke all on function public.record_customer_identity_link_failure(uuid)
  from public, anon, authenticated;
revoke all on function public.consume_customer_identity_link_token(uuid, text)
  from public, anon, authenticated;

grant execute on function public.create_customer_identity_link_token(
  integer, text, text, text, text, timestamp with time zone, text, text, text
) to service_role;
grant execute on function public.record_customer_identity_link_failure(uuid)
  to service_role;
grant execute on function public.consume_customer_identity_link_token(uuid, text)
  to service_role;
