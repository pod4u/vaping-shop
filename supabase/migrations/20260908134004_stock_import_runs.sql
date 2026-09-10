-- Batch 7A: Cron monitoring table for stock import runs
-- Records cron and manual executions without storing sensitive data

create table public.stock_import_runs (
  id uuid primary key default gen_random_uuid(),
  trigger_type text not null,
  status text not null default 'running',
  batch_id uuid,
  started_at timestamp with time zone not null default now(),
  finished_at timestamp with time zone,
  rows_read integer not null default 0,
  valid_count integer not null default 0,
  invalid_count integer not null default 0,
  changed_count integer not null default 0,
  auto_apply_enabled boolean not null default false,
  applied boolean not null default false,
  error_code text,
  safe_message text,
  created_at timestamp with time zone not null default now(),

  constraint stock_import_runs_trigger_type_check
    check (trigger_type in ('cron', 'manual')),
  constraint stock_import_runs_status_check
    check (status in ('running', 'success', 'review_required', 'failed', 'skipped')),
  constraint stock_import_runs_batch_id_fkey
    foreign key (batch_id) references public.stock_import_batches(id) on delete set null,
  constraint stock_import_runs_finished_lifecycle_check
    check (
      (status in ('success', 'review_required', 'failed', 'skipped') and finished_at is not null)
      or (status = 'running' and finished_at is null)
    ),
  constraint stock_import_runs_counts_check
    check (
      rows_read >= 0 and valid_count >= 0 and invalid_count >= 0 and changed_count >= 0
      and rows_read >= valid_count + invalid_count
      and changed_count <= valid_count
    ),
  constraint stock_import_runs_error_lifecycle_check
    check (
      (status = 'running' and error_code is null and safe_message is null)
      or (status = 'success' and error_code is null)
      or (status = 'skipped' and error_code is null)
      or (status in ('review_required', 'failed') and error_code is not null)
    ),
  constraint stock_import_runs_applied_consistency_check
    check (
      (applied = false)
      or (applied = true and status = 'success' and batch_id is not null)
    ),
  constraint stock_import_runs_error_code_check
    check (error_code is null or (btrim(error_code) <> '' and char_length(error_code) <= 100)),
  constraint stock_import_runs_safe_message_check
    check (safe_message is null or (btrim(safe_message) <> '' and char_length(safe_message) <= 500))
);

-- Indexes for common query patterns
create index stock_import_runs_started_at_idx
  on public.stock_import_runs (started_at desc);
create index stock_import_runs_status_idx
  on public.stock_import_runs (status);
create index stock_import_runs_batch_id_idx
  on public.stock_import_runs (batch_id)
  where batch_id is not null;

-- Enable RLS
alter table public.stock_import_runs enable row level security;

-- Deny access to public, anon, and authenticated roles
revoke all on table public.stock_import_runs from public, anon, authenticated, service_role;

-- Grant minimum required permissions to service_role only
grant select, insert, update on table public.stock_import_runs to service_role;

-- Comments for documentation
comment on table public.stock_import_runs is
  'Monitoring records for stock import executions. Stores operational metrics only; never stores spreadsheet contents, credentials, access tokens, stack traces, or customer data.';
comment on column public.stock_import_runs.trigger_type is
  'Source of execution: cron for scheduled runs, manual for admin-triggered runs.';
comment on column public.stock_import_runs.status is
  'Execution outcome: running (in progress), success (completed normally), review_required (needs admin attention), failed (unexpected error), skipped (no new work).';
comment on column public.stock_import_runs.batch_id is
  'Link to the import batch when one was created during execution.';
comment on column public.stock_import_runs.applied is
  'True only when stock was successfully applied. Requires status = success and batch_id present.';
comment on column public.stock_import_runs.error_code is
  'Sanitized error code for troubleshooting. Required for review_required and failed statuses. Never contains raw exception messages, credentials, or external response bodies.';
comment on column public.stock_import_runs.safe_message is
  'Short sanitized operational message. Max 500 characters; never contains sensitive data. Allowed for all non-running statuses.';
