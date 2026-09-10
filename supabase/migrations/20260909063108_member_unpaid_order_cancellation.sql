create function public.cancel_member_unpaid_order(
  p_order_id uuid,
  p_customer_id integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_result jsonb;
begin
  if p_order_id is null or p_customer_id is null or p_customer_id <= 0 then
    raise exception 'invalid member cancellation input' using errcode = '22023';
  end if;

  select *
  into v_order
  from public.orders
  where id = p_order_id
    and customer_id = p_customer_id
  for update;

  if not found then
    raise exception 'order not found for customer' using errcode = 'P0002';
  end if;

  if v_order.status = 'cancelled' then
    return jsonb_build_object(
      'order_id', p_order_id,
      'status', 'cancelled',
      'idempotent_replay', true,
      'stock_restored', false
    );
  end if;

  if v_order.status not in ('draft', 'pending') then
    raise exception 'only unpaid orders can be cancelled by a member'
      using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.order_payment_requests
    where order_id = p_order_id
      and status = 'verified'
  ) then
    raise exception 'verified payment cannot be cancelled by a member'
      using errcode = '55000';
  end if;

  select public.cancel_order(
    p_order_id,
    'member:' || p_customer_id::text
  ) into v_result;

  return v_result;
end;
$$;

comment on function public.cancel_member_unpaid_order(uuid, integer) is
  'Atomically lets a verified member cancel only their own draft or pending unpaid order. Active reservations and payment requests are released by the existing cancellation workflow.';

revoke all on function public.cancel_member_unpaid_order(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.cancel_member_unpaid_order(uuid, integer)
  to service_role;
