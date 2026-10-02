-- A provider outage after a slip was received is not an unpaid order.
-- Release its temporary stock hold, but keep the order for bank review.
create or replace function public.cancel_expired_unpaid_line_orders()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_payment record;
  v_order_status text;
  v_cancelled_count integer := 0;
begin
  for v_payment in
    select id, order_id, line_message_id, failure_code
    from public.order_payment_requests
    where status = 'awaiting_slip' and expires_at <= now()
    order by order_payment_requests.expires_at
    for update skip locked
  loop
    select status into v_order_status from public.orders
    where id = v_payment.order_id and order_source = 'line'
    for update skip locked;
    if not found or v_order_status <> 'pending' then
      continue;
    end if;

    if v_payment.line_message_id is not null and v_payment.failure_code in (
      'API_SERVER_ERROR', 'BRANCH_INACTIVE', 'INTERNAL_SERVER_ERROR', 'INVALID_API_KEY',
      'IP_NOT_ALLOWED', 'MISSING_API_KEY', 'QUOTA_EXCEEDED',
      'RENEWAL_TEMPORARILY_UNAVAILABLE', 'SERVICE_EXPIRED'
    ) then
      update public.stock_reservations
      set status = 'released'
      where order_id = v_payment.order_id and status = 'reserved';

      update public.order_payment_requests
      set status = 'failed'
      where id = v_payment.id and status = 'awaiting_slip';
      -- The order stays pending for owner/manager bank review; no shipment yet.
    else
      perform public.cancel_order(v_payment.order_id, 'system:payment-timeout');
      update public.order_payment_requests
      set status = 'expired', failure_code = 'PAYMENT_WINDOW_EXPIRED'
      where id = v_payment.id and status = 'cancelled';
      v_cancelled_count := v_cancelled_count + 1;
    end if;
  end loop;
  return v_cancelled_count;
end;
$$;

comment on function public.cancel_expired_unpaid_line_orders() is
  'Cancels only unpaid LINE orders. Provider failures with an already received slip move to bank review and release the stock hold without cancelling the order.';

-- Customers must not accidentally cancel an order whose slip is under review.
create or replace function public.cancel_member_unpaid_order(p_order_id uuid, p_customer_id integer)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  if p_order_id is null or p_customer_id is null or p_customer_id <= 0 then
    raise exception 'invalid member cancellation input' using errcode = '22023';
  end if;

  select * into v_order from public.orders
  where id = p_order_id and customer_id = p_customer_id for update;
  if not found then
    raise exception 'order not found for customer' using errcode = 'P0002';
  end if;
  if v_order.status = 'cancelled' then
    return jsonb_build_object('order_id', p_order_id, 'status', 'cancelled',
      'idempotent_replay', true, 'stock_restored', false);
  end if;
  if v_order.status not in ('draft', 'pending') then
    raise exception 'only unpaid orders can be cancelled by a member' using errcode = '55000';
  end if;
  if exists (
    select 1 from public.order_payment_requests
    where order_id = p_order_id and (
      status = 'verified'
      or (line_message_id is not null and failure_code in (
        'API_SERVER_ERROR', 'BRANCH_INACTIVE', 'INTERNAL_SERVER_ERROR', 'INVALID_API_KEY',
        'IP_NOT_ALLOWED', 'MISSING_API_KEY', 'QUOTA_EXCEEDED',
        'RENEWAL_TEMPORARILY_UNAVAILABLE', 'SERVICE_EXPIRED'
      ))
    )
  ) then
    raise exception 'payment evidence requires staff review before cancellation' using errcode = '55000';
  end if;
  return public.cancel_order(p_order_id, 'member:' || p_customer_id::text);
end;
$$;

create table public.order_payment_recovery_events (
  order_id uuid primary key references public.orders(id) on delete restrict,
  payment_request_id uuid not null unique references public.order_payment_requests(id) on delete restrict,
  previous_order_status text not null,
  previous_payment_status text not null,
  previous_failure_code text,
  previous_cancelled_at timestamp with time zone,
  previous_cancelled_by text,
  bank_reference text not null,
  verified_by text not null,
  verification_note text not null,
  recovered_at timestamp with time zone not null default now()
);
alter table public.order_payment_recovery_events enable row level security;
revoke all on public.order_payment_recovery_events from public, anon, authenticated, service_role;
grant select, insert on public.order_payment_recovery_events to service_role;

