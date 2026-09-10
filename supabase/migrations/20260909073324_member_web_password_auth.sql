-- Password authentication for direct Pod4U member access.
create table public.member_auth_accounts (
  customer_id integer primary key,
  auth_user_id uuid not null unique,
  login_email text not null unique,
  password_set_at timestamp with time zone not null default now(),
  last_login_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint member_auth_accounts_customer_id_fkey
    foreign key (customer_id) references public.customers (id) on delete cascade,
  constraint member_auth_accounts_auth_user_id_fkey
    foreign key (auth_user_id) references auth.users (id) on delete cascade,
  constraint member_auth_accounts_login_email_check
    check (btrim(login_email) <> '' and char_length(login_email) <= 254)
);

comment on table public.member_auth_accounts is
  'Server-only mapping between Pod4U customer records and Supabase Auth password accounts. The internal login email is opaque and never customer-facing.';

create trigger member_auth_accounts_set_updated_at
before update on public.member_auth_accounts
for each row execute function public.set_updated_at();

alter table public.member_auth_accounts enable row level security;
revoke all on table public.member_auth_accounts from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.member_auth_accounts to service_role;
