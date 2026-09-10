-- Batch 10A Complete Rollback-Only Verification
-- Project: puslxgriozubqlpoxrqo
-- Uses EXACT DDL from migration 20260909124401_verified_order_reviews.sql
-- All synthetic data - no production records modified
-- All changes rolled back at the end

-- =====================================================
-- STORE TEST IDENTIFIERS
-- =====================================================

CREATE TEMP TABLE test_ids (
  customer1_id integer,
  customer2_id integer,
  customer1_phone text,
  customer2_phone text,
  order1_number text,
  order2_number text,
  order3_number text,
  order1_id uuid,
  order2_id uuid,
  order3_id uuid,
  review1_id uuid,
  review2_id uuid,
  credit1_id uuid
) ON COMMIT PRESERVE ROWS;

INSERT INTO test_ids (
  customer1_id,
  customer2_id,
  customer1_phone,
  customer2_phone,
  order1_number,
  order2_number,
  order3_number
)
SELECT
  -209091001,
  -209091002,
  'b10a-9f61a3c7e001',
  'b10a-9f61a3c7e002',
  'B10A-9f61a3c7-e001-4f10-a001-202609091001',
  'B10A-9f61a3c7-e002-4f10-a002-202609091002',
  'B10A-9f61a3c7-e003-4f10-a003-202609091003';

BEGIN;

-- Safe timeouts
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- =====================================================
-- EXACT MIGRATION DDL (verbatim from 20260909124401)
-- =====================================================

create table public.order_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique,
  customer_id integer not null,
  rating smallint not null,
  category text not null,
  review_text text not null,
  status text not null default 'pending',
  rejection_reason text,
  submitted_at timestamp with time zone not null default now(),
  moderated_at timestamp with time zone,
  moderated_by text,
  published_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint order_reviews_order_id_fkey
    foreign key (order_id)
    references public.orders (id)
    on delete restrict,
  constraint order_reviews_customer_id_fkey
    foreign key (customer_id)
    references public.customers (id)
    on delete restrict,
  constraint order_reviews_rating_check
    check (rating >= 1 and rating <= 5),
  constraint order_reviews_category_check
    check (category in ('product', 'delivery', 'service', 'overall')),
  constraint order_reviews_review_text_not_blank_check
    check (btrim(review_text) <> ''),
  constraint order_reviews_review_text_length_check
    check (char_length(btrim(review_text)) >= 10 and char_length(review_text) <= 2000),
  constraint order_reviews_status_check
    check (status in ('pending', 'approved', 'rejected')),
  constraint order_reviews_rejection_reason_check
    check (rejection_reason is null or (status = 'rejected' and btrim(rejection_reason) <> '')),
  constraint order_reviews_moderated_at_check
    check (
      (status = 'pending' and moderated_at is null and moderated_by is null)
      or (status in ('approved', 'rejected') and moderated_at is not null and moderated_by is not null)
    ),
  constraint order_reviews_published_at_check
    check (
      (status = 'approved' and published_at is not null)
      or (status in ('pending', 'rejected') and published_at is null)
    )
);

comment on table public.order_reviews is
  'Customer reviews for delivered orders. One review per order. Status: pending, approved, rejected.';

comment on column public.order_reviews.rating is
  'Customer rating from 1 (lowest) to 5 (highest).';

comment on column public.order_reviews.category is
  'Review category: product, delivery, service, or overall.';

comment on column public.order_reviews.status is
  'Moderation status: pending (awaiting review), approved (published), rejected (needs revision).';

comment on column public.order_reviews.rejection_reason is
  'Required when status is rejected. Customer-safe reason for rejection.';

create index order_reviews_customer_id_idx on public.order_reviews (customer_id);
create index order_reviews_status_idx on public.order_reviews (status);
create index order_reviews_category_idx on public.order_reviews (category);
create index order_reviews_submitted_at_idx on public.order_reviews (submitted_at desc);

create trigger order_reviews_set_updated_at
before update on public.order_reviews
for each row
execute function public.set_updated_at();

alter table public.order_reviews enable row level security;

revoke all on table public.order_reviews
  from public, anon, authenticated, service_role;
grant select, insert, update on table public.order_reviews
  to service_role;

create table public.customer_discount_credits (
  id uuid primary key default gen_random_uuid(),
  customer_id integer not null,
  source_type text not null,
  source_review_id uuid unique,
  amount numeric(12, 2) not null,
  status text not null default 'available',
  reserved_order_id uuid,
  redeemed_order_id uuid,
  created_at timestamp with time zone not null default now(),
  reserved_at timestamp with time zone,
  redeemed_at timestamp with time zone,
  voided_at timestamp with time zone,

  constraint customer_discount_credits_customer_id_fkey
    foreign key (customer_id)
    references public.customers (id)
    on delete restrict,
  constraint customer_discount_credits_source_review_id_fkey
    foreign key (source_review_id)
    references public.order_reviews (id)
    on delete restrict,
  constraint customer_discount_credits_reserved_order_id_fkey
    foreign key (reserved_order_id)
    references public.orders (id)
    on delete set null,
  constraint customer_discount_credits_redeemed_order_id_fkey
    foreign key (redeemed_order_id)
    references public.orders (id)
    on delete set null,
  constraint customer_discount_credits_source_type_check
    check (source_type in ('review_reward', 'promotion', 'manual', 'referral')),
  constraint customer_discount_credits_amount_check
    check (amount > 0),
  constraint customer_discount_credits_status_check
    check (status in ('available', 'reserved', 'redeemed', 'void')),
  constraint customer_discount_credits_review_source_check
    check (
      (source_type = 'review_reward' and source_review_id is not null)
      or (source_type <> 'review_reward' and source_review_id is null)
    ),
  constraint customer_discount_credits_status_transition_check
    check (
      (status = 'available' and reserved_order_id is null and redeemed_order_id is null and reserved_at is null and redeemed_at is null and voided_at is null)
      or (status = 'reserved' and reserved_order_id is not null and reserved_at is not null and redeemed_order_id is null and redeemed_at is null and voided_at is null)
      or (status = 'redeemed' and redeemed_order_id is not null and redeemed_at is not null and voided_at is null)
      or (status = 'void' and voided_at is not null)
    )
);