create function public.recover_line_order_payment(
  p_order_id uuid,
  p_amount numeric,
  p_bank_reference text,
  p_note text,
  p_verified_by text,
  p_bank_deposit_confirmed boolean,
  p_slip_path text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_payment public.order_payment_requests%rowtype;
  v_order public.orders%rowtype;
  v_item_count integer;
  v_released_count integer;
  v_confirmation jsonb;
begin
  if p_order_id is null or p_amount is null or p_amount <= 0
    or p_amount <> round(p_amount, 2)
    or p_bank_reference is null or char_length(btrim(p_bank_reference)) not between 6 and 100
    or p_note is null or char_length(btrim(p_note)) not between 10 and 500
    or p_verified_by is null or char_length(btrim(p_verified_by)) not between 1 and 200
    or p_bank_deposit_confirmed is not true
    or (p_slip_path is not null and (
      char_length(p_slip_path) > 120
      or left(p_slip_path, 37) <> p_order_id::text || '/'
      or p_slip_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}[.](jpg|png|webp)$'
    ))
  then
    raise exception 'invalid payment recovery input' using errcode = '22023';
  end if;

  -- Follow the same payment -> order lock order as automatic slip verification.
  select * into v_payment from public.order_payment_requests
  where order_id = p_order_id for update;
  if not found then
    raise exception 'payment request not found' using errcode = 'P0002';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  if v_order.status in ('confirmed', 'shipped', 'delivered')
    and v_payment.status = 'verified'
    and v_payment.verification_method = 'manual_bank'
    and v_payment.provider_transaction_ref = btrim(p_bank_reference)
    and exists (select 1 from public.order_payment_recovery_events where order_id = p_order_id)
  then
    return jsonb_build_object('order_id', p_order_id, 'status', v_order.status,
      'idempotent_replay', true);
  end if;

  if v_order.order_source <> 'line'
    or v_payment.line_message_id is null
    or v_payment.expected_amount <> v_order.total
    or v_order.total <> p_amount
    or (
      not (v_order.status = 'pending' and v_payment.status = 'failed'
        and v_payment.failure_code in (
          'API_SERVER_ERROR', 'BRANCH_INACTIVE', 'INTERNAL_SERVER_ERROR', 'INVALID_API_KEY',
          'IP_NOT_ALLOWED', 'MISSING_API_KEY', 'QUOTA_EXCEEDED',
          'RENEWAL_TEMPORARILY_UNAVAILABLE', 'SERVICE_EXPIRED'
        ))
      and not (v_order.status = 'cancelled'
        and v_order.cancelled_by = 'system:payment-timeout'
        and v_payment.status = 'expired'
        and v_payment.failure_code = 'PAYMENT_WINDOW_EXPIRED')
    )
  then
    raise exception 'order is not eligible for payment recovery' using errcode = '55000';
  end if;

  select count(*)::integer into v_item_count from public.order_items where order_id = p_order_id;
  select count(*)::integer into v_released_count
  from public.stock_reservations where order_id = p_order_id and status = 'released';
  if v_item_count < 1 or v_released_count <> v_item_count then
    raise exception 'released stock reservations are incomplete' using errcode = '55000';
  end if;
  if exists (select 1 from public.stock_ledger where order_id = p_order_id and action = 'sale') then
    raise exception 'order stock was already deducted' using errcode = '55000';
  end if;

  perform 1 from public.product_flavors
  join public.order_items on order_items.product_flavor_id = product_flavors.id
  where order_items.order_id = p_order_id
  order by product_flavors.id for update of product_flavors;
  if exists (
    select 1 from public.order_items
    join public.product_flavors on product_flavors.id = order_items.product_flavor_id
    left join lateral (
      select coalesce(sum(quantity), 0)::integer as held
      from public.stock_reservations
      where product_flavor_id = product_flavors.id
        and status = 'reserved' and expires_at > now()
    ) holds on true
    where order_items.order_id = p_order_id
      and (product_flavors.is_active is not true
        or product_flavors.is_available is not true
        or product_flavors.stock_quantity - holds.held < order_items.quantity)
  ) then
    raise exception 'insufficient stock for payment recovery' using errcode = 'P0001';
  end if;

  update public.stock_reservations
  set status = 'reserved', expires_at = now() + interval '10 minutes'
  where order_id = p_order_id and status = 'released';
  update public.orders
  set status = 'pending', cancelled_at = null, cancelled_by = null
  where id = p_order_id;
  update public.order_payment_requests
  set status = 'verified', verification_method = 'manual_bank',
    provider_transaction_ref = btrim(p_bank_reference), actual_amount = p_amount,
    account_matched = null, amount_matched = null, is_duplicate = null,
    manual_verified_by = btrim(p_verified_by), manual_verification_note = btrim(p_note),
    manual_slip_path = p_slip_path, verified_at = now(), failure_code = null
  where id = v_payment.id;

  v_confirmation := public.confirm_pending_order(p_order_id,
    'manual-bank-recovery:' || btrim(p_verified_by));
  if coalesce(v_confirmation ->> 'status', '') <> 'confirmed' then
    raise exception 'recovery did not confirm order' using errcode = '55000';
  end if;
  insert into public.order_payment_recovery_events (
    order_id, payment_request_id, previous_order_status, previous_payment_status,
    previous_failure_code, previous_cancelled_at, previous_cancelled_by,
    bank_reference, verified_by, verification_note
  ) values (
    p_order_id, v_payment.id, v_order.status, v_payment.status,
    v_payment.failure_code, v_order.cancelled_at, v_order.cancelled_by,
    btrim(p_bank_reference), btrim(p_verified_by), btrim(p_note)
  );
  return jsonb_build_object('order_id', p_order_id, 'status', 'confirmed',
    'idempotent_replay', false);
end;
$$;

comment on function public.recover_line_order_payment(uuid,numeric,text,text,text,boolean,text) is
  'Owner-authorized, bank-ledger-confirmed recovery of a provider-outage LINE order. Rechecks stock and confirms the original order atomically.';
revoke all on function public.recover_line_order_payment(uuid,numeric,text,text,text,boolean,text)
  from public, anon, authenticated;
grant execute on function public.recover_line_order_payment(uuid,numeric,text,text,text,boolean,text)
  to service_role;
