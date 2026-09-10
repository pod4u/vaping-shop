create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id integer not null,
  recipient_name text not null,
  phone text not null,
  address text not null,
  province text not null,
  postal_code text,
  is_default boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint customer_addresses_customer_id_fkey
    foreign key (customer_id)
    references public.customers (id)
    on delete cascade,
  constraint customer_addresses_recipient_name_not_blank_check
    check (btrim(recipient_name) <> ''),
  constraint customer_addresses_phone_not_blank_check
    check (btrim(phone) <> ''),
  constraint customer_addresses_address_not_blank_check
    check (btrim(address) <> ''),
  constraint customer_addresses_province_not_blank_check
    check (btrim(province) <> ''),
  constraint customer_addresses_postal_code_not_blank_check
    check (postal_code is null or btrim(postal_code) <> '')
);

comment on table public.customer_addresses is
  'Server-managed customer shipping addresses containing personally identifiable information.';

comment on column public.customer_addresses.is_default is
  'At most one row per customer may be marked as the default address.';

create index customer_addresses_customer_id_idx
  on public.customer_addresses (customer_id);

create unique index customer_addresses_one_default_per_customer_idx
  on public.customer_addresses (customer_id)
  where is_default;

create trigger customer_addresses_set_updated_at
before update on public.customer_addresses
for each row
execute function public.set_updated_at();

alter table public.customer_addresses enable row level security;

revoke all on table public.customer_addresses from public, anon, authenticated;
grant select, insert, update, delete on table public.customer_addresses to service_role;