comment on table public.customer_discount_credits is
  'Discount credits issued to customers. Status: available, reserved, redeemed, void.';

comment on column public.customer_discount_credits.source_type is
  'Origin of the credit: review_reward (฿5 for approved review), promotion, manual, referral.';

comment on column public.customer_discount_credits.status is
  'available: ready to use, reserved: held for a pending order, redeemed: used, void: cancelled.';

create index customer_discount_credits_customer_id_idx on public.customer_discount_credits (customer_id);
create index customer_discount_credits_status_customer_id_idx on public.customer_discount_credits (status, customer_id);
create index customer_discount_credits_source_review_id_idx on public.customer_discount_credits (source_review_id)
  where source_review_id is not null;

alter table public.customer_discount_credits enable row level security;

revoke all on table public.customer_discount_credits
  from public, anon, authenticated, service_role;
grant select, insert, update on table public.customer_discount_credits
  to service_role;

create function public.submit_order_review(
  p_order_id uuid,
  p_customer_id integer,
  p_rating smallint,
  p_category text,
  p_review_text text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order_status text;
  v_order_customer_id integer;
  v_review_id uuid;
  v_existing_review_id uuid;
begin
  if p_order_id is null or p_customer_id is null then
    raise exception 'invalid review input' using errcode = '22023';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'rating must be between 1 and 5' using errcode = '22023';
  end if;

  if p_category is null or p_category not in ('product', 'delivery', 'service', 'overall') then
    raise exception 'invalid review category' using errcode = '22023';
  end if;

  if p_review_text is null or btrim(p_review_text) = '' or char_length(btrim(p_review_text)) < 10 or char_length(p_review_text) > 2000 then
    raise exception 'review text must be between 10 and 2000 characters' using errcode = '22023';
  end if;

  select status, customer_id
  into v_order_status, v_order_customer_id
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  if v_order_customer_id is distinct from p_customer_id then
    raise exception 'order does not belong to customer' using errcode = '42501';
  end if;

  if v_order_status is distinct from 'delivered' then
    raise exception 'only delivered orders can be reviewed' using errcode = '55000';
  end if;

  select id
  into v_existing_review_id
  from public.order_reviews
  where order_id = p_order_id;

  if found then
    return jsonb_build_object(
      'review_id', v_existing_review_id,
      'status', (select status from public.order_reviews where id = v_existing_review_id),
      'idempotent_replay', true
    );
  end if;

  insert into public.order_reviews (
    order_id,
    customer_id,
    rating,
    category,
    review_text,
    status,
    submitted_at
  ) values (
    p_order_id,
    p_customer_id,
    p_rating,
    p_category,
    btrim(p_review_text),
    'pending',
    now()
  )
  returning id into v_review_id;

  return jsonb_build_object(
    'review_id', v_review_id,
    'status', 'pending',
    'idempotent_replay', false
  );
end;
$$;

comment on function public.submit_order_review(uuid, integer, smallint, text, text) is
  'Atomically creates a review for a delivered order. Validates ownership, delivery status, and prevents duplicates.';

revoke all on function public.submit_order_review(uuid, integer, smallint, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_order_review(uuid, integer, smallint, text, text)
  to service_role;

create function public.update_rejected_review(
  p_order_id uuid,
  p_customer_id integer,
  p_rating smallint,
  p_category text,
  p_review_text text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_review_id uuid;
  v_review_status text;
  v_review_customer_id integer;
begin
  if p_order_id is null or p_customer_id is null then
    raise exception 'invalid review input' using errcode = '22023';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'rating must be between 1 and 5' using errcode = '22023';
  end if;

  if p_category is null or p_category not in ('product', 'delivery', 'service', 'overall') then
    raise exception 'invalid review category' using errcode = '22023';
  end if;

  if p_review_text is null or btrim(p_review_text) = '' or char_length(btrim(p_review_text)) < 10 or char_length(p_review_text) > 2000 then
    raise exception 'review text must be between 10 and 2000 characters' using errcode = '22023';
  end if;

  select id, status, customer_id
  into v_review_id, v_review_status, v_review_customer_id
  from public.order_reviews
  where order_id = p_order_id
  for update;

  if not found then
    raise exception 'review not found' using errcode = 'P0002';
  end if;

  if v_review_customer_id is distinct from p_customer_id then
    raise exception 'review does not belong to customer' using errcode = '42501';
  end if;

  if v_review_status is distinct from 'rejected' then
    raise exception 'only rejected reviews can be updated' using errcode = '55000';
  end if;

  update public.order_reviews
  set
    rating = p_rating,
    category = p_category,
    review_text = btrim(p_review_text),
    status = 'pending',
    rejection_reason = null,
    moderated_at = null,
    moderated_by = null,
    updated_at = now()
  where id = v_review_id;

  return jsonb_build_object(
    'review_id', v_review_id,
    'status', 'pending',
    'updated', true
  );
end;
$$;

comment on function public.update_rejected_review(uuid, integer, smallint, text, text) is
  'Updates a rejected review and resubmits it for moderation. Clears rejection reason.';

revoke all on function public.update_rejected_review(uuid, integer, smallint, text, text)
  from public, anon, authenticated;
grant execute on function public.update_rejected_review(uuid, integer, smallint, text, text)
  to service_role;

create function public.approve_order_review(
  p_review_id uuid,
  p_moderated_by text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_review record;
  v_credit_id uuid;
  v_existing_credit_id uuid;
begin
  if p_review_id is null or p_moderated_by is null or btrim(p_moderated_by) = '' then
    raise exception 'invalid approval input' using errcode = '22023';
  end if;

  select *
  into v_review
  from public.order_reviews
  where id = p_review_id
  for update;

  if not found then
    raise exception 'review not found' using errcode = 'P0002';
  end if;

  if v_review.status = 'approved' then
    select id
    into v_existing_credit_id
    from public.customer_discount_credits
    where source_review_id = p_review_id;

    return jsonb_build_object(
      'review_id', p_review_id,
      'status', 'approved',
      'credit_id', v_existing_credit_id,
      'idempotent_replay', true
    );
  end if;

  if v_review.status is distinct from 'pending' then
    raise exception 'only pending reviews can be approved' using errcode = '55000';
  end if;

  update public.order_reviews
  set
    status = 'approved',
    moderated_at = now(),
    moderated_by = btrim(p_moderated_by),
    published_at = now()
  where id = p_review_id;

  insert into public.customer_discount_credits (
    customer_id,
    source_type,
    source_review_id,
    amount,
    status,
    created_at
  ) values (
    v_review.customer_id,
    'review_reward',
    p_review_id,
    5.00,
    'available',
    now()
  )
  returning id into v_credit_id;

  return jsonb_build_object(
    'review_id', p_review_id,
    'status', 'approved',
    'credit_id', v_credit_id,
    'idempotent_replay', false
  );
end;
$$;

comment on function public.approve_order_review(uuid, text) is
  'Atomically approves a pending review and issues a ฿5 reward credit. Idempotent.';

revoke all on function public.approve_order_review(uuid, text)
  from public, anon, authenticated;
grant execute on function public.approve_order_review(uuid, text)
  to service_role;

create function public.reject_order_review(
  p_review_id uuid,
  p_moderated_by text,
  p_rejection_reason text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_review record;
begin
  if p_review_id is null or p_moderated_by is null or btrim(p_moderated_by) = '' then
    raise exception 'invalid rejection input' using errcode = '22023';
  end if;

  if p_rejection_reason is null or btrim(p_rejection_reason) = '' then
    raise exception 'rejection reason is required' using errcode = '22023';
  end if;

  if char_length(p_rejection_reason) > 500 then
    raise exception 'rejection reason too long' using errcode = '22023';
  end if;

  select *
  into v_review
  from public.order_reviews
  where id = p_review_id
  for update;

  if not found then
    raise exception 'review not found' using errcode = 'P0002';
  end if;

  if v_review.status = 'rejected' and v_review.rejection_reason = btrim(p_rejection_reason) then
    return jsonb_build_object(
      'review_id', p_review_id,
      'status', 'rejected',
      'idempotent_replay', true
    );
  end if;

  if v_review.status not in ('pending', 'rejected') then
    raise exception 'only pending or rejected reviews can be rejected' using errcode = '55000';
  end if;

  update public.order_reviews
  set
    status = 'rejected',
    rejection_reason = btrim(p_rejection_reason),
    moderated_at = now(),
    moderated_by = btrim(p_moderated_by)
  where id = p_review_id;

  return jsonb_build_object(
    'review_id', p_review_id,
    'status', 'rejected',
    'idempotent_replay', false
  );
end;
$$;

comment on function public.reject_order_review(uuid, text, text) is
  'Rejects a pending review with a required reason. Customer can edit and resubmit.';

revoke all on function public.reject_order_review(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.reject_order_review(uuid, text, text)
  to service_role;

create function public.get_customer_available_credit(
  p_customer_id integer
)
returns numeric
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_total numeric;
begin
  select coalesce(sum(amount), 0)
  into v_total
  from public.customer_discount_credits
  where customer_id = p_customer_id
    and status = 'available';

  return v_total;
end;
$$;

comment on function public.get_customer_available_credit(integer) is
  'Returns the total available discount credit balance for a customer.';

revoke all on function public.get_customer_available_credit(integer)
  from public, anon, authenticated;
grant execute on function public.get_customer_available_credit(integer)
  to service_role;

-- =====================================================
-- CREATE SYNTHETIC TEST DATA
-- =====================================================

-- Create unique test customers without advancing the production sequence.
DO $$
DECLARE
  v_customer1_id integer;
  v_customer2_id integer;
  v_customer1_phone text;
  v_customer2_phone text;
BEGIN
  SELECT customer1_id, customer2_id, customer1_phone, customer2_phone
  INTO v_customer1_id, v_customer2_id, v_customer1_phone, v_customer2_phone
  FROM test_ids;

  IF EXISTS (
    SELECT 1
    FROM public.customers
    WHERE id IN (v_customer1_id, v_customer2_id)
       OR phone IN (v_customer1_phone, v_customer2_phone)
  ) THEN
    RAISE EXCEPTION 'Synthetic customer identifier collision';
  END IF;
  
  INSERT INTO public.customers (id, full_name, phone)
  VALUES 
    (v_customer1_id, 'Batch 10A Test Customer Alpha', v_customer1_phone),
    (v_customer2_id, 'Batch 10A Test Customer Beta', v_customer2_phone);
  
  RAISE NOTICE 'Created test customers: % and %', v_customer1_id, v_customer2_id;
END $$;

-- Create synthetic delivered order for customer1
DO $$
DECLARE
  v_customer_id integer;
  v_order_id uuid;
  v_order_number text;
BEGIN
  SELECT customer1_id INTO v_customer_id FROM test_ids;
  
  SELECT order1_number INTO v_order_number FROM test_ids;
  
  INSERT INTO public.orders (
    id, order_number, customer_id, order_source, idempotency_key,
    shipping_name, shipping_phone, shipping_address, shipping_province,
    status, subtotal, total, created_by, created_at
  ) VALUES (
    gen_random_uuid(), v_order_number, v_customer_id, 'admin_manual', gen_random_uuid()::text,
    'Batch 10A Test Customer Alpha', (SELECT customer1_phone FROM test_ids), '123 Test Street', 'Bangkok',
    'delivered', 500.00, 550.00, 'test_system', now() - interval '1 day'
  ) RETURNING id INTO v_order_id;
  
  UPDATE test_ids SET order1_id = v_order_id;
  
  RAISE NOTICE 'Created delivered order: %', v_order_number;
END $$;

-- Create non-delivered order for testing review restriction
DO $$
DECLARE
  v_customer_id integer;
  v_order_id uuid;
  v_order_number text;
BEGIN
  SELECT customer1_id INTO v_customer_id FROM test_ids;
  
  SELECT order2_number INTO v_order_number FROM test_ids;
  
  INSERT INTO public.orders (
    id, order_number, customer_id, order_source, idempotency_key,
    shipping_name, shipping_phone, shipping_address, shipping_province,
    status, subtotal, total, created_by, created_at
  ) VALUES (
    gen_random_uuid(), v_order_number, v_customer_id, 'admin_manual', gen_random_uuid()::text,
    'Batch 10A Test Customer Alpha', (SELECT customer1_phone FROM test_ids), '123 Test Street', 'Bangkok',
    'pending', 300.00, 350.00, 'test_system', now()
  ) RETURNING id INTO v_order_id;
  
  UPDATE test_ids SET order2_id = v_order_id;
  
  RAISE NOTICE 'Created pending order: %', v_order_number;
END $$;

-- Create delivered order for customer2
DO $$
DECLARE
  v_customer_id integer;
  v_order_id uuid;
  v_order_number text;
BEGIN
  SELECT customer2_id INTO v_customer_id FROM test_ids;
  
  SELECT order3_number INTO v_order_number FROM test_ids;
  
  INSERT INTO public.orders (
    id, order_number, customer_id, order_source, idempotency_key,
    shipping_name, shipping_phone, shipping_address, shipping_province,
    status, subtotal, total, created_by, created_at
  ) VALUES (
    gen_random_uuid(), v_order_number, v_customer_id, 'admin_manual', gen_random_uuid()::text,
    'Batch 10A Test Customer Beta', (SELECT customer2_phone FROM test_ids), '456 Test Avenue', 'Bangkok',
    'delivered', 400.00, 450.00, 'test_system', now() - interval '2 days'
  ) RETURNING id INTO v_order_id;
  
  UPDATE test_ids SET order3_id = v_order_id;
  
  RAISE NOTICE 'Created customer2 delivered order: %', v_order_number;
END $$;

-- =====================================================
-- VERIFICATION ASSERTIONS (25 comprehensive tests)
-- =====================================================

-- Test 1: Tables created
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_reviews') THEN
    RAISE EXCEPTION 'FAIL: order_reviews table not created';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customer_discount_credits') THEN
    RAISE EXCEPTION 'FAIL: customer_discount_credits table not created';
  END IF;
  RAISE NOTICE '✓ Test 1 PASSED: Tables created';
END $$;

-- Test 2: All 6 foreign keys created
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'order_reviews_order_id_fkey') THEN
    RAISE EXCEPTION 'FAIL: order_reviews_order_id_fkey missing';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'order_reviews_customer_id_fkey') THEN
    RAISE EXCEPTION 'FAIL: order_reviews_customer_id_fkey missing';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'customer_discount_credits_customer_id_fkey') THEN
    RAISE EXCEPTION 'FAIL: customer_discount_credits_customer_id_fkey missing';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'customer_discount_credits_source_review_id_fkey') THEN
    RAISE EXCEPTION 'FAIL: customer_discount_credits_source_review_id_fkey missing';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'customer_discount_credits_reserved_order_id_fkey') THEN
    RAISE EXCEPTION 'FAIL: customer_discount_credits_reserved_order_id_fkey missing';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'customer_discount_credits_redeemed_order_id_fkey') THEN
    RAISE EXCEPTION 'FAIL: customer_discount_credits_redeemed_order_id_fkey missing';
  END IF;
  RAISE NOTICE '✓ Test 2 PASSED: All 6 foreign keys created';
