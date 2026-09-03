create extension if not exists pgcrypto;

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  name_th text,
  description text,
  color text,
  logo_url text,
  banner_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  name_th text not null,
  description text,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.flavors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  name_th text,
  color text,
  icon text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  product_key text not null unique,
  sku text unique,
  slug text not null unique,
  name text not null,
  name_th text,
  brand_id uuid not null references public.brands(id) on delete restrict,
  category_id uuid not null references public.categories(id) on delete restrict,
  description text,
  price numeric(10,2) not null check (price >= 0),
  sale_price numeric(10,2) check (sale_price is null or sale_price >= 0),
  puff_count integer check (puff_count is null or puff_count >= 0),
  image_url text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_flavors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  flavor_id uuid not null references public.flavors(id) on delete restrict,
  variant_key text not null unique,
  sku text not null unique,
  nicotine_level numeric(4,1) check (nicotine_level is null or nicotine_level >= 0),
  price numeric(10,2) not null check (price >= 0),
  sale_price numeric(10,2) check (sale_price is null or sale_price >= 0),
  image_path text not null,
  image_url text not null,
  image_alt_en text,
  image_alt_th text,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_available boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, flavor_id, nicotine_level)
);

create table if not exists public.product_aliases (
  id bigint generated always as identity primary key,
  product_flavor_id uuid not null references public.product_flavors(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  language text not null default 'mixed' check (language in ('en', 'th', 'mixed')),
  created_at timestamptz not null default now(),
  unique(product_flavor_id, normalized_alias)
);

create index if not exists idx_products_brand on public.products(brand_id);
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_active_category on public.products(category_id, sort_order) where is_active;
create index if not exists idx_product_flavors_product on public.product_flavors(product_id);
create index if not exists idx_product_flavors_flavor on public.product_flavors(flavor_id);
create index if not exists idx_product_flavors_available on public.product_flavors(product_id, sort_order) where is_active and is_available;
create index if not exists idx_product_aliases_normalized on public.product_aliases(normalized_alias);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists brands_set_updated_at on public.brands;
create trigger brands_set_updated_at before update on public.brands
for each row execute function public.set_updated_at();
drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at before update on public.categories
for each row execute function public.set_updated_at();
drop trigger if exists flavors_set_updated_at on public.flavors;
create trigger flavors_set_updated_at before update on public.flavors
for each row execute function public.set_updated_at();
drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();
drop trigger if exists product_flavors_set_updated_at on public.product_flavors;
create trigger product_flavors_set_updated_at before update on public.product_flavors
for each row execute function public.set_updated_at();

alter table public.brands enable row level security;
alter table public.categories enable row level security;
alter table public.flavors enable row level security;
alter table public.products enable row level security;
alter table public.product_flavors enable row level security;
alter table public.product_aliases enable row level security;

drop policy if exists "Public read active brands" on public.brands;
create policy "Public read active brands" on public.brands for select to anon, authenticated using (is_active);
drop policy if exists "Public read active categories" on public.categories;
create policy "Public read active categories" on public.categories for select to anon, authenticated using (is_active);
drop policy if exists "Public read active flavors" on public.flavors;
create policy "Public read active flavors" on public.flavors for select to anon, authenticated using (is_active);
drop policy if exists "Public read active products" on public.products;
create policy "Public read active products" on public.products for select to anon, authenticated using (is_active);
drop policy if exists "Public read active product flavors" on public.product_flavors;
create policy "Public read active product flavors" on public.product_flavors for select to anon, authenticated using (is_active);

grant usage on schema public to anon, authenticated, service_role;
grant select on public.brands, public.categories, public.flavors, public.products, public.product_flavors to anon, authenticated;
grant all on public.brands, public.categories, public.flavors, public.products, public.product_flavors, public.product_aliases to service_role;
grant usage, select on sequence public.product_aliases_id_seq to service_role;
revoke all on public.product_aliases from anon, authenticated;
drop policy if exists "Service role manages product aliases" on public.product_aliases;
create policy "Service role manages product aliases" on public.product_aliases
for all to service_role using (true) with check (true);
