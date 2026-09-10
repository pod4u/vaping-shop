create table public.stock_import_batches (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_reference text not null,
  source_checksum text not null,
  status text not null default 'processing',
  row_count integer not null default 0,
  valid_count integer not null default 0,
  invalid_count integer not null default 0,
  changed_count integer not null default 0,
  created_by text not null,
  created_at timestamp with time zone not null default now(),
  applied_by text,
  applied_at timestamp with time zone,
  constraint stock_import_batches_source_check
    check (source in ('google_sheet', 'manual_upload')),
  constraint stock_import_batches_source_reference_check
    check (btrim(source_reference) <> '' and char_length(source_reference) <= 500),
  constraint stock_import_batches_checksum_check
    check (source_checksum ~ '^[0-9a-f]{64}$'),
  constraint stock_import_batches_status_check
    check (status in ('processing', 'ready', 'validation_failed', 'applied')),
  constraint stock_import_batches_counts_check
    check (
      row_count >= 0 and valid_count >= 0 and invalid_count >= 0 and changed_count >= 0
      and row_count = valid_count + invalid_count
      and changed_count <= valid_count
    ),
  constraint stock_import_batches_created_by_check
    check (btrim(created_by) <> '' and char_length(created_by) <= 200),
  constraint stock_import_batches_applied_lifecycle_check
    check (
      (status = 'applied' and applied_by is not null and applied_at is not null)
      or (status <> 'applied' and applied_by is null and applied_at is null)
    ),
  constraint stock_import_batches_source_checksum_key unique (source, source_checksum)
);

create table public.stock_import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null,
  row_number integer not null,
  raw_sku text,
  normalized_sku text,
  requested_quantity integer,
  product_flavor_id uuid,
  previous_quantity integer,
  quantity_delta integer,
  validation_status text not null,
  error_code text,
  error_message text,
  created_at timestamp with time zone not null default now(),
  constraint stock_import_rows_batch_id_fkey
    foreign key (batch_id) references public.stock_import_batches(id) on delete cascade,
  constraint stock_import_rows_product_flavor_id_fkey
    foreign key (product_flavor_id) references public.product_flavors(id) on delete restrict,
  constraint stock_import_rows_row_number_check check (row_number > 0),
  constraint stock_import_rows_quantity_check
    check (requested_quantity is null or requested_quantity between 0 and 1000000),
  constraint stock_import_rows_previous_quantity_check
    check (previous_quantity is null or previous_quantity >= 0),
  constraint stock_import_rows_status_check check (validation_status in ('valid', 'error')),
  constraint stock_import_rows_error_lifecycle_check
    check (
      (validation_status = 'valid'
        and error_code is null and error_message is null
        and product_flavor_id is not null and requested_quantity is not null
        and previous_quantity is not null and quantity_delta is not null)
      or
      (validation_status = 'error'
        and error_code is not null and error_message is not null)
    ),
  constraint stock_import_rows_batch_row_key unique (batch_id, row_number)
);

create index stock_import_batches_created_at_idx
  on public.stock_import_batches (created_at desc);
create index stock_import_batches_status_created_at_idx
  on public.stock_import_batches (status, created_at desc);
create index stock_import_rows_batch_status_idx
  on public.stock_import_rows (batch_id, validation_status, row_number);
create index stock_import_rows_product_flavor_id_idx
  on public.stock_import_rows (product_flavor_id)
  where product_flavor_id is not null;

alter table public.stock_import_batches enable row level security;
alter table public.stock_import_rows enable row level security;

revoke all on table public.stock_import_batches from public, anon, authenticated, service_role;
revoke all on table public.stock_import_rows from public, anon, authenticated, service_role;
grant select, insert, update on table public.stock_import_batches to service_role;
grant select, insert on table public.stock_import_rows to service_role;

alter table public.stock_ledger
  add column stock_import_batch_id uuid,
  add constraint stock_ledger_stock_import_batch_id_fkey
    foreign key (stock_import_batch_id)
    references public.stock_import_batches(id)
    on delete restrict,
  add constraint stock_ledger_import_reference_check
    check (
      action <> 'stock_import'
      or (
        stock_import_batch_id is not null
        and order_id is null
        and order_item_id is null
        and reservation_id is null
      )
    );

create unique index stock_ledger_import_batch_variant_key
  on public.stock_ledger (stock_import_batch_id, product_flavor_id)
  where action = 'stock_import';

