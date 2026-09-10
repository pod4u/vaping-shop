alter table public.orders
  add column carrier text,
  add column tracking_number text,
  add column shipped_at timestamp with time zone,
  add column shipped_by text,
  add column delivered_at timestamp with time zone,
  add column delivered_by text,
  add column cancelled_at timestamp with time zone,
  add column cancelled_by text;

alter table public.orders
  add constraint orders_carrier_check
    check (carrier is null or (btrim(carrier) <> '' and char_length(carrier) <= 100)),
  add constraint orders_tracking_number_check
    check (tracking_number is null or (btrim(tracking_number) <> '' and char_length(tracking_number) <= 200)),
  add constraint orders_shipped_by_check
    check (shipped_by is null or (btrim(shipped_by) <> '' and char_length(shipped_by) <= 200)),
  add constraint orders_delivered_by_check
    check (delivered_by is null or (btrim(delivered_by) <> '' and char_length(delivered_by) <= 200)),
  add constraint orders_cancelled_by_check
    check (cancelled_by is null or (btrim(cancelled_by) <> '' and char_length(cancelled_by) <= 200));

create unique index stock_ledger_order_item_return_key
  on public.stock_ledger (order_item_id)
  where action = 'return';

alter table public.stock_ledger
  add constraint stock_ledger_return_reference_check
    check (
      action <> 'return'
      or (
        order_id is not null
        and order_item_id is not null
        and reservation_id is null
        and quantity_delta > 0
      )
    );

create function public.cancel_order(
  p_order_id uuid,
  p_cancelled_by text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order_status text;
  v_item record;
  v_previous_quantity integer;
begin
  if p_order_id is null
    or p_cancelled_by is null
    or btrim(p_cancelled_by) = ''
    or char_length(p_cancelled_by) > 200
  then
    raise exception 'invalid cancellation input' using errcode = '22023';
  end if;

  select orders.status
  into v_order_status
  from public.orders
  where orders.id = p_order_id
  for update;

  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  if v_order_status = 'cancelled' then
    return jsonb_build_object(
      'order_id', p_order_id,
      'status', 'cancelled',
      'idempotent_replay', true,
      'stock_restored', false
    );
  end if;

  if v_order_status in ('shipped', 'delivered') then
    raise exception 'shipped or delivered orders cannot be cancelled'
      using errcode = '55000';
  end if;

  if v_order_status = 'confirmed' then
    for v_item in
      select
        order_items.id as order_item_id,
        order_items.product_flavor_id,
        order_items.quantity,
        product_flavors.stock_quantity,
        product_flavors.is_available
      from public.order_items
      join public.product_flavors
        on product_flavors.id = order_items.product_flavor_id
      where order_items.order_id = p_order_id
      order by product_flavors.id
      for update of product_flavors
    loop
      if not exists (
        select 1 from public.stock_ledger
        where order_id = p_order_id
          and order_item_id = v_item.order_item_id
          and action = 'sale'
      ) then
        raise exception 'confirmed order sale ledger is incomplete'
          using errcode = '55000';
      end if;

      if exists (
        select 1 from public.stock_ledger
        where order_id = p_order_id
          and order_item_id = v_item.order_item_id
          and action = 'return'
      ) then
        raise exception 'confirmed order return ledger already exists'
          using errcode = '55000';
      end if;

      v_previous_quantity := v_item.stock_quantity;

      update public.product_flavors
      set
        stock_quantity = stock_quantity + v_item.quantity,
        is_available = case
          when stock_quantity = 0 and is_active is true then true
          else is_available
        end,
        updated_at = now()
      where id = v_item.product_flavor_id;

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
      ) values (
        v_item.product_flavor_id,
        p_order_id,
        v_item.order_item_id,
        null,
        'return',
        v_item.quantity,
        v_previous_quantity,
        v_previous_quantity + v_item.quantity,
        btrim(p_cancelled_by)
      );
    end loop;
  end if;

  update public.stock_reservations
  set status = 'released'
  where order_id = p_order_id
    and status = 'reserved';

  update public.orders
  set
    status = 'cancelled',
    cancelled_at = now(),
    cancelled_by = btrim(p_cancelled_by)
  where id = p_order_id;

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', 'cancelled',
    'idempotent_replay', false,
    'stock_restored', v_order_status = 'confirmed'
  );
end;
$$;

comment on function public.cancel_order(uuid, text) is
  'Atomically cancels draft, pending, or confirmed orders; releases active holds and restores confirmed stock with append-only return ledger rows.';

create function public.mark_order_shipped(
  p_order_id uuid,
  p_carrier text,
  p_tracking_number text,
  p_shipped_by text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  if p_order_id is null
    or p_carrier is null or btrim(p_carrier) = '' or char_length(p_carrier) > 100
    or p_tracking_number is null or btrim(p_tracking_number) = '' or char_length(p_tracking_number) > 200
    or p_shipped_by is null or btrim(p_shipped_by) = '' or char_length(p_shipped_by) > 200
  then
    raise exception 'invalid shipping input' using errcode = '22023';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  if v_order.status = 'shipped'
    and v_order.carrier = btrim(p_carrier)
    and v_order.tracking_number = btrim(p_tracking_number)
  then
    return jsonb_build_object('order_id', p_order_id, 'status', 'shipped', 'idempotent_replay', true);
  end if;

  if v_order.status <> 'confirmed' then
    raise exception 'only confirmed orders can be shipped' using errcode = '55000';
  end if;

  update public.orders
  set
    status = 'shipped',
    carrier = btrim(p_carrier),
    tracking_number = btrim(p_tracking_number),
    shipped_at = now(),
    shipped_by = btrim(p_shipped_by)
  where id = p_order_id;

  return jsonb_build_object('order_id', p_order_id, 'status', 'shipped', 'idempotent_replay', false);
end;
$$;

comment on function public.mark_order_shipped(uuid, text, text, text) is
  'Atomically moves a confirmed order to shipped and records carrier, tracking number, timestamp, and actor.';

create function public.mark_order_delivered(
  p_order_id uuid,
  p_delivered_by text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order_status text;
begin
  if p_order_id is null
    or p_delivered_by is null
    or btrim(p_delivered_by) = ''
    or char_length(p_delivered_by) > 200
  then
    raise exception 'invalid delivery input' using errcode = '22023';
  end if;

  select status into v_order_status
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  if v_order_status = 'delivered' then
    return jsonb_build_object('order_id', p_order_id, 'status', 'delivered', 'idempotent_replay', true);
  end if;

  if v_order_status <> 'shipped' then
    raise exception 'only shipped orders can be delivered' using errcode = '55000';
  end if;

  update public.orders
  set
    status = 'delivered',
    delivered_at = now(),
    delivered_by = btrim(p_delivered_by)
  where id = p_order_id;

  return jsonb_build_object('order_id', p_order_id, 'status', 'delivered', 'idempotent_replay', false);
end;
$$;

comment on function public.mark_order_delivered(uuid, text) is
  'Atomically moves a shipped order to delivered and records timestamp and actor.';

revoke all on function public.cancel_order(uuid, text)
  from public, anon, authenticated;
revoke all on function public.mark_order_shipped(uuid, text, text, text)
  from public, anon, authenticated;
revoke all on function public.mark_order_delivered(uuid, text)
  from public, anon, authenticated;

grant execute on function public.cancel_order(uuid, text) to service_role;
grant execute on function public.mark_order_shipped(uuid, text, text, text) to service_role;
grant execute on function public.mark_order_delivered(uuid, text) to service_role;
