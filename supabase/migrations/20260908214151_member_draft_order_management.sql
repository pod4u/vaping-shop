create function public.update_member_draft_order(
  p_order_id uuid,
  p_customer_id integer,
  p_items jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_requested_count integer;
  v_catalog_count integer;
  v_subtotal numeric(12, 2);
begin
  if p_order_id is null or p_customer_id is null then
    raise exception 'invalid order input' using errcode = '22023';
  end if;

  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found or v_order.customer_id <> p_customer_id then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  if v_order.status <> 'draft' then
    raise exception 'only draft orders can be edited' using errcode = 'P0001';
  end if;

  if p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) < 1
    or jsonb_array_length(p_items) > 100
    or exists (
      select 1
      from jsonb_array_elements(p_items) as item
      where jsonb_typeof(item) <> 'object'
        or jsonb_typeof(item -> 'product_flavor_id') <> 'string'
        or (item ->> 'product_flavor_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        or jsonb_typeof(item -> 'quantity') <> 'number'
        or (item ->> 'quantity') !~ '^[1-9][0-9]{0,1}$'
    )
  then
    raise exception 'invalid order items' using errcode = '22023';
  end if;

  -- Lock requested catalog rows in a stable order before replacing snapshots.
  perform 1
  from public.product_flavors
  where id in (
    select (item ->> 'product_flavor_id')::uuid
    from jsonb_array_elements(p_items) as item
  )
  order by id
  for share;

  with requested_items as (
    select
      (item ->> 'product_flavor_id')::uuid as product_flavor_id,
      sum((item ->> 'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) as item
    group by (item ->> 'product_flavor_id')::uuid
  ), catalog_items as (
    select
      requested_items.product_flavor_id,
      requested_items.quantity,
      coalesce(product_flavors.sale_price, product_flavors.price)::numeric(12, 2) as unit_price
    from requested_items
    join public.product_flavors on product_flavors.id = requested_items.product_flavor_id
    join public.products on products.id = product_flavors.product_id
    join public.flavors on flavors.id = product_flavors.flavor_id
    join public.brands on brands.id = products.brand_id
    where product_flavors.is_active is true
      and product_flavors.is_available is true
      and products.is_active is true
      and flavors.is_active is true
      and brands.is_active is true
      and requested_items.quantity <= 99
  )
  select
    (select count(*) from requested_items),
    count(*),
    coalesce(sum(round(unit_price * quantity, 2)), 0)::numeric(12, 2)
  into v_requested_count, v_catalog_count, v_subtotal
  from catalog_items;

  if v_catalog_count <> v_requested_count then
    raise exception 'one or more products are unavailable' using errcode = 'P0002';
  end if;

  delete from public.order_items where order_id = p_order_id;

  with requested_items as (
    select
      (item ->> 'product_flavor_id')::uuid as product_flavor_id,
      sum((item ->> 'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) as item
    group by (item ->> 'product_flavor_id')::uuid
  )
  insert into public.order_items (
    order_id,
    product_flavor_id,
    product_name,
    flavor_name,
    brand_name,
    variant_key,
    sku,
    unit_price,
    quantity,
    total_price
  )
  select
    p_order_id,
    product_flavors.id,
    coalesce(nullif(btrim(products.name_th), ''), products.name),
    coalesce(nullif(btrim(flavors.name_th), ''), flavors.name),
    coalesce(nullif(btrim(brands.name_th), ''), brands.name),
    product_flavors.variant_key,
    product_flavors.sku,
    coalesce(product_flavors.sale_price, product_flavors.price)::numeric(12, 2),
    requested_items.quantity,
    round(coalesce(product_flavors.sale_price, product_flavors.price) * requested_items.quantity, 2)
  from requested_items
  join public.product_flavors on product_flavors.id = requested_items.product_flavor_id
  join public.products on products.id = product_flavors.product_id
  join public.flavors on flavors.id = product_flavors.flavor_id
  join public.brands on brands.id = products.brand_id;

  update public.orders
  set subtotal = v_subtotal,
      total = v_subtotal
  where id = p_order_id;

  return jsonb_build_object(
    'order_id', p_order_id,
    'order_number', v_order.order_number,
    'status', 'draft',
    'total', v_subtotal
  );
end;
$$;

comment on function public.update_member_draft_order(uuid, integer, jsonb) is
  'Atomically replaces database-sourced item snapshots for a customer-owned draft order.';

revoke all on function public.update_member_draft_order(uuid, integer, jsonb)
  from public, anon, authenticated;
grant execute on function public.update_member_draft_order(uuid, integer, jsonb)
  to service_role;
