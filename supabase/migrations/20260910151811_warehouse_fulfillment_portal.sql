create table public.warehouse_fulfillments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  status text not null default 'ready_to_pack',
  assigned_to text,
  problem_code text,
  problem_note text,
  started_at timestamp with time zone,
  packed_at timestamp with time zone,
  shipped_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint warehouse_fulfillments_status_check
    check (status in ('ready_to_pack', 'packing', 'packed', 'shipped', 'problem', 'cancelled')),
  constraint warehouse_fulfillments_assigned_to_check
    check (assigned_to is null or (btrim(assigned_to) <> '' and char_length(assigned_to) <= 100)),
  constraint warehouse_fulfillments_problem_code_check
    check (problem_code is null or problem_code in ('item_missing', 'quantity_mismatch', 'damaged', 'address_unclear', 'shipping_unavailable', 'other')),
  constraint warehouse_fulfillments_problem_note_check
    check (problem_note is null or char_length(problem_note) <= 500)
);

create index warehouse_fulfillments_status_created_at_idx
  on public.warehouse_fulfillments(status, created_at desc);

alter table public.warehouse_fulfillments enable row level security;
revoke all on table public.warehouse_fulfillments from public, anon, authenticated;
grant select, insert, update on table public.warehouse_fulfillments to service_role;

comment on table public.warehouse_fulfillments is
  'Server-only warehouse work queue. Customer and payment access remains outside the warehouse portal.';

create function public.sync_warehouse_fulfillment_from_order()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'confirmed' then
    insert into public.warehouse_fulfillments(order_id, status)
    values (new.id, 'ready_to_pack')
    on conflict (order_id) do nothing;
  elsif new.status = 'shipped' then
    insert into public.warehouse_fulfillments(order_id, status, shipped_at)
    values (new.id, 'shipped', coalesce(new.shipped_at, now()))
    on conflict (order_id) do update
      set status = 'shipped', shipped_at = excluded.shipped_at, updated_at = now();
  elsif new.status = 'cancelled' then
    update public.warehouse_fulfillments
    set status = 'cancelled', updated_at = now()
    where order_id = new.id and status <> 'shipped';
  end if;
  return new;
end;
$$;

revoke all on function public.sync_warehouse_fulfillment_from_order() from public, anon, authenticated;

create trigger orders_sync_warehouse_fulfillment
after insert or update of status on public.orders
for each row execute function public.sync_warehouse_fulfillment_from_order();

insert into public.warehouse_fulfillments(order_id, status, shipped_at)
select
  id,
  case when status = 'shipped' then 'shipped' else 'ready_to_pack' end,
  shipped_at
from public.orders
where status in ('confirmed', 'shipped')
on conflict (order_id) do nothing;

create function public.update_warehouse_fulfillment(
  p_order_id uuid,
  p_action text,
  p_actor text,
  p_problem_code text default null,
  p_problem_note text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_job public.warehouse_fulfillments%rowtype;
  v_next_status text;
begin
  if p_order_id is null
    or p_actor is null or btrim(p_actor) = '' or char_length(p_actor) > 100
    or p_action not in ('start', 'pack', 'problem', 'resume')
  then
    raise exception 'invalid warehouse action' using errcode = '22023';
  end if;

  select * into v_job
  from public.warehouse_fulfillments
  where order_id = p_order_id
  for update;

  if not found then
    raise exception 'warehouse fulfillment not found' using errcode = 'P0002';
  end if;

  if p_action = 'start' then
    if v_job.status = 'packing' and v_job.assigned_to = btrim(p_actor) then
      return jsonb_build_object('order_id', p_order_id, 'status', v_job.status, 'idempotent_replay', true);
    end if;
    if v_job.status <> 'ready_to_pack' then
      raise exception 'fulfillment is not ready to pack' using errcode = '55000';
    end if;
    update public.warehouse_fulfillments
    set status = 'packing', assigned_to = btrim(p_actor), started_at = now(), updated_at = now()
    where id = v_job.id;
    v_next_status := 'packing';
  elsif p_action = 'pack' then
    if v_job.status = 'packed' then
      return jsonb_build_object('order_id', p_order_id, 'status', v_job.status, 'idempotent_replay', true);
    end if;
    if v_job.status <> 'packing' then
      raise exception 'fulfillment is not being packed' using errcode = '55000';
    end if;
    update public.warehouse_fulfillments
    set status = 'packed', packed_at = now(), updated_at = now()
    where id = v_job.id;
    v_next_status := 'packed';
  elsif p_action = 'problem' then
    if v_job.status not in ('ready_to_pack', 'packing', 'packed')
      or p_problem_code not in ('item_missing', 'quantity_mismatch', 'damaged', 'address_unclear', 'shipping_unavailable', 'other')
      or p_problem_note is null or btrim(p_problem_note) = '' or char_length(p_problem_note) > 500
    then
      raise exception 'invalid warehouse problem' using errcode = '22023';
    end if;
    update public.warehouse_fulfillments
    set status = 'problem', problem_code = p_problem_code, problem_note = btrim(p_problem_note), updated_at = now()
    where id = v_job.id;
    v_next_status := 'problem';
  else
    if v_job.status <> 'problem' then
      raise exception 'fulfillment does not have a problem' using errcode = '55000';
    end if;
    update public.warehouse_fulfillments
    set status = 'ready_to_pack', assigned_to = null, problem_code = null, problem_note = null,
        started_at = null, packed_at = null, updated_at = now()
    where id = v_job.id;
    v_next_status := 'ready_to_pack';
  end if;

  return jsonb_build_object('order_id', p_order_id, 'status', v_next_status, 'idempotent_replay', false);
end;
$$;

create function public.mark_warehouse_order_shipped(
  p_order_id uuid,
  p_carrier text,
  p_tracking_number text,
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
    select public.mark_order_shipped(p_order_id, p_carrier, p_tracking_number, p_actor) into v_result;
    return v_result;
  end if;

  if v_job.status <> 'packed' then
    raise exception 'fulfillment must be packed before shipping' using errcode = '55000';
  end if;

  select public.mark_order_shipped(p_order_id, p_carrier, p_tracking_number, p_actor) into v_result;
  return v_result;
end;
$$;

revoke all on function public.update_warehouse_fulfillment(uuid, text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.mark_warehouse_order_shipped(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.update_warehouse_fulfillment(uuid, text, text, text, text) to service_role;
grant execute on function public.mark_warehouse_order_shipped(uuid, text, text, text) to service_role;

comment on function public.update_warehouse_fulfillment(uuid, text, text, text, text) is
  'Moves a server-authorized warehouse job through pack/problem states with row locking and audit attribution.';
comment on function public.mark_warehouse_order_shipped(uuid, text, text, text) is
  'Allows shipment only after the warehouse job is packed, then reuses the canonical order shipment transition.';
