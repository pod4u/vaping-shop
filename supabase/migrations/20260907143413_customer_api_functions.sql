create function public.register_customer_with_address(
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
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_customer_id integer;
begin
  insert into public.customers (
    full_name,
    phone,
    line_id,
    email,
    address,
    district,
    sub_district,
    province,
    postal_code
  )
  values (
    p_full_name,
    p_phone,
    p_line_id,
    p_email,
    p_legacy_address,
    p_district,
    p_sub_district,
    p_province,
    p_postal_code
  )
  returning id into v_customer_id;

  insert into public.customer_addresses (
    customer_id,
    recipient_name,
    phone,
    address,
    province,
    postal_code,
    is_default
  )
  values (
    v_customer_id,
    p_full_name,
    p_phone,
    p_shipping_address,
    p_province,
    p_postal_code,
    true
  );

  insert into public.consent_logs (
    customer_id,
    consent_type,
    accepted,
    ip_address,
    user_agent
  )
  values (
    v_customer_id,
    'terms',
    true,
    p_ip_address,
    p_user_agent
  );

  if p_accept_marketing then
    insert into public.consent_logs (
      customer_id,
      consent_type,
      accepted,
      ip_address,
      user_agent
    )
    values (
      v_customer_id,
      'marketing',
      true,
      p_ip_address,
      p_user_agent
    );
  end if;

  return v_customer_id;
end;
$$;

comment on function public.register_customer_with_address(
  text, text, text, text, text, text, text, text, text, text, boolean, text, text
) is 'Atomically registers a customer, their default shipping address, and consent records.';

create function public.save_customer_address(
  p_customer_id integer,
  p_address_id uuid,
  p_recipient_name text,
  p_phone text,
  p_address text,
  p_province text,
  p_postal_code text,
  p_is_default boolean
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_address_id uuid;
  v_is_default boolean;
begin
  perform 1
  from public.customers
  where id = p_customer_id;

  if not found then
    raise exception 'customer not found' using errcode = 'P0002';
  end if;

  if p_address_id is null then
    v_is_default := coalesce(
      p_is_default,
      not exists (
        select 1
        from public.customer_addresses
        where customer_id = p_customer_id
      )
    );
  else
    select is_default
    into v_is_default
    from public.customer_addresses
    where id = p_address_id
      and customer_id = p_customer_id
    for update;

    if not found then
      raise exception 'address not found' using errcode = 'P0002';
    end if;

    v_is_default := coalesce(p_is_default, v_is_default);
  end if;

  if v_is_default then
    update public.customer_addresses
    set is_default = false
    where customer_id = p_customer_id
      and is_default
      and (p_address_id is null or id <> p_address_id);
  end if;

  if p_address_id is null then
    insert into public.customer_addresses (
      customer_id,
      recipient_name,
      phone,
      address,
      province,
      postal_code,
      is_default
    )
    values (
      p_customer_id,
      p_recipient_name,
      p_phone,
      p_address,
      p_province,
      p_postal_code,
      v_is_default
    )
    returning id into v_address_id;
  else
    update public.customer_addresses
    set recipient_name = p_recipient_name,
        phone = p_phone,
        address = p_address,
        province = p_province,
        postal_code = p_postal_code,
        is_default = v_is_default
    where id = p_address_id
      and customer_id = p_customer_id
    returning id into v_address_id;
  end if;

  return v_address_id;
end;
$$;

comment on function public.save_customer_address(
  integer, uuid, text, text, text, text, text, boolean
) is 'Creates or replaces a customer address while switching the default address atomically.';

create function public.delete_customer_address(
  p_customer_id integer,
  p_address_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_was_default boolean;
begin
  select is_default
  into v_was_default
  from public.customer_addresses
  where id = p_address_id
    and customer_id = p_customer_id
  for update;

  if not found then
    return false;
  end if;

  delete from public.customer_addresses
  where id = p_address_id
    and customer_id = p_customer_id;

  if v_was_default then
    update public.customer_addresses
    set is_default = true
    where id = (
      select id
      from public.customer_addresses
      where customer_id = p_customer_id
      order by created_at desc, id desc
      limit 1
    );
  end if;

  return true;
end;
$$;

comment on function public.delete_customer_address(integer, uuid) is
  'Deletes a customer address and promotes the newest remaining address when the default is removed.';

revoke all on function public.register_customer_with_address(
  text, text, text, text, text, text, text, text, text, text, boolean, text, text
) from public, anon, authenticated;
grant execute on function public.register_customer_with_address(
  text, text, text, text, text, text, text, text, text, text, boolean, text, text
) to service_role;

revoke all on function public.save_customer_address(
  integer, uuid, text, text, text, text, text, boolean
) from public, anon, authenticated;
grant execute on function public.save_customer_address(
  integer, uuid, text, text, text, text, text, boolean
) to service_role;

revoke all on function public.delete_customer_address(integer, uuid)
  from public, anon, authenticated;
grant execute on function public.delete_customer_address(integer, uuid)
  to service_role;

revoke all on table public.customers, public.consent_logs
  from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.customers, public.consent_logs
  to service_role;
