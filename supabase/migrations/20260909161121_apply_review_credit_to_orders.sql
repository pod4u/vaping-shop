-- Batch 10B: reserve one approved-review credit on a new order, release it
-- when the unpaid order is cancelled/expires, and redeem it on confirmation.

alter table public.orders
  add column discount_amount numeric(12, 2) not null default 0,
  add column discount_credit_id uuid;

alter table public.orders
  add constraint orders_discount_credit_id_fkey
    foreign key (discount_credit_id)
    references public.customer_discount_credits (id)
    on delete restrict,
  add constraint orders_discount_amount_check
    check (discount_amount >= 0),
  add constraint orders_discount_cap_check
    check (discount_amount <= subtotal + shipping_fee),
  add constraint orders_discount_shape_check
    check (
      (discount_amount = 0 and discount_credit_id is null)
      or (discount_amount > 0 and discount_credit_id is not null)
    ),
  add constraint orders_total_calculation_check
    check (total = round(greatest(subtotal + shipping_fee - discount_amount, 0), 2));

comment on column public.orders.discount_amount is
  'Order-time snapshot of the single review credit applied to this order.';
comment on column public.orders.discount_credit_id is
  'The one customer discount credit reserved or redeemed for this order.';

create unique index orders_discount_credit_id_key
  on public.orders (discount_credit_id)
  where discount_credit_id is not null;

create unique index customer_discount_credits_reserved_order_id_key
  on public.customer_discount_credits (reserved_order_id)
  where reserved_order_id is not null and status = 'reserved';

create unique index customer_discount_credits_redeemed_order_id_key
  on public.customer_discount_credits (redeemed_order_id)
  where redeemed_order_id is not null and status = 'redeemed';

-- Keep shipping and final-total snapshots consistent whenever cart items change.
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
      total = round(greatest(v_subtotal + v_shipping_fee - discount_amount, 0), 2)
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
  end if;

  new.total := round(
    greatest(new.subtotal + new.shipping_fee - new.discount_amount, 0),
    2
  );
  return new;
end;
$$;

revoke all on function public.enforce_order_shipping_total()
  from public, anon, authenticated;
grant execute on function public.enforce_order_shipping_total()
  to service_role;

drop trigger if exists orders_enforce_shipping_total on public.orders;
create trigger orders_enforce_shipping_total
before update of subtotal, total, shipping_fee, discount_amount, discount_credit_id
on public.orders
for each row execute function public.enforce_order_shipping_total();

