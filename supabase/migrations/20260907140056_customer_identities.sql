create table public.customer_identities (
  id uuid primary key default gen_random_uuid(),
  customer_id integer not null,
  provider text not null,
  provider_account_id text not null,
  provider_user_id text not null,
  status text not null default 'pending',
  verified_at timestamp with time zone,
  verified_by text,
  revoked_at timestamp with time zone,
  provider_metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint customer_identities_customer_id_fkey
    foreign key (customer_id)
    references public.customers (id)
    on delete restrict,
  constraint customer_identities_provider_not_blank_check
    check (btrim(provider) <> ''),
  constraint customer_identities_provider_account_id_not_blank_check
    check (btrim(provider_account_id) <> ''),
  constraint customer_identities_provider_user_id_not_blank_check
    check (btrim(provider_user_id) <> ''),
  constraint customer_identities_verified_by_not_blank_check
    check (verified_by is null or btrim(verified_by) <> ''),
  constraint customer_identities_status_check
    check (status in ('pending', 'verified', 'revoked')),
  constraint customer_identities_lifecycle_check
    check (
      (status = 'pending' and verified_at is null and verified_by is null and revoked_at is null)
      or
      (status = 'verified' and verified_at is not null and verified_by is not null and revoked_at is null)
      or
      (status = 'revoked' and revoked_at is not null)
    ),
  constraint customer_identities_provider_identity_key
    unique (provider, provider_account_id, provider_user_id)
);

comment on table public.customer_identities is
  'Server-managed links between internal customers and external provider identities.';

comment on column public.customer_identities.provider_account_id is
  'Stable identifier for the provider account or channel, such as a LINE OA channel ID.';

comment on column public.customer_identities.provider_user_id is
  'Provider-scoped user identifier; do not treat it as a global customer identifier.';

create index customer_identities_customer_id_idx
  on public.customer_identities (customer_id);

create index customer_identities_status_idx
  on public.customer_identities (status);

create index customer_identities_pending_created_at_idx
  on public.customer_identities (created_at)
  where status = 'pending';

create trigger customer_identities_set_updated_at
before update on public.customer_identities
for each row
execute function public.set_updated_at();

alter table public.customer_identities enable row level security;

revoke all on table public.customer_identities from public, anon, authenticated;
grant all on table public.customer_identities to service_role;
