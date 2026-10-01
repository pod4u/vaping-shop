-- Keep optional admin-supplied slip evidence private. A slip is not proof of a bank deposit.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('manual-payment-slips', 'manual-payment-slips', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

alter table public.order_payment_requests
  add column manual_slip_path text;

alter table public.order_payment_requests
  add constraint order_payment_requests_manual_slip_path_check
  check (manual_slip_path is null or (
    verification_method = 'manual_bank'
    and status = 'verified'
    and char_length(manual_slip_path) <= 120
    and left(manual_slip_path, 37) = order_id::text || '/'
  ));

create function public.manually_verify_line_order_payment_with_slip(
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
  v_result jsonb;
begin
  if p_slip_path is not null and (
    char_length(p_slip_path) > 120
    or left(p_slip_path, 37) <> p_order_id::text || '/'
    or p_slip_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}[.](jpg|png|webp)$'
  ) then
    raise exception 'invalid slip evidence path' using errcode = '22023';
  end if;

  -- Same transaction: if recording the path fails, the bank approval rolls back.
  v_result := public.manually_verify_line_order_payment(
    p_order_id, p_amount, p_bank_reference, p_note, p_verified_by, p_bank_deposit_confirmed
  );
  if p_slip_path is not null and coalesce((v_result ->> 'idempotent_replay')::boolean, false) is false then
    update public.order_payment_requests
    set manual_slip_path = p_slip_path
    where order_id = p_order_id and verification_method = 'manual_bank' and status = 'verified';
  end if;
  return v_result;
end;
$$;

comment on function public.manually_verify_line_order_payment_with_slip(uuid, numeric, text, text, text, boolean, text) is
  'Manually verifies a bank deposit and atomically records an optional private slip-evidence path. A slip alone never verifies payment.';
revoke all on function public.manually_verify_line_order_payment_with_slip(uuid, numeric, text, text, text, boolean, text)
  from public, anon, authenticated;
grant execute on function public.manually_verify_line_order_payment_with_slip(uuid, numeric, text, text, text, boolean, text)
  to service_role;