create function public.reserve_order_review_credit(
  p_order_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_credit public.customer_discount_credits%rowtype;
  v_discount numeric(12, 2);
begin
  if p_order_id is null then
    raise exception 'invalid credit reservation input' using errcode = '22023';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  if v_order.status not in ('draft', 'pending') then
    raise exception 'credit can only be reserved for an unpaid order' using errcode = '55000';
  end if;

  if v_order.discount_credit_id is not null then
    select * into v_credit
    from public.customer_discount_credits
    where id = v_order.discount_credit_id
    for update;

    if found
      and v_credit.customer_id = v_order.customer_id
      and v_credit.status = 'reserved'
      and v_credit.reserved_order_id = p_order_id
    then
      return jsonb_build_object(
        'order_id', p_order_id,
        'credit_id', v_credit.id,
        'discount_amount', v_order.discount_amount,
        'status', 'reserved',
        'idempotent_replay', true
      );
    end if;

    raise exception 'order credit reservation is inconsistent' using errcode = '55000';
  end if;

  select * into v_credit
  from public.customer_discount_credits
  where customer_id = v_order.customer_id
    and status = 'available'
  order by created_at, id
  for update skip locked
  limit 1;

  if not found then
    return jsonb_build_object(
      'order_id', p_order_id,
      'credit_id', null,
      'discount_amount', 0,
      'status', 'not_available',
      'idempotent_replay', true
    );
  end if;

  v_discount := least(
    v_credit.amount,
    greatest(v_order.subtotal + v_order.shipping_fee, 0)
  )::numeric(12, 2);

  if v_discount <= 0 then
    return jsonb_build_object(
      'order_id', p_order_id,
      'credit_id', null,
      'discount_amount', 0,
      'status', 'not_applicable',
      'idempotent_replay', true
    );
  end if;

  update public.customer_discount_credits
  set status = 'reserved',
      reserved_order_id = p_order_id,
      reserved_at = now(),
      redeemed_order_id = null,
      redeemed_at = null,
      voided_at = null
  where id = v_credit.id;

  update public.orders
  set discount_credit_id = v_credit.id,
      discount_amount = v_discount,
      total = round(greatest(subtotal + shipping_fee - v_discount, 0), 2)
  where id = p_order_id;

  return jsonb_build_object(
    'order_id', p_order_id,
    'credit_id', v_credit.id,
    'discount_amount', v_discount,
    'status', 'reserved',
    'idempotent_replay', false
  );
end;
$$;

comment on function public.reserve_order_review_credit(uuid) is
  'Reserves at most one oldest available customer credit for a draft or pending order.';
revoke all on function public.reserve_order_review_credit(uuid)
  from public, anon, authenticated;
grant execute on function public.reserve_order_review_credit(uuid)
  to service_role;

create function public.release_order_review_credit(
  p_order_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_credit_id uuid;
begin
  if p_order_id is null then
    raise exception 'invalid credit release input' using errcode = '22023';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  v_credit_id := v_order.discount_credit_id;
  if v_credit_id is null then
    return jsonb_build_object(
      'order_id', p_order_id,
      'status', 'not_reserved',
      'idempotent_replay', true
    );
  end if;

  update public.customer_discount_credits
  set status = 'available',
      reserved_order_id = null,
      reserved_at = null,
      redeemed_order_id = null,
      redeemed_at = null,
      voided_at = null
  where id = v_credit_id
    and customer_id = v_order.customer_id
    and status = 'reserved'
    and reserved_order_id = p_order_id;

  if not found then
    if exists (
      select 1
      from public.customer_discount_credits
      where id = v_credit_id
        and status = 'redeemed'
        and redeemed_order_id = p_order_id
    ) then
      return jsonb_build_object(
        'order_id', p_order_id,
        'credit_id', v_credit_id,
        'status', 'redeemed',
        'idempotent_replay', true
      );
    end if;
    raise exception 'order credit release is inconsistent' using errcode = '55000';
  end if;

  update public.orders
  set discount_credit_id = null,
      discount_amount = 0,
      total = round(subtotal + shipping_fee, 2)
  where id = p_order_id;

  return jsonb_build_object(
    'order_id', p_order_id,
    'credit_id', v_credit_id,
    'status', 'available',
    'idempotent_replay', false
  );
end;
$$;

comment on function public.release_order_review_credit(uuid) is
  'Returns a reserved order credit to available without voiding it.';
revoke all on function public.release_order_review_credit(uuid)
  from public, anon, authenticated;
grant execute on function public.release_order_review_credit(uuid)
  to service_role;

create function public.redeem_order_review_credit(
  p_order_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_credit public.customer_discount_credits%rowtype;
begin
  if p_order_id is null then
    raise exception 'invalid credit redemption input' using errcode = '22023';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  if v_order.status <> 'confirmed' then
    raise exception 'credit can only be redeemed for a confirmed order' using errcode = '55000';
  end if;

  if v_order.discount_credit_id is null then
    return jsonb_build_object(
      'order_id', p_order_id,
      'status', 'not_reserved',
      'idempotent_replay', true
    );
  end if;

  select * into v_credit
  from public.customer_discount_credits
  where id = v_order.discount_credit_id
  for update;

  if v_credit.status = 'redeemed'
    and v_credit.redeemed_order_id = p_order_id
  then
    return jsonb_build_object(
      'order_id', p_order_id,
      'credit_id', v_credit.id,
      'status', 'redeemed',
      'idempotent_replay', true
    );
  end if;

  if v_credit.customer_id <> v_order.customer_id
    or v_credit.status <> 'reserved'
    or v_credit.reserved_order_id <> p_order_id
  then
    raise exception 'order credit redemption is inconsistent' using errcode = '55000';
  end if;

  update public.customer_discount_credits
  set status = 'redeemed',
      redeemed_order_id = p_order_id,
      redeemed_at = now()
  where id = v_credit.id;

  return jsonb_build_object(
    'order_id', p_order_id,
    'credit_id', v_credit.id,
    'status', 'redeemed',
    'idempotent_replay', false
  );
end;
$$;

comment on function public.redeem_order_review_credit(uuid) is
  'Redeems the single reserved credit after an order reaches confirmed status.';
revoke all on function public.redeem_order_review_credit(uuid)
  from public, anon, authenticated;
grant execute on function public.redeem_order_review_credit(uuid)
  to service_role;

create function public.assign_review_credit_after_order_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform public.reserve_order_review_credit(new.id);
  return new;
end;
$$;

revoke all on function public.assign_review_credit_after_order_insert()
  from public, anon, authenticated;
grant execute on function public.assign_review_credit_after_order_insert()
  to service_role;

create trigger orders_assign_review_credit
after insert on public.orders
for each row execute function public.assign_review_credit_after_order_insert();

create function public.sync_review_credit_on_order_status()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status = 'draft' and new.status = 'pending' then
    perform public.reserve_order_review_credit(new.id);
  elsif new.status = 'cancelled'
    or (old.status = 'pending' and new.status = 'draft')
  then
    perform public.release_order_review_credit(new.id);
  elsif old.status = 'pending' and new.status = 'confirmed' then
    perform public.redeem_order_review_credit(new.id);
  end if;
  return new;
end;
$$;

revoke all on function public.sync_review_credit_on_order_status()
  from public, anon, authenticated;
grant execute on function public.sync_review_credit_on_order_status()
  to service_role;

create trigger orders_sync_review_credit
after update of status on public.orders
for each row
when (old.status is distinct from new.status)
execute function public.sync_review_credit_on_order_status();
