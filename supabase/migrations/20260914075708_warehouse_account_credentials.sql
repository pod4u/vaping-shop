-- Credentials managed from the admin panel. Only the server-side service role
-- can access this table; passwords are stored as one-way scrypt digests.
create table public.warehouse_accounts (
  id text primary key,
  username text not null unique,
  display_name text not null,
  password_digest text not null,
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint warehouse_accounts_id_check
    check (id ~ '^[a-z0-9._-]{3,100}$'),
  constraint warehouse_accounts_username_check
    check (username = lower(username) and username ~ '^[a-z0-9._-]{3,50}$'),
  constraint warehouse_accounts_display_name_check
    check (char_length(display_name) between 1 and 100),
  constraint warehouse_accounts_password_digest_check
    check (char_length(password_digest) between 80 and 500),
  constraint warehouse_accounts_updated_by_check
    check (char_length(updated_by) between 1 and 150)
);

alter table public.warehouse_accounts enable row level security;
revoke all on table public.warehouse_accounts from public, anon, authenticated;
grant select, insert, update on table public.warehouse_accounts to service_role;

comment on table public.warehouse_accounts is
  'Warehouse login credentials managed by authorized admins. Contains one-way password digests only.';
