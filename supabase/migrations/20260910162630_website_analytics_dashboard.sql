-- Aggregate website telemetry only. Never store tokens, IPs, or customer identities.
create table public.website_analytics_snapshots (
  source text not null check (source in ('google', 'vercel', 'health')),
  scope_key text not null,
  period_days integer not null check (period_days in (0, 7, 28)),
  fetched_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (source, scope_key, period_days)
);

create table public.website_analytics_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'partial', 'error')),
  outcomes jsonb not null default '[]'::jsonb
);
create index website_analytics_runs_started_at_idx on public.website_analytics_runs (started_at desc);

alter table public.website_analytics_snapshots enable row level security;
alter table public.website_analytics_runs enable row level security;
revoke all on public.website_analytics_snapshots, public.website_analytics_runs from public, anon, authenticated;
grant select, insert, update, delete on public.website_analytics_snapshots, public.website_analytics_runs to service_role;

-- A transaction-scoped lock prevents duplicate syncs across serverless instances.
-- SECURITY INVOKER plus service_role-only execution preserves the privilege boundary.
create function public.acquire_website_analytics_sync()
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  run_id uuid;
begin
  if not pg_try_advisory_xact_lock(491073021) then return null; end if;
  if exists (
    select 1 from public.website_analytics_runs
    where started_at > now() - interval '60 seconds'
      or (status = 'running' and started_at > now() - interval '2 minutes')
  ) then return null; end if;
  update public.website_analytics_runs
    set status = 'error', finished_at = now(),
        outcomes = '[{"source":"health","days":0,"status":"error","message":"งานซิงก์ครั้งก่อนหมดเวลา กรุณาซิงก์ใหม่"}]'::jsonb
    where status = 'running' and started_at <= now() - interval '2 minutes';
  insert into public.website_analytics_runs default values returning id into run_id;
  return run_id;
end;
$$;
revoke all on function public.acquire_website_analytics_sync() from public, anon, authenticated;
grant execute on function public.acquire_website_analytics_sync() to service_role;

comment on table public.website_analytics_snapshots is 'Latest successful aggregate report per source, scope and period; failed syncs never overwrite it.';
comment on table public.website_analytics_runs is 'Sanitized sync results; application prunes completed runs older than 90 days.';
