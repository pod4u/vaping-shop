alter table public.order_items
  add constraint order_items_id_order_id_key unique (id, order_id);

create table public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  order_item_id uuid not null,
  product_flavor_id uuid not null,
  quantity integer not null,
  status text not null default 'reserved',
  expires_at timestamp with time zone not null default (now() + interval '30 minutes'),
  reserved_by text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint stock_reservations_order_item_fkey
    foreign key (order_item_id, order_id)
    references public.order_items (id, order_id)
    on delete cascade,
  constraint stock_reservations_product_flavor_id_fkey
    foreign key (product_flavor_id)
    references public.product_flavors (id)
    on delete restrict,
  constraint stock_reservations_quantity_check
    check (quantity > 0 and quantity <= 999),
  constraint stock_reservations_status_check
    check (status in ('reserved', 'confirmed', 'released', 'expired')),
  constraint stock_reservations_expires_at_check
    check (expires_at > created_at),
  constraint stock_reservations_reserved_by_check
    check (btrim(reserved_by) <> ''),
  constraint stock_reservations_order_item_key unique (order_item_id),
  constraint stock_reservations_order_product_key
    unique (order_id, product_flavor_id)
);

comment on table public.stock_reservations is
  'Server-managed temporary stock holds. Reserved rows reduce availability but do not mutate product_flavors.stock_quantity.';

create index stock_reservations_product_status_idx
  on public.stock_reservations (product_flavor_id, status);

create index stock_reservations_active_expires_at_idx
  on public.stock_reservations (expires_at)
  where status = 'reserved';

create trigger stock_reservations_set_updated_at
before update on public.stock_reservations
for each row execute function public.set_updated_at();

alter table public.stock_reservations enable row level security;

revoke all on table public.stock_reservations
  from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.stock_reservations
  to service_role;

create function public.reserve_draft_order(
  p_order_id uuid,
  p_reserved_by text,
  p_ttl_minutes integer default 30
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order_status text;
  v_item_count integer;
  v_reservation_count integer;
  v_expires_at timestamp with time zone;
begin
  if p_order_id is null
    or p_reserved_by is null
    or btrim(p_reserved_by) = ''
    or char_length(p_reserved_by) > 200
    or p_ttl_minutes is null
    or p_ttl_minutes < 5
    or p_ttl_minutes > 120
  then
    raise exception 'invalid reservation input' using errcode = '22023';
  end if;

  select orders.status
  into v_order_status
  from public.orders
  where orders.id = p_order_id
  for update;

  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  select count(*)::integer
  into v_item_count
  from public.order_items
  where order_id = p_order_id;

  if v_item_count < 1 then
    raise exception 'order has no items' using errcode = '55000';
  end if;

  if v_order_status = 'pending' then
    select count(*)::integer, min(expires_at)
    into v_reservation_count, v_expires_at
    from public.stock_reservations
    where order_id = p_order_id
      and status = 'reserved'
      and expires_at > now();

    if v_reservation_count = v_item_count then
      return jsonb_build_object(
        'order_id', p_order_id,
        'status', 'pending',
        'reservation_expires_at', v_expires_at,
        'idempotent_replay', true
      );
    end if;

    raise exception 'order reservation is missing or expired' using errcode = '55000';
  end if;

  if v_order_status <> 'draft' then
    raise exception 'only draft orders can be reserved' using errcode = '55000';
  end if;

  -- Lock every requested catalog row in a deterministic order. Concurrent
  -- reservations for the same variants therefore serialize before checking
  -- availability and cannot oversell the same stock.
  perform 1
  from public.product_flavors
  join public.order_items
    on order_items.product_flavor_id = product_flavors.id
  where order_items.order_id = p_order_id
  order by product_flavors.id
  for update of product_flavors;

  if exists (
    select 1
    from public.order_items
    join public.product_flavors
      on product_flavors.id = order_items.product_flavor_id
    left join lateral (
      select coalesce(sum(stock_reservations.quantity), 0)::integer as reserved_quantity
      from public.stock_reservations
      where stock_reservations.product_flavor_id = product_flavors.id
        and stock_reservations.status = 'reserved'
        and stock_reservations.expires_at > now()
    ) active_reservations on true
    where order_items.order_id = p_order_id
      and (
        product_flavors.is_active is not true
        or product_flavors.is_available is not true
        or product_flavors.stock_quantity - active_reservations.reserved_quantity
          < order_items.quantity
      )
  ) then
    raise exception 'insufficient stock for one or more order items'
      using errcode = 'P0001';
  end if;

  v_expires_at := now() + pg_catalog.make_interval(mins => p_ttl_minutes);

  insert into public.stock_reservations (
    order_id,
    order_item_id,
    product_flavor_id,
    quantity,
    status,
    expires_at,
    reserved_by
  )
  select
    order_items.order_id,
    order_items.id,
    order_items.product_flavor_id,
    order_items.quantity,
    'reserved',
    v_expires_at,
    btrim(p_reserved_by)
  from public.order_items
  where order_items.order_id = p_order_id;

  update public.orders
  set status = 'pending'
  where id = p_order_id;

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', 'pending',
    'reservation_expires_at', v_expires_at,
    'idempotent_replay', false
  );
end;
$$;

comment on function public.reserve_draft_order(uuid, text, integer) is
  'Atomically moves a draft order to pending and creates temporary stock holds without decrementing physical stock.';

revoke all on function public.reserve_draft_order(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.reserve_draft_order(uuid, text, integer)
  to service_role;