END $$;

-- Test 3: All 7 indexes created
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'order_reviews_customer_id_idx') THEN
    RAISE EXCEPTION 'FAIL: order_reviews_customer_id_idx missing';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'order_reviews_status_idx') THEN
    RAISE EXCEPTION 'FAIL: order_reviews_status_idx missing';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'order_reviews_category_idx') THEN
    RAISE EXCEPTION 'FAIL: order_reviews_category_idx missing';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'order_reviews_submitted_at_idx') THEN
    RAISE EXCEPTION 'FAIL: order_reviews_submitted_at_idx missing';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'customer_discount_credits_customer_id_idx') THEN
    RAISE EXCEPTION 'FAIL: customer_discount_credits_customer_id_idx missing';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'customer_discount_credits_status_customer_id_idx') THEN
    RAISE EXCEPTION 'FAIL: customer_discount_credits_status_customer_id_idx missing';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'customer_discount_credits_source_review_id_idx') THEN
    RAISE EXCEPTION 'FAIL: customer_discount_credits_source_review_id_idx missing';
  END IF;
  RAISE NOTICE '✓ Test 3 PASSED: All 7 indexes created';
END $$;

-- Test 4: RLS enabled
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_reviews' AND rowsecurity = true) THEN
    RAISE EXCEPTION 'FAIL: RLS not enabled on order_reviews';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customer_discount_credits' AND rowsecurity = true) THEN
    RAISE EXCEPTION 'FAIL: RLS not enabled on customer_discount_credits';
  END IF;
  RAISE NOTICE '✓ Test 4 PASSED: RLS enabled on both tables';
