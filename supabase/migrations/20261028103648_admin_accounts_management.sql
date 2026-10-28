create table public.admin_accounts (
  id text primary key,
  username text not null unique,
  display_name text not null,
  password_digest text not null,
  role text not null,
  active boolean not null default true,
  created_by text not null,
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz,
  constraint admin_accounts_id_check
    check (id ~ '^[0-9a-f-]{36}$'),
  constraint admin_accounts_username_check
    check (username ~ '^[a-z0-9._-]{3,50}$'),
  constraint admin_accounts_display_name_check
    check (char_length(btrim(display_name)) between 2 and 80),
  constraint admin_accounts_password_digest_check
    check (password_digest ~ '^scrypt-v1:'),
  constraint admin_accounts_role_check
    check (role in ('owner', 'manager', 'order_staff', 'support', 'stock_staff')),
  constraint admin_accounts_created_by_check
    check (char_length(btrim(created_by)) between 1 and 120),
  constraint admin_accounts_updated_by_check
    check (char_length(btrim(updated_by)) between 1 and 120)
);

create index admin_accounts_active_role_idx
  on public.admin_accounts (active, role);

alter table public.admin_accounts enable row level security;

revoke all on table public.admin_accounts from public, anon, authenticated;
grant select, insert, update on table public.admin_accounts to service_role;

comment on table public.admin_accounts is
  'Private admin login accounts. Server/service_role access only; password values are stored as salted scrypt digests.';

comment on column public.admin_accounts.password_digest is
  'Salted scrypt digest. Never return this column from an API response.';
