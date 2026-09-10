create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null,
  customer_id integer not null,
  source_customer_identity_id uuid,
  source_address_id uuid,
  order_source text not null default 'admin_manual',
  idempotency_key text not null,
  shipping_name text not null,
  shipping_phone text not null,
  shipping_address text not null,
  shipping_province text not null,
  shipping_postal_code text,
  status text not null default 'draft',
  subtotal numeric(12, 2) not null,
  total numeric(12, 2) not null,
  admin_note text,
  created_by text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint orders_order_number_key unique (order_number),
  constraint orders_idempotency_key_key unique (idempotency_key),
  constraint orders_customer_id_fkey
    foreign key (customer_id)
    references public.customers (id)
    on delete restrict,
  constraint orders_source_customer_identity_id_fkey
    foreign key (source_customer_identity_id)
    references public.customer_identities (id)
    on delete restrict,
  constraint orders_source_address_id_fkey
    foreign key (source_address_id)
    references public.customer_addresses (id)
    on delete set null,
  constraint orders_order_number_not_blank_check
    check (btrim(order_number) <> ''),
  constraint orders_order_source_check
    check (order_source in ('admin_manual', 'line')),
  constraint orders_idempotency_key_check
    check (btrim(idempotency_key) <> '' and char_length(idempotency_key) <= 100),
  constraint orders_shipping_name_not_blank_check
    check (btrim(shipping_name) <> ''),
  constraint orders_shipping_phone_not_blank_check
    check (btrim(shipping_phone) <> ''),
  constraint orders_shipping_address_not_blank_check
    check (btrim(shipping_address) <> ''),
  constraint orders_shipping_province_not_blank_check
    check (btrim(shipping_province) <> ''),
  constraint orders_shipping_postal_code_check
    check (shipping_postal_code is null or btrim(shipping_postal_code) <> ''),
  constraint orders_status_check
    check (status in ('draft', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  constraint orders_subtotal_check check (subtotal >= 0),
  constraint orders_total_check check (total >= 0),
  constraint orders_admin_note_length_check
    check (admin_note is null or char_length(admin_note) <= 1000),
  constraint orders_created_by_not_blank_check
    check (btrim(created_by) <> '')
);

comment on table public.orders is
  'Server-managed order records. Draft intake does not reserve or deduct stock.';

comment on column public.orders.idempotency_key is
  'Caller-generated retry key preventing duplicate draft orders.';

create index orders_customer_id_idx on public.orders (customer_id);
create index orders_status_created_at_idx on public.orders (status, created_at desc);
create index orders_source_customer_identity_id_idx
  on public.orders (source_customer_identity_id)
  where source_customer_identity_id is not null;

create trigger orders_set_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  product_flavor_id uuid not null,
  product_name text not null,
  flavor_name text not null,
  brand_name text not null,
  variant_key text not null,
  sku text not null,
  unit_price numeric(12, 2) not null,
  quantity integer not null,
  total_price numeric(12, 2) not null,
  created_at timestamp with time zone not null default now(),

  constraint order_items_order_id_fkey
    foreign key (order_id)
    references public.orders (id)
    on delete cascade,
  constraint order_items_product_flavor_id_fkey
    foreign key (product_flavor_id)
    references public.product_flavors (id)
    on delete restrict,
  constraint order_items_order_product_flavor_key
    unique (order_id, product_flavor_id),
  constraint order_items_product_name_not_blank_check
    check (btrim(product_name) <> ''),
  constraint order_items_flavor_name_not_blank_check
    check (btrim(flavor_name) <> ''),
  constraint order_items_brand_name_not_blank_check
    check (btrim(brand_name) <> ''),
  constraint order_items_variant_key_not_blank_check
    check (btrim(variant_key) <> ''),
  constraint order_items_sku_not_blank_check
    check (btrim(sku) <> ''),
  constraint order_items_unit_price_check check (unit_price >= 0),
  constraint order_items_quantity_check check (quantity > 0 and quantity <= 999),
  constraint order_items_total_price_check
    check (total_price >= 0 and total_price = round(unit_price * quantity, 2))
);