END $$;

-- Test 5: updated_at trigger exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'order_reviews_set_updated_at') THEN
    RAISE EXCEPTION 'FAIL: updated_at trigger missing';
  END IF;
  RAISE NOTICE '✓ Test 5 PASSED: updated_at trigger created';
END $$;

-- Test 6: All 5 functions exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'submit_order_review') THEN
    RAISE EXCEPTION 'FAIL: submit_order_review function missing';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'update_rejected_review') THEN
    RAISE EXCEPTION 'FAIL: update_rejected_review function missing';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'approve_order_review') THEN
    RAISE EXCEPTION 'FAIL: approve_order_review function missing';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'reject_order_review') THEN
    RAISE EXCEPTION 'FAIL: reject_order_review function missing';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'get_customer_available_credit') THEN
    RAISE EXCEPTION 'FAIL: get_customer_available_credit function missing';
  END IF;
  RAISE NOTICE '✓ Test 6 PASSED: All 5 functions created';
END $$;

-- Test 7: Rating constraint (1-5 only)
DO $$
DECLARE
  v_order_id uuid;
BEGIN
  SELECT order1_id INTO v_order_id FROM test_ids;
  
  BEGIN
    INSERT INTO public.order_reviews (order_id, customer_id, rating, category, review_text)
    VALUES (v_order_id, (SELECT customer1_id FROM test_ids), 0, 'overall', 'Invalid rating test');
    RAISE EXCEPTION 'FAIL: Rating 0 should be rejected';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  
  BEGIN
    INSERT INTO public.order_reviews (order_id, customer_id, rating, category, review_text)
    VALUES (v_order_id, (SELECT customer1_id FROM test_ids), 6, 'overall', 'Invalid rating test');
    RAISE EXCEPTION 'FAIL: Rating 6 should be rejected';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  
  RAISE NOTICE '✓ Test 7 PASSED: Rating constraint enforces 1-5';
