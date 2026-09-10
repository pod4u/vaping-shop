create table public.order_payment_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique,
  source_customer_identity_id uuid not null,
  expected_amount numeric(12, 2) not null,
  status text not null default 'awaiting_slip',
  requested_at timestamp with time zone not null default now(),
  expires_at timestamp with time zone not null,
  requested_by text not null,
  line_message_id text unique,
  provider_transaction_ref text,
  actual_amount numeric(12, 2),
  account_matched boolean,
  amount_matched boolean,
  is_duplicate boolean,
  failure_code text,
  verified_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint order_payment_requests_order_id_fkey
    foreign key (order_id) references public.orders (id) on delete restrict,
  constraint order_payment_requests_identity_id_fkey
    foreign key (source_customer_identity_id)
    references public.customer_identities (id) on delete restrict,
  constraint order_payment_requests_expected_amount_check check (expected_amount > 0),
  constraint order_payment_requests_actual_amount_check check (actual_amount is null or actual_amount > 0),
  constraint order_payment_requests_status_check
    check (status in ('awaiting_slip', 'verified', 'failed', 'expired', 'cancelled')),
  constraint order_payment_requests_expiry_check check (expires_at > requested_at),
  constraint order_payment_requests_requested_by_check
    check (btrim(requested_by) <> '' and char_length(requested_by) <= 200),
  constraint order_payment_requests_line_message_id_check
    check (line_message_id is null or (btrim(line_message_id) <> '' and char_length(line_message_id) <= 200)),
  constraint order_payment_requests_transaction_ref_check
    check (provider_transaction_ref is null or (btrim(provider_transaction_ref) <> '' and char_length(provider_transaction_ref) <= 255)),
  constraint order_payment_requests_failure_code_check
    check (failure_code is null or (btrim(failure_code) <> '' and char_length(failure_code) <= 100)),
  constraint order_payment_requests_verified_shape_check check (
    status <> 'verified'
    or (
      line_message_id is not null
      and provider_transaction_ref is not null
      and actual_amount = expected_amount
      and account_matched is true
      and amount_matched is true
      and is_duplicate is false
      and verified_at is not null
    )
  )
);

comment on table public.order_payment_requests is
  'Server-only payment gate for LINE orders. Stores verification metadata only; never stores slip images, sender names, or sender account numbers.';

create unique index order_payment_requests_verified_transaction_key
  on public.order_payment_requests (provider_transaction_ref)
  where provider_transaction_ref is not null;

create unique index order_payment_requests_one_active_identity_key
  on public.order_payment_requests (source_customer_identity_id)
  where status = 'awaiting_slip';

create index order_payment_requests_status_expires_idx
  on public.order_payment_requests (status, expires_at);

create trigger order_payment_requests_set_updated_at
before update on public.order_payment_requests
for each row execute function public.set_updated_at();

alter table public.order_payment_requests enable row level security;
revoke all on table public.order_payment_requests from public, anon, authenticated, service_role;
grant select, insert, update on table public.order_payment_requests to service_role;

create function public.sync_order_payment_request_status()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    update public.order_payment_requests
    set status = 'cancelled', failure_code = 'ORDER_CANCELLED'
    where order_id = new.id and status = 'awaiting_slip';
  elsif new.status = 'draft' and old.status = 'pending' then
    update public.order_payment_requests
    set status = 'expired', failure_code = 'STOCK_RESERVATION_EXPIRED'
    where order_id = new.id and status = 'awaiting_slip';
  end if;
  return new;
end;
$$;

create trigger orders_sync_payment_request_status
after update of status on public.orders
for each row execute function public.sync_order_payment_request_status();

