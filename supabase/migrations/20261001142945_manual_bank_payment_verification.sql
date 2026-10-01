-- Emergency bank-ledger verification for LINE orders when the slip provider fails.
-- This records a distinct verification method; it never claims Thunder passed.
alter table public.order_payment_requests
  add column verification_method text not null default 'thunder',
  add column manual_verified_by text,
  add column manual_verification_note text;

alter table public.order_payment_requests
  add constraint order_payment_requests_verification_method_check
    check (verification_method in ('thunder', 'manual_bank')),
  add constraint order_payment_requests_manual_audit_check
    check (
      (verification_method = 'thunder' and manual_verified_by is null and manual_verification_note is null)
      or (verification_method = 'manual_bank' and status = 'verified'
        and manual_verified_by is not null and btrim(manual_verified_by) <> ''
        and char_length(manual_verified_by) <= 200
        and manual_verification_note is not null
        and char_length(btrim(manual_verification_note)) between 10 and 500)
    );

alter table public.order_payment_requests
  drop constraint order_payment_requests_verified_shape_check;
alter table public.order_payment_requests
  add constraint order_payment_requests_verified_shape_check check (
    status <> 'verified'
    or (
      line_message_id is not null
      and provider_transaction_ref is not null
      and actual_amount = expected_amount
      and verified_at is not null
      and (
        (verification_method = 'thunder'
          and account_matched is true and amount_matched is true and is_duplicate is false)
        or (verification_method = 'manual_bank'
          and account_matched is null and amount_matched is null and is_duplicate is null)
      )
    )
  );

create function public.manually_verify_line_order_payment(
  p_order_id uuid,
  p_amount numeric,
  p_bank_reference text,
  p_note text,
  p_verified_by text,
  p_bank_deposit_confirmed boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_payment public.order_payment_requests%rowtype;
  v_order public.orders%rowtype;
  v_confirmation jsonb;
begin
  if p_order_id is null or p_amount is null or p_amount <= 0
    or p_bank_reference is null or char_length(btrim(p_bank_reference)) not between 6 and 100
    or p_note is null or char_length(btrim(p_note)) not between 10 and 500
    or p_verified_by is null or char_length(btrim(p_verified_by)) not between 1 and 200
    or p_bank_deposit_confirmed is not true
  then
    raise exception 'invalid manual payment verification input' using errcode = '22023';
  end if;

  -- Thunder's completion function locks the payment first. Use the same order
  -- so concurrent automatic and manual approvals cannot both win.
  select * into v_payment
  from public.order_payment_requests
  where order_id = p_order_id
  for update;
  if not found then
    raise exception 'payment request not found' using errcode = 'P0002';
  end if;
  if v_payment.status = 'verified' and v_payment.verification_method = 'manual_bank'
    and v_payment.provider_transaction_ref = btrim(p_bank_reference)
  then
    return jsonb_build_object('order_id', p_order_id, 'status', 'confirmed', 'idempotent_replay', true);
  end if;
  if v_payment.status <> 'awaiting_slip' or v_payment.expires_at <= now()
    or v_payment.line_message_id is null
    or v_payment.failure_code not in (
      'API_SERVER_ERROR', 'BRANCH_INACTIVE', 'INTERNAL_SERVER_ERROR', 'INVALID_API_KEY',
      'IP_NOT_ALLOWED', 'MISSING_API_KEY', 'QUOTA_EXCEEDED',
      'RENEWAL_TEMPORARILY_UNAVAILABLE', 'SERVICE_EXPIRED'
    )
  then
    raise exception 'manual approval requires an active slip with provider failure' using errcode = '55000';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;
  if v_order.order_source <> 'line' or v_order.status <> 'pending'
    or v_order.total <> v_payment.expected_amount
    or round(p_amount, 2) <> v_payment.expected_amount or p_amount <> round(p_amount, 2)
  then
    raise exception 'order or payment amount is not eligible for manual approval' using errcode = '55000';
  end if;
  if exists (
    select 1 from public.stock_reservations
    where order_id = p_order_id and status = 'reserved' and expires_at <= now()
  ) then
    raise exception 'payment reservation expired' using errcode = '55000';
  end if;

  update public.order_payment_requests
  set status = 'verified',
      verification_method = 'manual_bank',
      provider_transaction_ref = btrim(p_bank_reference),
      actual_amount = p_amount,
      account_matched = null,
      amount_matched = null,
      is_duplicate = null,
      manual_verified_by = btrim(p_verified_by),
      manual_verification_note = btrim(p_note),
      verified_at = now()
  where id = v_payment.id;

  v_confirmation := public.confirm_pending_order(p_order_id, 'manual-bank:' || btrim(p_verified_by));
  if coalesce((v_confirmation ->> 'reservation_expired')::boolean, false) then
    raise exception 'payment reservation expired' using errcode = '55000';
  end if;

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', v_confirmation ->> 'status',
    'verification_method', 'manual_bank',
    'idempotent_replay', false
  );
end;
$$;

comment on function public.manually_verify_line_order_payment(uuid, numeric, text, text, text, boolean) is
  'Atomically records an owner-verified bank deposit and confirms a LINE order after provider failure; server API enforces admin authorization.';
revoke all on function public.manually_verify_line_order_payment(uuid, numeric, text, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.manually_verify_line_order_payment(uuid, numeric, text, text, text, boolean)
  to service_role;