END $$;

-- Test 8: Invalid category rejected
DO $$
DECLARE
  v_order_id uuid;
BEGIN
  SELECT order1_id INTO v_order_id FROM test_ids;
  
  BEGIN
    INSERT INTO public.order_reviews (order_id, customer_id, rating, category, review_text)
    VALUES (v_order_id, (SELECT customer1_id FROM test_ids), 5, 'invalid', 'Invalid category test');
    RAISE EXCEPTION 'FAIL: Invalid category should be rejected';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  
  RAISE NOTICE '✓ Test 8 PASSED: Invalid category rejected';
END $$;

-- Test 9: Short review text rejected (min 10 chars)
DO $$
DECLARE
  v_order_id uuid;
BEGIN
  SELECT order1_id INTO v_order_id FROM test_ids;
  
  BEGIN
    INSERT INTO public.order_reviews (order_id, customer_id, rating, category, review_text)
    VALUES (v_order_id, (SELECT customer1_id FROM test_ids), 5, 'overall', 'short');
    RAISE EXCEPTION 'FAIL: Short text should be rejected';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  
  RAISE NOTICE '✓ Test 9 PASSED: Short review text rejected (min 10 chars)';
END $$;

-- Test 10: Long review text rejected (max 2000 chars)
DO $$
DECLARE
  v_order_id uuid;
  v_long_text text;
BEGIN
  SELECT order1_id INTO v_order_id FROM test_ids;
  
  -- Create text longer than 2000 chars
  v_long_text := repeat('This is a test review. ', 100);  -- ~2400 chars
  
  BEGIN
    INSERT INTO public.order_reviews (order_id, customer_id, rating, category, review_text)
    VALUES (v_order_id, (SELECT customer1_id FROM test_ids), 5, 'overall', v_long_text);
    RAISE EXCEPTION 'FAIL: Long text should be rejected';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  
  RAISE NOTICE '✓ Test 10 PASSED: Long review text rejected (max 2000 chars)';
