create function public.update_member_profile(
  p_customer_id integer,
  p_address_id uuid,
  p_full_name text,
  p_phone text,
  p_recipient_name text,
  p_address text,
  p_province text,
  p_postal_code text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_address_id uuid;
begin
  if p_customer_id is null or p_customer_id <= 0
    or p_full_name is null or char_length(btrim(p_full_name)) not between 2 and 120
    or p_phone is null or btrim(p_phone) !~ '^0[0-9]{9}$'
    or p_recipient_name is null or char_length(btrim(p_recipient_name)) not between 2 and 120
    or p_address is null or char_length(btrim(p_address)) not between 1 and 700
    or p_province is null or char_length(btrim(p_province)) not between 1 and 50
    or (p_postal_code is not null and btrim(p_postal_code) !~ '^[0-9]{5}$')
  then
    raise exception 'invalid member profile input' using errcode = '22023';
  end if;

  perform 1
  from public.customers
  where id = p_customer_id
    and is_active is true
  for update;

  if not found then
    raise exception 'active customer not found' using errcode = 'P0002';
  end if;

  update public.customers
  set full_name = btrim(p_full_name),
      phone = btrim(p_phone),
      address = btrim(p_address),
      province = btrim(p_province),
      postal_code = nullif(btrim(p_postal_code), '')
  where id = p_customer_id;

  if p_address_id is not null then
    select id into v_address_id
    from public.customer_addresses
    where id = p_address_id
      and customer_id = p_customer_id
    for update;

    if not found then
      raise exception 'address not found for customer' using errcode = 'P0002';
    end if;
  else
    select id into v_address_id
    from public.customer_addresses
    where customer_id = p_customer_id
    order by is_default desc, created_at desc
    limit 1
    for update;
  end if;

  update public.customer_addresses
  set is_default = false
  where customer_id = p_customer_id
    and is_default
    and (v_address_id is null or id <> v_address_id);

  if v_address_id is null then
    insert into public.customer_addresses (
      customer_id,
      recipient_name,
      phone,
      address,
      province,
      postal_code,
      is_default
    ) values (
      p_customer_id,
      btrim(p_recipient_name),
      btrim(p_phone),
      btrim(p_address),
      btrim(p_province),
      nullif(btrim(p_postal_code), ''),
      true
    ) returning id into v_address_id;
  else
    update public.customer_addresses
    set recipient_name = btrim(p_recipient_name),
        phone = btrim(p_phone),
        address = btrim(p_address),
        province = btrim(p_province),
        postal_code = nullif(btrim(p_postal_code), ''),
        is_default = true
    where id = v_address_id;
  end if;

  return jsonb_build_object(
    'customer_id', p_customer_id,
    'address_id', v_address_id,
    'updated', true
  );
end;
$$;

comment on function public.update_member_profile(integer, uuid, text, text, text, text, text, text) is
  'Atomically updates a verified member profile and their default shipping address. The caller supplies the server-verified customer id.';

revoke all on function public.update_member_profile(integer, uuid, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.update_member_profile(integer, uuid, text, text, text, text, text, text)
  to service_role;
