-- New shipment transitions no longer require a carrier or tracking number.
-- The legacy four-argument functions remain in place temporarily so an older
-- deployment cannot break while this migration and the application roll out.

create function public.mark_order_shipped(
  p_order_id uuid,
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
    or p_shipped_by is null
    or btrim(p_shipped_by) = ''
    or char_length(p_shipped_by) > 200
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

  if v_order.status = 'shipped' then
    return jsonb_build_object(
      'order_id', p_order_id,
      'status', 'shipped',
      'idempotent_replay', true
    );
  end if;

  if v_order.status <> 'confirmed' then
    raise exception 'only confirmed orders can be shipped' using errcode = '55000';
  end if;

  update public.orders
  set
    status = 'shipped',
    carrier = null,
    tracking_number = null,
    shipped_at = now(),
    shipped_by = btrim(p_shipped_by)
  where id = p_order_id;

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', 'shipped',
    'idempotent_replay', false
  );
end;
$$;

revoke all on function public.mark_order_shipped(uuid, text)
  from public, anon, authenticated;
grant execute on function public.mark_order_shipped(uuid, text) to service_role;

comment on function public.mark_order_shipped(uuid, text) is
  'Atomically marks a confirmed order as shipped without requiring carrier or tracking data.';

create function public.mark_warehouse_order_shipped(
  p_order_id uuid,
  p_actor text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_job public.warehouse_fulfillments%rowtype;
  v_result jsonb;
begin
  select * into v_job
  from public.warehouse_fulfillments
  where order_id = p_order_id
  for update;

  if not found then
    raise exception 'warehouse fulfillment not found' using errcode = 'P0002';
  end if;

  if v_job.status = 'shipped' then
    select public.mark_order_shipped(p_order_id, p_actor) into v_result;
    return v_result;
  end if;

  if v_job.status <> 'packed' then
    raise exception 'fulfillment must be packed before shipping' using errcode = '55000';
  end if;

  select public.mark_order_shipped(p_order_id, p_actor) into v_result;
  return v_result;
end;
$$;

revoke all on function public.mark_warehouse_order_shipped(uuid, text)
  from public, anon, authenticated;
grant execute on function public.mark_warehouse_order_shipped(uuid, text) to service_role;

comment on function public.mark_warehouse_order_shipped(uuid, text) is
  'Marks a packed warehouse job as shipped without carrier or tracking input.';