END $$;

-- Test 11: Valid review submission succeeds
DO $$
DECLARE
  v_order_id uuid;
  v_customer_id integer;
  v_result jsonb;
  v_review_id uuid;
BEGIN
  SELECT order1_id, customer1_id INTO v_order_id, v_customer_id FROM test_ids;
  
  v_result := public.submit_order_review(
    v_order_id,
    v_customer_id,
    5::smallint,
    'overall',
    'This is a valid test review that meets all the requirements'
  );
  
  IF (v_result->>'status') IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'FAIL: Review submission did not return pending status';
  END IF;
  
  IF (v_result->>'idempotent_replay') IS NOT DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'FAIL: First submission should not be idempotent replay';
  END IF;
  
  v_review_id := (v_result->>'review_id')::uuid;
  UPDATE test_ids SET review1_id = v_review_id;
  
  RAISE NOTICE '✓ Test 11 PASSED: Valid review submission succeeds';
END $$;

-- Test 12: One review per order (idempotent replay)
DO $$
DECLARE
  v_order_id uuid;
  v_customer_id integer;
  v_result jsonb;
BEGIN
  SELECT order1_id, customer1_id INTO v_order_id, v_customer_id FROM test_ids;
  
  v_result := public.submit_order_review(
    v_order_id,
    v_customer_id,
    4::smallint,
    'product',
    'This is an attempt to submit a second review'
  );
  
  IF (v_result->>'idempotent_replay') IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'FAIL: Second submission should return idempotent_replay';
  END IF;
  
  RAISE NOTICE '✓ Test 12 PASSED: One review per order enforced';
END $$;

-- Test 13: Non-owner cannot review
DO $$
DECLARE
  v_order_id uuid;
  v_customer2_id integer;
BEGIN
  SELECT order1_id, customer2_id INTO v_order_id, v_customer2_id FROM test_ids;
  
  BEGIN
    PERFORM public.submit_order_review(
      v_order_id,
      v_customer2_id,
      5::smallint,
      'overall',
      'This should fail - not my order'
    );
    RAISE EXCEPTION 'FAIL: Non-owner should not be able to review';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%order does not belong to customer%' THEN
      RAISE;
    END IF;
  END;
  
  RAISE NOTICE '✓ Test 13 PASSED: Only owner can review';
END $$;

-- Test 14: Non-delivered order cannot be reviewed
DO $$
DECLARE
  v_order_id uuid;
  v_customer_id integer;
BEGIN
  SELECT order2_id, customer1_id INTO v_order_id, v_customer_id FROM test_ids;
  
  BEGIN
    PERFORM public.submit_order_review(
      v_order_id,
      v_customer_id,
      5::smallint,
      'overall',
      'This should fail - order not delivered'
    );
    RAISE EXCEPTION 'FAIL: Non-delivered order should not be reviewable';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%only delivered orders can be reviewed%' THEN
      RAISE;
    END IF;
  END;
  
  RAISE NOTICE '✓ Test 14 PASSED: Only delivered orders can be reviewed';
END $$;

-- Test 15: Approval creates exactly one ฿5 credit
DO $$
DECLARE
  v_review_id uuid;
  v_result jsonb;
  v_credit_id uuid;
  v_credit_count int;
  v_credit_amount numeric;
BEGIN
  SELECT review1_id INTO v_review_id FROM test_ids;
  
  v_result := public.approve_order_review(v_review_id, 'test_admin');
  
  IF (v_result->>'status') IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'FAIL: Approval did not return approved status';
  END IF;
  
  v_credit_id := (v_result->>'credit_id')::uuid;
  UPDATE test_ids SET credit1_id = v_credit_id;
  
  -- Verify exactly one credit
  SELECT COUNT(*), COALESCE(SUM(amount), 0) INTO v_credit_count, v_credit_amount
  FROM public.customer_discount_credits
  WHERE source_review_id = v_review_id;
  
  IF v_credit_count != 1 THEN
    RAISE EXCEPTION 'FAIL: Expected 1 credit, found %', v_credit_count;
  END IF;
  
  IF v_credit_amount != 5.00 THEN
    RAISE EXCEPTION 'FAIL: Expected ฿5 credit, found %', v_credit_amount;
  END IF;
  
  RAISE NOTICE '✓ Test 15 PASSED: Approval creates exactly one ฿5 credit';
END $$;

-- Test 16: Repeated approval does not create duplicate credit
DO $$
DECLARE
  v_review_id uuid;
  v_result jsonb;
  v_credit_count int;
BEGIN
  SELECT review1_id INTO v_review_id FROM test_ids;
  
  v_result := public.approve_order_review(v_review_id, 'test_admin');
  
  IF (v_result->>'idempotent_replay') IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'FAIL: Second approval should return idempotent_replay';
  END IF;
  
  SELECT COUNT(*) INTO v_credit_count
  FROM public.customer_discount_credits
  WHERE source_review_id = v_review_id;
  
  IF v_credit_count != 1 THEN
    RAISE EXCEPTION 'FAIL: Expected 1 credit after replay, found %', v_credit_count;
  END IF;
  
  RAISE NOTICE '✓ Test 16 PASSED: Repeated approval does not create duplicate credit';
END $$;

-- Test 17: Rejection requires reason
DO $$
DECLARE
  v_customer_id integer;
  v_order_id uuid;
  v_review_id uuid;