create function public.stage_stock_import(
  p_source text,
  p_source_reference text,
  p_source_checksum text,
  p_rows jsonb,
  p_created_by text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_batch_id uuid;
  v_existing public.stock_import_batches%rowtype;
  v_row_count integer;
  v_valid_count integer;
  v_invalid_count integer;
  v_changed_count integer;
begin
  if p_source not in ('google_sheet', 'manual_upload')
    or p_source_reference is null or btrim(p_source_reference) = '' or char_length(p_source_reference) > 500
    or p_source_checksum is null or p_source_checksum !~ '^[0-9a-f]{64}$'
    or p_created_by is null or btrim(p_created_by) = '' or char_length(p_created_by) > 200
    or p_rows is null or jsonb_typeof(p_rows) <> 'array'
    or jsonb_array_length(p_rows) < 1 or jsonb_array_length(p_rows) > 5000
  then
    raise exception 'invalid stock import input' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_source || ':' || p_source_checksum, 0)
  );

  select * into v_existing
  from public.stock_import_batches
  where source = p_source and source_checksum = p_source_checksum;

  if found then
    return jsonb_build_object(
      'batch_id', v_existing.id,
      'status', v_existing.status,
      'row_count', v_existing.row_count,
      'valid_count', v_existing.valid_count,
      'invalid_count', v_existing.invalid_count,
      'changed_count', v_existing.changed_count,
      'idempotent_replay', true
    );
  end if;

  insert into public.stock_import_batches (
    source, source_reference, source_checksum, status, created_by
  ) values (
    p_source, btrim(p_source_reference), p_source_checksum, 'processing', btrim(p_created_by)
  ) returning id into v_batch_id;

  with input_rows as (
    select row_data, ordinality::integer as row_number
    from jsonb_array_elements(p_rows) with ordinality as input(row_data, ordinality)
  ), normalized as (
    select
      row_number,
      case when jsonb_typeof(row_data) = 'object' then row_data ->> 'sku' end as raw_sku,
      case
        when jsonb_typeof(row_data) = 'object' and jsonb_typeof(row_data -> 'sku') = 'string'
          then upper(btrim(row_data ->> 'sku'))
      end as normalized_sku,
      case
        when jsonb_typeof(row_data) = 'object'
          and jsonb_typeof(row_data -> 'stock_quantity') = 'number'
          and (row_data ->> 'stock_quantity') ~ '^[0-9]+$'
          and char_length(row_data ->> 'stock_quantity') <= 7
          and (row_data ->> 'stock_quantity')::numeric <= 1000000
        then (row_data ->> 'stock_quantity')::integer
      end as requested_quantity
    from input_rows
  ), counted as (
    select
      normalized.*,
      count(*) filter (where normalized_sku is not null and normalized_sku <> '')
        over (partition by normalized_sku) as duplicate_count
    from normalized
  )
  insert into public.stock_import_rows (
    batch_id, row_number, raw_sku, normalized_sku, requested_quantity,
    product_flavor_id, previous_quantity, quantity_delta,
    validation_status, error_code, error_message
  )
  select
    v_batch_id,
    counted.row_number,
    left(counted.raw_sku, 500),
    left(counted.normalized_sku, 500),
    counted.requested_quantity,
    case when counted.duplicate_count = 1 then product_flavors.id end,
    case when counted.duplicate_count = 1 then product_flavors.stock_quantity end,
    case
      when counted.duplicate_count = 1
        and product_flavors.id is not null
        and counted.requested_quantity is not null
      then counted.requested_quantity - product_flavors.stock_quantity
    end,
    case
      when counted.normalized_sku is null or counted.normalized_sku = '' or char_length(counted.normalized_sku) > 200 then 'error'
      when counted.requested_quantity is null then 'error'
      when counted.duplicate_count > 1 then 'error'
      when product_flavors.id is null then 'error'
      else 'valid'
    end,
    case
      when counted.normalized_sku is null or counted.normalized_sku = '' or char_length(counted.normalized_sku) > 200 then 'invalid_sku'
      when counted.requested_quantity is null then 'invalid_quantity'
      when counted.duplicate_count > 1 then 'duplicate_sku'
      when product_flavors.id is null then 'sku_not_found'
    end,
    case
      when counted.normalized_sku is null or counted.normalized_sku = '' or char_length(counted.normalized_sku) > 200 then 'SKU ว่างหรือยาวเกินกำหนด'
      when counted.requested_quantity is null then 'จำนวนคงเหลือต้องเป็นจำนวนเต็มตั้งแต่ 0 ถึง 1,000,000'
      when counted.duplicate_count > 1 then 'พบ SKU ซ้ำในไฟล์เดียวกัน'
      when product_flavors.id is null then 'ไม่พบ SKU นี้ในแคตตาล็อก'
    end
  from counted
  left join public.product_flavors
    on upper(product_flavors.sku) = counted.normalized_sku;

  select
    count(*)::integer,
    count(*) filter (where validation_status = 'valid')::integer,
    count(*) filter (where validation_status = 'error')::integer,
    count(*) filter (where validation_status = 'valid' and quantity_delta <> 0)::integer
  into v_row_count, v_valid_count, v_invalid_count, v_changed_count
  from public.stock_import_rows
  where batch_id = v_batch_id;

  update public.stock_import_batches
  set
    status = case when v_invalid_count = 0 then 'ready' else 'validation_failed' end,
    row_count = v_row_count,
    valid_count = v_valid_count,
    invalid_count = v_invalid_count,
    changed_count = v_changed_count
  where id = v_batch_id;

  return jsonb_build_object(
    'batch_id', v_batch_id,
    'status', case when v_invalid_count = 0 then 'ready' else 'validation_failed' end,
    'row_count', v_row_count,
    'valid_count', v_valid_count,
    'invalid_count', v_invalid_count,
    'changed_count', v_changed_count,
    'idempotent_replay', false
  );
