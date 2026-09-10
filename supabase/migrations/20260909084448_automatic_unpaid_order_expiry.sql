create extension if not exists pg_cron with schema pg_catalog;

create function public.cancel_expired_unpaid_line_orders()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_cancelled_count integer := 0;
begin
  for v_order_id in
    select orders.id
    from public.orders
    join public.order_payment_requests
      on order_payment_requests.order_id = orders.id
    where orders.order_source = 'line'
      and orders.status = 'pending'
      and order_payment_requests.status = 'awaiting_slip'
      and order_payment_requests.expires_at <= now()
    order by order_payment_requests.expires_at
    for update of orders, order_payment_requests skip locked
  loop
    perform public.cancel_order(v_order_id, 'system:payment-timeout');

    update public.order_payment_requests
    set
      status = 'expired',
      failure_code = 'PAYMENT_WINDOW_EXPIRED'
    where order_id = v_order_id
      and status = 'cancelled';

    v_cancelled_count := v_cancelled_count + 1;
  end loop;

  return v_cancelled_count;
end;
$$;

comment on function public.cancel_expired_unpaid_line_orders() is
  'Cancels unpaid LINE orders after their payment window expires. Does not send LINE messages.';

revoke all on function public.cancel_expired_unpaid_line_orders() from public, anon, authenticated;
grant execute on function public.cancel_expired_unpaid_line_orders() to service_role;

select cron.schedule(
  'pod4u-cancel-expired-unpaid-orders',
  '*/5 * * * *',
  $job$select public.cancel_expired_unpaid_line_orders();$job$
);