BEGIN
  SELECT customer2_id, order3_id INTO v_customer_id, v_order_id FROM test_ids;
  
  -- Create a review for customer2
  INSERT INTO public.order_reviews (order_id, customer_id, rating, category, review_text)
  VALUES (v_order_id, v_customer_id, 4, 'product', 'This is a test review for rejection testing')
  RETURNING id INTO v_review_id;
  
  UPDATE test_ids SET review2_id = v_review_id;
  
  -- Try to reject without reason
  BEGIN
    PERFORM public.reject_order_review(v_review_id, 'test_admin', '');
    RAISE EXCEPTION 'FAIL: Rejection without reason should be rejected';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%rejection reason is required%' THEN
      RAISE;
    END IF;
  END;
  
  RAISE NOTICE '✓ Test 17 PASSED: Rejection requires reason';
END $$;

-- Test 18: Rejection creates no credit
DO $$
DECLARE
  v_review_id uuid;
  v_result jsonb;
  v_credit_count int;
BEGIN
  SELECT review2_id INTO v_review_id FROM test_ids;
  
  v_result := public.reject_order_review(v_review_id, 'test_admin', 'Test rejection reason');
  
  IF (v_result->>'status') IS DISTINCT FROM 'rejected' THEN
    RAISE EXCEPTION 'FAIL: Rejection did not return rejected status';
  END IF;
  
  SELECT COUNT(*) INTO v_credit_count
  FROM public.customer_discount_credits
  WHERE source_review_id = v_review_id;
  
  IF v_credit_count != 0 THEN
    RAISE EXCEPTION 'FAIL: Rejection created a credit';
  END IF;
  
  RAISE NOTICE '✓ Test 18 PASSED: Rejection creates no credit';
END $$;

-- Test 19: Rejected review can be edited and resubmitted
DO $$
DECLARE
  v_order_id uuid;
  v_customer_id integer;
  v_review_id uuid;
  v_result jsonb;
BEGIN
  SELECT order3_id, customer2_id, review2_id INTO v_order_id, v_customer_id, v_review_id FROM test_ids;
  
  v_result := public.update_rejected_review(
    v_order_id,
    v_customer_id,
    5::smallint,
    'overall',
    'This is an updated review after addressing the rejection'
  );
  
  IF (v_result->>'status') IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'FAIL: Updated review did not return to pending';
  END IF;
  
  RAISE NOTICE '✓ Test 19 PASSED: Rejected review can be edited and resubmitted';
END $$;

-- Test 20: Available credit balance returns correct amount
DO $$
DECLARE
  v_customer_id integer;
  v_balance numeric;
BEGIN
  SELECT customer1_id INTO v_customer_id FROM test_ids;
  
  v_balance := public.get_customer_available_credit(v_customer_id);
  
  IF v_balance != 5.00 THEN
    RAISE EXCEPTION 'FAIL: Expected balance ฿5, found %', v_balance;
  END IF;
  
  RAISE NOTICE '✓ Test 20 PASSED: Available credit balance returns correct amount';
END $$;

-- Test 21: Table privileges - PUBLIC/anon/authenticated have no access
DO $$
DECLARE
  v_table regclass;
  v_role name;
  v_privilege text;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    CROSS JOIN LATERAL aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) acl
    WHERE c.oid IN ('public.order_reviews'::regclass, 'public.customer_discount_credits'::regclass)
      AND acl.grantee = 0
      AND acl.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
  ) THEN
    RAISE EXCEPTION 'FAIL: PUBLIC has table privileges';
  END IF;

  FOREACH v_table IN ARRAY ARRAY[
    'public.order_reviews'::regclass,
    'public.customer_discount_credits'::regclass
  ] LOOP
    FOREACH v_role IN ARRAY ARRAY['anon'::name, 'authenticated'::name] LOOP
      FOREACH v_privilege IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'] LOOP
        IF has_table_privilege(v_role, v_table, v_privilege) THEN
          RAISE EXCEPTION 'FAIL: role % has % on %', v_role, v_privilege, v_table;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE '✓ Test 21 PASSED: PUBLIC/anon/authenticated have no table access';
END $$;

-- Test 22: service_role has required table privileges
DO $$
DECLARE
  v_table regclass;
  v_privilege text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'public.order_reviews'::regclass,
    'public.customer_discount_credits'::regclass
  ] LOOP
    FOREACH v_privilege IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE'] LOOP
      IF NOT has_table_privilege('service_role', v_table, v_privilege) THEN
        RAISE EXCEPTION 'FAIL: service_role lacks % on %', v_privilege, v_table;
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE '✓ Test 22 PASSED: service_role has required table privileges';
END $$;

-- Test 23: Functions not executable by PUBLIC/anon/authenticated
DO $$
DECLARE
  v_function regprocedure;
  v_role name;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    WHERE p.oid IN (
      'public.submit_order_review(uuid,integer,smallint,text,text)'::regprocedure,
      'public.update_rejected_review(uuid,integer,smallint,text,text)'::regprocedure,
      'public.approve_order_review(uuid,text)'::regprocedure,
      'public.reject_order_review(uuid,text,text)'::regprocedure,
      'public.get_customer_available_credit(integer)'::regprocedure
    )
      AND acl.grantee = 0
      AND acl.privilege_type = 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'FAIL: PUBLIC can execute a review function';
  END IF;

  FOREACH v_function IN ARRAY ARRAY[
    'public.submit_order_review(uuid,integer,smallint,text,text)'::regprocedure,
    'public.update_rejected_review(uuid,integer,smallint,text,text)'::regprocedure,
    'public.approve_order_review(uuid,text)'::regprocedure,
    'public.reject_order_review(uuid,text,text)'::regprocedure,
    'public.get_customer_available_credit(integer)'::regprocedure
  ] LOOP
    FOREACH v_role IN ARRAY ARRAY['anon'::name, 'authenticated'::name] LOOP
      IF has_function_privilege(v_role, v_function, 'EXECUTE') THEN
        RAISE EXCEPTION 'FAIL: role % can execute %', v_role, v_function;
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE '✓ Test 23 PASSED: All 5 functions not executable by PUBLIC/anon/authenticated';
END $$;

