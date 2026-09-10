-- Batch 10A: Verified Order Reviews and ฿5 Review Reward
-- This migration creates tables for customer reviews of delivered orders
-- and a discount credit system for approved reviews.

-- Add reviews.moderate permission to admin_permissions enum type if needed
-- Note: We use a text-based permission check in admin-permissions.ts instead

-- Table: order_reviews
-- Stores customer reviews for delivered orders
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

-- Indexes for order_reviews
create index order_reviews_customer_id_idx on public.order_reviews (customer_id);
create index order_reviews_status_idx on public.order_reviews (status);
create index order_reviews_category_idx on public.order_reviews (category);
create index order_reviews_submitted_at_idx on public.order_reviews (submitted_at desc);

-- Trigger for updated_at
create trigger order_reviews_set_updated_at
before update on public.order_reviews
for each row
execute function public.set_updated_at();

-- RLS for order_reviews
alter table public.order_reviews enable row level security;

revoke all on table public.order_reviews
  from public, anon, authenticated, service_role;
grant select, insert, update on table public.order_reviews
  to service_role;

-- Table: customer_discount_credits
-- Stores discount credits issued to customers (from reviews, promotions, etc.)
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

-- Indexes for customer_discount_credits
create index customer_discount_credits_customer_id_idx on public.customer_discount_credits (customer_id);
create index customer_discount_credits_status_customer_id_idx on public.customer_discount_credits (status, customer_id);
create index customer_discount_credits_source_review_id_idx on public.customer_discount_credits (source_review_id)
  where source_review_id is not null;

-- RLS for customer_discount_credits
alter table public.customer_discount_credits enable row level security;

revoke all on table public.customer_discount_credits
  from public, anon, authenticated, service_role;
grant select, insert, update on table public.customer_discount_credits
  to service_role;

-- Database function: submit_order_review
-- Atomically creates a review for a delivered order after validation
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
  -- Validate inputs
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

  -- Lock and check order
  select status, customer_id
  into v_order_status, v_order_customer_id
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  -- Verify ownership
  if v_order_customer_id is distinct from p_customer_id then
    raise exception 'order does not belong to customer' using errcode = '42501';
  end if;

  -- Verify order is delivered
  if v_order_status is distinct from 'delivered' then
    raise exception 'only delivered orders can be reviewed' using errcode = '55000';
  end if;

  -- Check for existing review (idempotency)
  select id
  into v_existing_review_id
  from public.order_reviews
  where order_id = p_order_id;

  if found then
    -- Return existing review for idempotency
    return jsonb_build_object(
      'review_id', v_existing_review_id,
      'status', (select status from public.order_reviews where id = v_existing_review_id),
      'idempotent_replay', true
    );
  end if;

  -- Create the review
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

-- Database function: update_rejected_review
-- Allows customer to update a rejected review and resubmit for moderation
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
  -- Validate inputs
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

  -- Find and lock the review
  select id, status, customer_id
  into v_review_id, v_review_status, v_review_customer_id
  from public.order_reviews
  where order_id = p_order_id
  for update;

  if not found then
    raise exception 'review not found' using errcode = 'P0002';
  end if;

  -- Verify ownership
  if v_review_customer_id is distinct from p_customer_id then
    raise exception 'review does not belong to customer' using errcode = '42501';
  end if;

  -- Only rejected reviews can be updated
  if v_review_status is distinct from 'rejected' then
    raise exception 'only rejected reviews can be updated' using errcode = '55000';
  end if;

  -- Update the review
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

-- Database function: approve_order_review
-- Admin approves a pending review and issues ฿5 reward credit atomically
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
  -- Validate inputs
  if p_review_id is null or p_moderated_by is null or btrim(p_moderated_by) = '' then
    raise exception 'invalid approval input' using errcode = '22023';
  end if;

  -- Lock and get the review
  select *
  into v_review
  from public.order_reviews
  where id = p_review_id
  for update;

  if not found then
    raise exception 'review not found' using errcode = 'P0002';
  end if;

  -- Check if already approved (idempotency)
  if v_review.status = 'approved' then
    -- Return existing state for idempotency
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

  -- Only pending reviews can be approved
  if v_review.status is distinct from 'pending' then
    raise exception 'only pending reviews can be approved' using errcode = '55000';
  end if;

  -- Approve the review
  update public.order_reviews
  set
    status = 'approved',
    moderated_at = now(),
    moderated_by = btrim(p_moderated_by),
    published_at = now()
  where id = p_review_id;

  -- Create ฿5 reward credit (idempotent via unique source_review_id)
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

-- Database function: reject_order_review
-- Admin rejects a pending review with a required reason
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
  -- Validate inputs
  if p_review_id is null or p_moderated_by is null or btrim(p_moderated_by) = '' then
    raise exception 'invalid rejection input' using errcode = '22023';
  end if;

  if p_rejection_reason is null or btrim(p_rejection_reason) = '' then
    raise exception 'rejection reason is required' using errcode = '22023';
  end if;

  if char_length(p_rejection_reason) > 500 then
    raise exception 'rejection reason too long' using errcode = '22023';
  end if;

  -- Lock and get the review
  select *
  into v_review
  from public.order_reviews
  where id = p_review_id
  for update;

  if not found then
    raise exception 'review not found' using errcode = 'P0002';
  end if;

  -- Check if already rejected (idempotency)
  if v_review.status = 'rejected' and v_review.rejection_reason = btrim(p_rejection_reason) then
    return jsonb_build_object(
      'review_id', p_review_id,
      'status', 'rejected',
      'idempotent_replay', true
    );
  end if;

  -- Only pending or rejected reviews can be rejected/updated
  if v_review.status not in ('pending', 'rejected') then
    raise exception 'only pending or rejected reviews can be rejected' using errcode = '55000';
  end if;

  -- Reject the review
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

-- Database function: get_customer_available_credit
-- Returns the total available discount credit for a customer
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