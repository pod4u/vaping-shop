alter table public.orders
  add column if not exists shipping_fee numeric(12, 2) not null default 0;

alter table public.orders
  drop constraint if exists orders_shipping_fee_check;

alter table public.orders
  add constraint orders_shipping_fee_check check (shipping_fee >= 0);

comment on column public.orders.shipping_fee is
  'Shipping charged for the order. Disposable-only orders with at least 3 total items ship free; all other orders are 50 THB.';

create or replace function public.calculate_pod4u_shipping_fee(
  p_all_disposable boolean,
  p_total_quantity integer
)
returns numeric
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
    when coalesce(p_all_disposable, false) and coalesce(p_total_quantity, 0) >= 3 then 0::numeric
    else 50::numeric
  end;
$$;

revoke all on function public.calculate_pod4u_shipping_fee(boolean, integer)
  from public, anon, authenticated;
grant execute on function public.calculate_pod4u_shipping_fee(boolean, integer)
  to service_role;

create or replace function public.refresh_order_shipping_total()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order_id uuid := coalesce(new.order_id, old.order_id);
  v_subtotal numeric(12, 2);
  v_total_quantity integer;
  v_all_disposable boolean;
  v_shipping_fee numeric(12, 2);
begin
  select
    coalesce(sum(order_items.total_price), 0)::numeric(12, 2),
    coalesce(sum(order_items.quantity), 0)::integer,
    coalesce(bool_and(categories.slug = 'disposable-pod'), false)
  into v_subtotal, v_total_quantity, v_all_disposable
  from public.order_items
  join public.product_flavors on product_flavors.id = order_items.product_flavor_id
  join public.products on products.id = product_flavors.product_id
  join public.categories on categories.id = products.category_id
  where order_items.order_id = v_order_id;

  v_shipping_fee := public.calculate_pod4u_shipping_fee(
    v_all_disposable,
    v_total_quantity
  );

  update public.orders
  set subtotal = v_subtotal,
      shipping_fee = v_shipping_fee,
      total = v_subtotal + v_shipping_fee
  where id = v_order_id;

  return coalesce(new, old);
end;
$$;

revoke all on function public.refresh_order_shipping_total()
  from public, anon, authenticated;
grant execute on function public.refresh_order_shipping_total()
  to service_role;

create or replace function public.enforce_order_shipping_total()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item_count integer;
  v_subtotal numeric(12, 2);
  v_total_quantity integer;
  v_all_disposable boolean;
begin
  select
    count(*)::integer,
    coalesce(sum(order_items.total_price), 0)::numeric(12, 2),
    coalesce(sum(order_items.quantity), 0)::integer,
    bool_and(categories.slug = 'disposable-pod')
  into v_item_count, v_subtotal, v_total_quantity, v_all_disposable
  from public.order_items
  join public.product_flavors on product_flavors.id = order_items.product_flavor_id
  join public.products on products.id = product_flavors.product_id
  join public.categories on categories.id = products.category_id
  where order_items.order_id = new.id;

  if v_item_count > 0 then
    new.subtotal := v_subtotal;
    new.shipping_fee := public.calculate_pod4u_shipping_fee(
      v_all_disposable,
      v_total_quantity
    );
    new.total := new.subtotal + new.shipping_fee;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_order_shipping_total()
  from public, anon, authenticated;
grant execute on function public.enforce_order_shipping_total()
  to service_role;

drop trigger if exists orders_enforce_shipping_total on public.orders;
create trigger orders_enforce_shipping_total
before update of subtotal, total, shipping_fee on public.orders
for each row execute function public.enforce_order_shipping_total();

drop trigger if exists order_items_refresh_shipping_total on public.order_items;
create trigger order_items_refresh_shipping_total
after insert or update or delete on public.order_items
for each row execute function public.refresh_order_shipping_total();