-- Test 24: Functions executable by service_role
DO $$
DECLARE
  v_function regprocedure;
BEGIN
  FOREACH v_function IN ARRAY ARRAY[
    'public.submit_order_review(uuid,integer,smallint,text,text)'::regprocedure,
    'public.update_rejected_review(uuid,integer,smallint,text,text)'::regprocedure,
    'public.approve_order_review(uuid,text)'::regprocedure,
    'public.reject_order_review(uuid,text,text)'::regprocedure,
    'public.get_customer_available_credit(integer)'::regprocedure
  ] LOOP
    IF NOT has_function_privilege('service_role', v_function, 'EXECUTE') THEN
      RAISE EXCEPTION 'FAIL: service_role cannot execute %', v_function;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✓ Test 24 PASSED: All 5 functions executable by service_role';
END $$;

-- Test 25: Order not found error
DO $$
DECLARE
  v_fake_order_id uuid := gen_random_uuid();
BEGIN
  BEGIN
    PERFORM public.submit_order_review(
      v_fake_order_id,
      (SELECT customer1_id FROM test_ids),
      5::smallint,
      'overall',
      'This should fail - order not found'
    );
    RAISE EXCEPTION 'FAIL: Non-existent order should be rejected';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%order not found%' THEN
      RAISE;
    END IF;
  END;
  
  RAISE NOTICE '✓ Test 25 PASSED: Order not found error works';
END $$;

-- =====================================================
-- SUMMARY
-- =====================================================

DO $$
DECLARE
  v_customer1_id integer;
  v_customer2_id integer;
  v_review_count int;
  v_credit_count int;
BEGIN
  SELECT customer1_id, customer2_id INTO v_customer1_id, v_customer2_id FROM test_ids;
  
  SELECT COUNT(*) INTO v_review_count FROM public.order_reviews WHERE customer_id IN (v_customer1_id, v_customer2_id);
  SELECT COUNT(*) INTO v_credit_count FROM public.customer_discount_credits WHERE customer_id IN (v_customer1_id, v_customer2_id);
  
  RAISE NOTICE '';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Batch 10A Rollback Verification: SUCCESS';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'All 25 tests passed';
  RAISE NOTICE 'Tables: order_reviews, customer_discount_credits';
  RAISE NOTICE 'Functions: 5 created and verified';
  RAISE NOTICE 'Foreign keys: 6 verified';
  RAISE NOTICE 'Indexes: 7 verified';
  RAISE NOTICE 'RLS: Enabled on both tables';
  RAISE NOTICE 'Grants: service_role only';
  RAISE NOTICE 'Synthetic data: % reviews, % credits', v_review_count, v_credit_count;
  RAISE NOTICE 'Transaction will ROLLBACK - no permanent changes';
  RAISE NOTICE '=================================================';
END $$;

-- =====================================================
-- ROLLBACK - Remove all test data and schema
-- =====================================================

ROLLBACK;

-- =====================================================
-- VERIFY ROLLBACK SUCCEEDED
-- =====================================================

-- Verify tables no longer exist
SELECT 
  CASE 
    WHEN to_regclass('public.order_reviews') IS NULL THEN '✓ order_reviews removed'
    ELSE '✗ FAIL: order_reviews still exists'
  END as order_reviews_status,
  CASE 
    WHEN to_regclass('public.customer_discount_credits') IS NULL THEN '✓ customer_discount_credits removed'
    ELSE '✗ FAIL: customer_discount_credits still exists'
  END as credits_status;

-- Verify the exact synthetic customers were removed.
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.customers
  WHERE id IN (-209091001, -209091002)
     OR phone IN ('b10a-9f61a3c7e001', 'b10a-9f61a3c7e002');
  
  IF v_count = 0 THEN
    RAISE NOTICE '✓ Synthetic customers removed';
  ELSE
    RAISE EXCEPTION '✗ FAIL: Synthetic customers still exist';
  END IF;
END $$;

-- Verify the exact synthetic orders were removed.
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.orders
  WHERE order_number IN (
    'B10A-9f61a3c7-e001-4f10-a001-202609091001',
    'B10A-9f61a3c7-e002-4f10-a002-202609091002',
    'B10A-9f61a3c7-e003-4f10-a003-202609091003'
  );
  
  IF v_count = 0 THEN
    RAISE NOTICE '✓ Synthetic orders removed';
  ELSE
    RAISE EXCEPTION '✗ FAIL: Synthetic orders still exist';
  END IF;
END $$;

-- Final summary
SELECT 
  'Batch 10A rollback verification: COMPLETE' as result,
  'All schema changes rolled back' as rollback_status,
  'No test data remains in production' as cleanup_status,
  'Ready to apply migration after approval' as next_step;