create function public.prepare_line_order_payment(
  p_order_id uuid,
  p_requested_by text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_expires_at timestamp with time zone;
  v_payment public.order_payment_requests%rowtype;
begin
  if p_order_id is null
    or p_requested_by is null
    or btrim(p_requested_by) = ''
    or char_length(p_requested_by) > 200
  then
    raise exception 'invalid payment request input' using errcode = '22023';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;
  if v_order.order_source <> 'line' or v_order.source_customer_identity_id is null then
    raise exception 'payment request requires a linked LINE order' using errcode = '55000';
  end if;
  if v_order.status <> 'pending' then
    raise exception 'only pending orders can request payment' using errcode = '55000';
  end if;

  select min(expires_at) into v_expires_at
  from public.stock_reservations
  where order_id = p_order_id
    and status = 'reserved'
    and expires_at > now();

  if v_expires_at is null then
    raise exception 'active stock reservation is required' using errcode = '55000';
  end if;

  update public.order_payment_requests
  set status = 'expired', failure_code = 'PAYMENT_WINDOW_EXPIRED'
  where source_customer_identity_id = v_order.source_customer_identity_id
    and status = 'awaiting_slip'
    and expires_at <= now();

  select * into v_payment
  from public.order_payment_requests
  where order_id = p_order_id
  for update;

  if found then
    if v_payment.status = 'awaiting_slip' and v_payment.expires_at > now() then
      return jsonb_build_object(
        'payment_request_id', v_payment.id,
        'order_id', p_order_id,
        'order_number', v_order.order_number,
        'expected_amount', v_payment.expected_amount,
        'expires_at', v_payment.expires_at,
        'idempotent_replay', true
      );
    end if;
    raise exception 'order payment request is not reusable' using errcode = '55000';
  end if;

  if exists (
    select 1 from public.order_payment_requests
    where source_customer_identity_id = v_order.source_customer_identity_id
      and status = 'awaiting_slip'
      and expires_at > now()
  ) then
    raise exception 'customer already has an active payment request' using errcode = '55000';
  end if;

  insert into public.order_payment_requests (
    order_id, source_customer_identity_id, expected_amount, expires_at, requested_by
  ) values (
    p_order_id, v_order.source_customer_identity_id, v_order.total, v_expires_at, btrim(p_requested_by)
  ) returning * into v_payment;

  return jsonb_build_object(
    'payment_request_id', v_payment.id,
    'order_id', p_order_id,
    'order_number', v_order.order_number,
    'expected_amount', v_payment.expected_amount,
    'expires_at', v_payment.expires_at,
    'idempotent_replay', false
  );
end;
$$;

create function public.record_line_payment_failure(
  p_payment_request_id uuid,
  p_line_message_id text,
  p_failure_code text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_payment public.order_payment_requests%rowtype;
begin
  if p_payment_request_id is null
    or p_line_message_id is null or btrim(p_line_message_id) = '' or char_length(p_line_message_id) > 200
    or p_failure_code is null or btrim(p_failure_code) = '' or char_length(p_failure_code) > 100
  then
    raise exception 'invalid payment failure input' using errcode = '22023';
  end if;

  select * into v_payment
  from public.order_payment_requests
  where id = p_payment_request_id
  for update;

  if not found then
    raise exception 'payment request not found' using errcode = 'P0002';
  end if;
  if v_payment.status <> 'awaiting_slip' then
    return jsonb_build_object('payment_request_id', v_payment.id, 'status', v_payment.status, 'idempotent_replay', true);
  end if;

  update public.order_payment_requests
  set line_message_id = btrim(p_line_message_id), failure_code = btrim(p_failure_code)
  where id = p_payment_request_id;

  return jsonb_build_object('payment_request_id', v_payment.id, 'status', 'awaiting_slip', 'idempotent_replay', false);
end;
$$;

create or replace function public.confirm_pending_order(
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
  v_order_source text;
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

  select orders.status, orders.order_source
  into v_order_status, v_order_source
  from public.orders
  where orders.id = p_order_id
  for update;

  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  select count(*)::integer into v_item_count
  from public.order_items where order_id = p_order_id;

  if v_order_status = 'confirmed' then
    select count(*)::integer into v_ledger_count
    from public.stock_ledger where order_id = p_order_id and action = 'sale';
    select count(*)::integer into v_reservation_count
    from public.stock_reservations where order_id = p_order_id and status = 'confirmed';
    if v_item_count > 0 and v_ledger_count = v_item_count and v_reservation_count = v_item_count then
      return jsonb_build_object('order_id', p_order_id, 'status', 'confirmed', 'idempotent_replay', true, 'reservation_expired', false);
    end if;
    raise exception 'confirmed order stock records are incomplete' using errcode = '55000';
  end if;

  if v_order_status <> 'pending' then
    raise exception 'only pending orders can be confirmed' using errcode = '55000';
  end if;

  if v_order_source = 'line' and not exists (
    select 1 from public.order_payment_requests
    where order_id = p_order_id and status = 'verified'
  ) then
    raise exception 'verified payment is required for LINE orders' using errcode = '55000';
  end if;

  select count(*)::integer into v_reservation_count
  from public.stock_reservations
  join public.order_items
    on order_items.id = stock_reservations.order_item_id
    and order_items.order_id = stock_reservations.order_id
    and order_items.product_flavor_id = stock_reservations.product_flavor_id
    and order_items.quantity = stock_reservations.quantity
  where stock_reservations.order_id = p_order_id and stock_reservations.status = 'reserved';

  if v_item_count < 1 or v_reservation_count <> v_item_count then
    raise exception 'order reservations are incomplete' using errcode = '55000';
  end if;

  if exists (
    select 1 from public.stock_reservations
    where order_id = p_order_id and status = 'reserved' and expires_at <= now()
  ) then
    delete from public.stock_reservations where order_id = p_order_id and status = 'reserved';
    update public.orders set status = 'draft' where id = p_order_id;
    return jsonb_build_object('order_id', p_order_id, 'status', 'draft', 'idempotent_replay', false, 'reservation_expired', true);
  end if;

  perform 1
  from public.product_flavors
  join public.stock_reservations on stock_reservations.product_flavor_id = product_flavors.id
  where stock_reservations.order_id = p_order_id and stock_reservations.status = 'reserved'
  order by product_flavors.id
  for update of product_flavors;

  with deductions as (
    select id as reservation_id, order_id, order_item_id, product_flavor_id, quantity
    from public.stock_reservations
    where order_id = p_order_id and status = 'reserved' and expires_at > now()
  ), updated_stock as (
    update public.product_flavors
    set stock_quantity = product_flavors.stock_quantity - deductions.quantity,
        is_available = (product_flavors.stock_quantity - deductions.quantity) > 0,
        updated_at = now()
    from deductions
    where product_flavors.id = deductions.product_flavor_id
      and product_flavors.stock_quantity >= deductions.quantity
    returning deductions.reservation_id, deductions.order_id, deductions.order_item_id,
      deductions.product_flavor_id, deductions.quantity,
      product_flavors.stock_quantity + deductions.quantity as previous_quantity,
      product_flavors.stock_quantity as new_quantity
  )
  insert into public.stock_ledger (
    product_flavor_id, order_id, order_item_id, reservation_id, action,
    quantity_delta, previous_quantity, new_quantity, created_by
  )
  select product_flavor_id, order_id, order_item_id, reservation_id, 'sale',
    -quantity, previous_quantity, new_quantity, btrim(p_confirmed_by)
  from updated_stock;

  get diagnostics v_ledger_count = row_count;
  if v_ledger_count <> v_item_count then
    raise exception 'insufficient physical stock during confirmation' using errcode = 'P0001';
  end if;

  update public.stock_reservations set status = 'confirmed'
  where order_id = p_order_id and status = 'reserved';
  update public.orders set status = 'confirmed' where id = p_order_id;

  return jsonb_build_object('order_id', p_order_id, 'status', 'confirmed', 'idempotent_replay', false, 'reservation_expired', false);
end;
$$;

create function public.complete_line_order_payment(
  p_payment_request_id uuid,
  p_line_message_id text,
  p_provider_transaction_ref text,
  p_slip_date timestamp with time zone,
  p_actual_amount numeric,
  p_account_matched boolean,
  p_amount_matched boolean,
  p_is_duplicate boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_payment public.order_payment_requests%rowtype;
  v_confirmation jsonb;
begin
  if p_payment_request_id is null
    or p_line_message_id is null or btrim(p_line_message_id) = '' or char_length(p_line_message_id) > 200
    or p_provider_transaction_ref is null or btrim(p_provider_transaction_ref) = '' or char_length(p_provider_transaction_ref) > 255
    or p_slip_date is null
    or p_actual_amount is null or p_actual_amount <= 0
  then
    raise exception 'invalid verified payment input' using errcode = '22023';
  end if;

  select * into v_payment
  from public.order_payment_requests
  where id = p_payment_request_id
  for update;

  if not found then
    raise exception 'payment request not found' using errcode = 'P0002';
  end if;
  if v_payment.status = 'verified' and v_payment.line_message_id = btrim(p_line_message_id) then
    return jsonb_build_object('payment_request_id', v_payment.id, 'order_id', v_payment.order_id, 'status', 'verified', 'idempotent_replay', true);
  end if;
  if v_payment.status <> 'awaiting_slip' or v_payment.expires_at <= now() then
    raise exception 'payment request is not active' using errcode = '55000';
  end if;
  if p_account_matched is not true
    or p_amount_matched is not true
    or p_is_duplicate is not false
    or round(p_actual_amount, 2) <> v_payment.expected_amount
  then
    raise exception 'payment verification checks did not pass' using errcode = '22023';
  end if;
  if p_slip_date < v_payment.requested_at - interval '5 minutes'
    or p_slip_date > now() + interval '5 minutes'
  then
    raise exception 'payment slip date is outside the accepted window' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.stock_reservations
    where order_id = v_payment.order_id and status = 'reserved' and expires_at <= now()
  ) then
    raise exception 'payment reservation expired' using errcode = '55000';
  end if;

  update public.order_payment_requests
  set status = 'verified',
      line_message_id = btrim(p_line_message_id),
      provider_transaction_ref = btrim(p_provider_transaction_ref),
      actual_amount = round(p_actual_amount, 2),
      account_matched = true,
      amount_matched = true,
      is_duplicate = false,
      failure_code = null,
      verified_at = now()
  where id = v_payment.id;

  v_confirmation := public.confirm_pending_order(v_payment.order_id, 'thunder-verification');
  if coalesce((v_confirmation ->> 'reservation_expired')::boolean, false) then
    raise exception 'payment reservation expired' using errcode = '55000';
  end if;

  return jsonb_build_object(
    'payment_request_id', v_payment.id,
    'order_id', v_payment.order_id,
    'status', 'verified',
    'order_status', v_confirmation ->> 'status',
    'idempotent_replay', false
  );
end;
$$;

comment on function public.prepare_line_order_payment(uuid, text) is
  'Creates one active payment window for a pending linked LINE order, bounded by the stock reservation expiry.';
comment on function public.complete_line_order_payment(uuid, text, text, timestamp with time zone, numeric, boolean, boolean, boolean) is
  'Atomically records a fully matched Thunder result and confirms the order, deducting stock exactly once.';
comment on function public.record_line_payment_failure(uuid, text, text) is
  'Records a minimal failure code for an attempted LINE slip without storing the slip image or sender PII.';

revoke all on function public.prepare_line_order_payment(uuid, text) from public, anon, authenticated;
revoke all on function public.record_line_payment_failure(uuid, text, text) from public, anon, authenticated;
revoke all on function public.complete_line_order_payment(uuid, text, text, timestamp with time zone, numeric, boolean, boolean, boolean) from public, anon, authenticated;
grant execute on function public.prepare_line_order_payment(uuid, text) to service_role;
grant execute on function public.record_line_payment_failure(uuid, text, text) to service_role;
grant execute on function public.complete_line_order_payment(uuid, text, text, timestamp with time zone, numeric, boolean, boolean, boolean) to service_role;
revoke all on function public.sync_order_payment_request_status() from public, anon, authenticated;