end;
$$;

create function public.apply_stock_import(
  p_batch_id uuid,
  p_applied_by text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_batch public.stock_import_batches%rowtype;
  v_applied_count integer;
begin
  if p_batch_id is null
    or p_applied_by is null or btrim(p_applied_by) = '' or char_length(p_applied_by) > 200
  then
    raise exception 'invalid stock import apply input' using errcode = '22023';
  end if;

  select * into v_batch
  from public.stock_import_batches
  where id = p_batch_id
  for update;

  if not found then
    raise exception 'stock import batch not found' using errcode = 'P0002';
  end if;

  if v_batch.status = 'applied' then
    return jsonb_build_object(
      'batch_id', p_batch_id,
      'status', 'applied',
      'applied_count', v_batch.changed_count,
      'idempotent_replay', true
    );
  end if;

  if v_batch.status <> 'ready' or v_batch.invalid_count <> 0 or v_batch.row_count < 1 then
    raise exception 'stock import batch is not ready' using errcode = '55000';
  end if;

  perform 1
  from public.product_flavors
  join public.stock_import_rows
    on stock_import_rows.product_flavor_id = product_flavors.id
  where stock_import_rows.batch_id = p_batch_id
    and stock_import_rows.validation_status = 'valid'
  order by product_flavors.id
  for update of product_flavors;

  if exists (
    select 1
    from public.stock_import_rows
    join public.product_flavors
      on product_flavors.id = stock_import_rows.product_flavor_id
    where stock_import_rows.batch_id = p_batch_id
      and stock_import_rows.validation_status = 'valid'
      and product_flavors.stock_quantity <> stock_import_rows.previous_quantity
  ) then
    raise exception 'stock changed after import staging' using errcode = '40001';
  end if;

  with changed_rows as (
    select
      stock_import_rows.product_flavor_id,
      stock_import_rows.previous_quantity,
      stock_import_rows.requested_quantity,
      stock_import_rows.quantity_delta
    from public.stock_import_rows
    where stock_import_rows.batch_id = p_batch_id
      and stock_import_rows.validation_status = 'valid'
      and stock_import_rows.quantity_delta <> 0
  ), updated_stock as (
    update public.product_flavors
    set
      stock_quantity = changed_rows.requested_quantity,
      is_available = case
        when changed_rows.requested_quantity = 0 then false
        when product_flavors.stock_quantity = 0 and product_flavors.is_active is true then true
        else product_flavors.is_available
      end,
      updated_at = now()
    from changed_rows
    where product_flavors.id = changed_rows.product_flavor_id
    returning
      product_flavors.id,
      changed_rows.previous_quantity,
      changed_rows.requested_quantity,
      changed_rows.quantity_delta
  )
  insert into public.stock_ledger (
    product_flavor_id, stock_import_batch_id, action, quantity_delta,
    previous_quantity, new_quantity, created_by
  )
  select
    updated_stock.id, p_batch_id, 'stock_import', updated_stock.quantity_delta,
    updated_stock.previous_quantity, updated_stock.requested_quantity, btrim(p_applied_by)
  from updated_stock;

  get diagnostics v_applied_count = row_count;

  if v_applied_count <> v_batch.changed_count then
    raise exception 'stock import update count mismatch' using errcode = '55000';
  end if;

  update public.stock_import_batches
  set status = 'applied', applied_by = btrim(p_applied_by), applied_at = now()
  where id = p_batch_id;

  return jsonb_build_object(
    'batch_id', p_batch_id,
    'status', 'applied',
    'applied_count', v_applied_count,
    'idempotent_replay', false
  );
end;
$$;

comment on table public.stock_import_batches is
  'Server-only staging batches for stock snapshots. A batch never changes live stock until apply_stock_import succeeds.';
comment on table public.stock_import_rows is
  'Validated per-row stock snapshot staging with catalog match, previous quantity, delta, and explicit error reason.';
comment on function public.stage_stock_import(text, text, text, jsonb, text) is
  'Idempotently stages and validates a canonical SKU/stock quantity snapshot without changing live inventory.';
comment on function public.apply_stock_import(uuid, text) is
  'Atomically applies a fully valid, non-stale stock import and appends one stock_import ledger row per changed variant.';

revoke all on function public.stage_stock_import(text, text, text, jsonb, text)
  from public, anon, authenticated;
revoke all on function public.apply_stock_import(uuid, text)
  from public, anon, authenticated;
grant execute on function public.stage_stock_import(text, text, text, jsonb, text) to service_role;
grant execute on function public.apply_stock_import(uuid, text) to service_role;