comment on table public.order_items is
  'Immutable-at-intake product snapshots. Product names, SKU, and price are copied from the database, never trusted from browser input.';

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_flavor_id_idx on public.order_items (product_flavor_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

revoke all on table public.orders from public, anon, authenticated, service_role;
revoke all on table public.order_items from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.orders to service_role;
grant select, insert, update, delete on table public.order_items to service_role;

create function public.create_draft_order(
  p_customer_id integer,
  p_address_id uuid,
  p_source_customer_identity_id uuid,
  p_order_source text,
  p_idempotency_key text,
  p_items jsonb,
  p_created_by text,
  p_admin_note text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_address public.customer_addresses%rowtype;
  v_subtotal numeric(12, 2);
  v_requested_count integer;
  v_catalog_count integer;
  v_existing record;
begin
  if p_order_source not in ('admin_manual', 'line')
    or p_idempotency_key is null
    or btrim(p_idempotency_key) = ''
    or char_length(p_idempotency_key) > 100
    or p_created_by is null
    or btrim(p_created_by) = ''
    or (p_admin_note is not null and char_length(p_admin_note) > 1000)
  then
    raise exception 'invalid order intake input' using errcode = '22023';
  end if;

  -- Serialize retries that use the same idempotency key so concurrent requests
  -- cannot race past the lookup and collide on the unique constraint.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(btrim(p_idempotency_key), 0)
  );

  select id, order_number
  into v_existing
  from public.orders
  where idempotency_key = btrim(p_idempotency_key);

  if found then
    return jsonb_build_object(
      'order_id', v_existing.id,
      'order_number', v_existing.order_number,
      'idempotent_replay', true
    );
  end if;

  perform 1
  from public.customers
  where id = p_customer_id
    and is_active is true
  for update;

  if not found then
    raise exception 'customer not found' using errcode = 'P0002';
  end if;

  select *
  into v_address
  from public.customer_addresses
  where id = p_address_id
    and customer_id = p_customer_id
  for share;

  if not found then
    raise exception 'address not found' using errcode = 'P0002';
  end if;

  if p_source_customer_identity_id is not null then
    perform 1
    from public.customer_identities
    where id = p_source_customer_identity_id
      and customer_id = p_customer_id
      and status = 'verified';

    if not found then
      raise exception 'verified identity not found' using errcode = 'P0002';
    end if;
  elsif p_order_source = 'line' then
    raise exception 'line order requires verified identity' using errcode = '22023';
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
        or (item ->> 'quantity') !~ '^[1-9][0-9]{0,2}$'
    )
  then
    raise exception 'invalid order items' using errcode = '22023';
  end if;

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
      and products.is_active is true
      and flavors.is_active is true
      and brands.is_active is true
      and requested_items.quantity <= 999
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

  v_order_id := gen_random_uuid();
  v_order_number := 'P4U-' || to_char(now() at time zone 'UTC', 'YYYYMMDD') || '-'
    || upper(left(replace(v_order_id::text, '-', ''), 12));

  insert into public.orders (
    id,
    order_number,
    customer_id,
    source_customer_identity_id,
    source_address_id,
    order_source,
    idempotency_key,
    shipping_name,
    shipping_phone,
    shipping_address,
    shipping_province,
    shipping_postal_code,
    status,
    subtotal,
    total,
    admin_note,
    created_by
  ) values (
    v_order_id,
    v_order_number,
    p_customer_id,
    p_source_customer_identity_id,
    p_address_id,
    p_order_source,
    btrim(p_idempotency_key),
    v_address.recipient_name,
    v_address.phone,
    v_address.address,
    v_address.province,
    v_address.postal_code,
    'draft',
    v_subtotal,
    v_subtotal,
    nullif(btrim(p_admin_note), ''),
    btrim(p_created_by)
  );

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
    v_order_id,
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

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'idempotent_replay', false
  );
end;
$$;

comment on function public.create_draft_order(
  integer, uuid, uuid, text, text, jsonb, text, text
) is 'Atomically creates a draft order and database-sourced item snapshots without reserving or deducting stock.';

revoke all on function public.create_draft_order(
  integer, uuid, uuid, text, text, jsonb, text, text
) from public, anon, authenticated;
grant execute on function public.create_draft_order(
  integer, uuid, uuid, text, text, jsonb, text, text
) to service_role;
