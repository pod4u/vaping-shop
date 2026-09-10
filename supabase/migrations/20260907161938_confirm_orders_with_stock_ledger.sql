create table public.stock_ledger (
  id uuid primary key default gen_random_uuid(),
  product_flavor_id uuid not null,
  order_id uuid,
  order_item_id uuid,
  reservation_id uuid unique,
  action text not null,
  quantity_delta integer not null,
  previous_quantity integer not null,
  new_quantity integer not null,
  created_by text not null,
  created_at timestamp with time zone not null default now(),
  constraint stock_ledger_product_flavor_id_fkey
    foreign key (product_flavor_id)
    references public.product_flavors (id)
    on delete restrict,
  constraint stock_ledger_order_id_fkey
    foreign key (order_id)
    references public.orders (id)
    on delete restrict,
  constraint stock_ledger_order_item_id_fkey
    foreign key (order_item_id)
    references public.order_items (id)
    on delete restrict,
  constraint stock_ledger_reservation_id_fkey
    foreign key (reservation_id)
    references public.stock_reservations (id)
    on delete restrict,
  constraint stock_ledger_action_check
    check (action in ('stock_import', 'reservation', 'sale', 'manual_adjustment', 'return')),
  constraint stock_ledger_quantity_delta_check
    check (quantity_delta <> 0),
  constraint stock_ledger_previous_quantity_check
    check (previous_quantity >= 0),
  constraint stock_ledger_new_quantity_check
    check (new_quantity >= 0),
  constraint stock_ledger_quantity_balance_check
    check (new_quantity = previous_quantity + quantity_delta),
  constraint stock_ledger_created_by_check
    check (btrim(created_by) <> ''),
  constraint stock_ledger_sale_reference_check
    check (
      action <> 'sale'
      or (
        order_id is not null
        and order_item_id is not null
        and reservation_id is not null
        and quantity_delta < 0
      )
    )
);

comment on table public.stock_ledger is
  'Append-only server ledger for every physical stock movement. Sale rows reference the order item and reservation that caused the deduction.';

create index stock_ledger_product_created_at_idx
  on public.stock_ledger (product_flavor_id, created_at desc);

create index stock_ledger_order_id_idx
  on public.stock_ledger (order_id)
  where order_id is not null;

create index stock_ledger_order_item_id_idx
  on public.stock_ledger (order_item_id)
  where order_item_id is not null;

alter table public.stock_ledger enable row level security;

revoke all on table public.stock_ledger
  from public, anon, authenticated, service_role;
grant select, insert on table public.stock_ledger to service_role;

create function public.confirm_pending_order(
  p_order_id uuid,
  p_confirmed_by text
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
  v_ledger_count integer;
begin
  if p_order_id is null
    or p_confirmed_by is null
    or btrim(p_confirmed_by) = ''
    or char_length(p_confirmed_by) > 200
  then
    raise exception 'invalid confirmation input' using errcode = '22023';
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

  if v_order_status = 'confirmed' then
    select count(*)::integer
    into v_ledger_count
    from public.stock_ledger
    where order_id = p_order_id
      and action = 'sale';

    select count(*)::integer
    into v_reservation_count
    from public.stock_reservations
    where order_id = p_order_id
      and status = 'confirmed';

    if v_item_count > 0
      and v_ledger_count = v_item_count
      and v_reservation_count = v_item_count
    then
      return jsonb_build_object(
        'order_id', p_order_id,
        'status', 'confirmed',
        'idempotent_replay', true,
        'reservation_expired', false
      );
    end if;

    raise exception 'confirmed order stock records are incomplete'
      using errcode = '55000';
  end if;

  if v_order_status <> 'pending' then
    raise exception 'only pending orders can be confirmed'
      using errcode = '55000';
  end if;

  select count(*)::integer
  into v_reservation_count
  from public.stock_reservations
  join public.order_items
    on order_items.id = stock_reservations.order_item_id
    and order_items.order_id = stock_reservations.order_id
    and order_items.product_flavor_id = stock_reservations.product_flavor_id
    and order_items.quantity = stock_reservations.quantity
  where stock_reservations.order_id = p_order_id
    and stock_reservations.status = 'reserved';

  if v_item_count < 1 or v_reservation_count <> v_item_count then
    raise exception 'order reservations are incomplete'
      using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.stock_reservations
    where order_id = p_order_id
      and status = 'reserved'
      and expires_at <= now()
  ) then
    delete from public.stock_reservations
    where order_id = p_order_id
      and status = 'reserved';

    update public.orders
    set status = 'draft'
    where id = p_order_id;

    return jsonb_build_object(
      'order_id', p_order_id,
      'status', 'draft',
      'idempotent_replay', false,
      'reservation_expired', true
    );
  end if;

  -- Lock all variants deterministically before checking and deducting stock.
  perform 1
  from public.product_flavors
  join public.stock_reservations
    on stock_reservations.product_flavor_id = product_flavors.id
  where stock_reservations.order_id = p_order_id
    and stock_reservations.status = 'reserved'
  order by product_flavors.id
  for update of product_flavors;

  with deductions as (
    select
      stock_reservations.id as reservation_id,
      stock_reservations.order_id,
      stock_reservations.order_item_id,
      stock_reservations.product_flavor_id,
      stock_reservations.quantity
    from public.stock_reservations
    where stock_reservations.order_id = p_order_id
      and stock_reservations.status = 'reserved'
      and stock_reservations.expires_at > now()
  ), updated_stock as (
    update public.product_flavors
    set
      stock_quantity = product_flavors.stock_quantity - deductions.quantity,
      is_available = (product_flavors.stock_quantity - deductions.quantity) > 0,
      updated_at = now()
    from deductions
    where product_flavors.id = deductions.product_flavor_id
      and product_flavors.stock_quantity >= deductions.quantity
    returning
      deductions.reservation_id,
      deductions.order_id,
      deductions.order_item_id,
      deductions.product_flavor_id,
      deductions.quantity,
      product_flavors.stock_quantity + deductions.quantity as previous_quantity,
      product_flavors.stock_quantity as new_quantity
  )
  insert into public.stock_ledger (
    product_flavor_id,
    order_id,
    order_item_id,
    reservation_id,
    action,
    quantity_delta,
    previous_quantity,
    new_quantity,
    created_by
  )
  select
    updated_stock.product_flavor_id,
    updated_stock.order_id,
    updated_stock.order_item_id,
    updated_stock.reservation_id,
    'sale',
    -updated_stock.quantity,
    updated_stock.previous_quantity,
    updated_stock.new_quantity,
    btrim(p_confirmed_by)
  from updated_stock;

  get diagnostics v_ledger_count = row_count;

  if v_ledger_count <> v_item_count then
    raise exception 'insufficient physical stock during confirmation'
      using errcode = 'P0001';
  end if;

  update public.stock_reservations
  set status = 'confirmed'
  where order_id = p_order_id
    and status = 'reserved';

  update public.orders
  set status = 'confirmed'
  where id = p_order_id;

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', 'confirmed',
    'idempotent_replay', false,
    'reservation_expired', false
  );
end;
$$;

comment on function public.confirm_pending_order(uuid, text) is
  'Atomically confirms a pending order, deducts physical stock, confirms reservations, and appends one sale ledger row per order item.';

revoke all on function public.confirm_pending_order(uuid, text)
  from public, anon, authenticated;
grant execute on function public.confirm_pending_order(uuid, text)
  to service_role;
