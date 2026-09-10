-- Allow members to review their ordering experience as soon as an order exists.
-- Cancelled orders remain ineligible. One review per order is still enforced by
-- the existing unique constraint, and the ฿5 credit still requires admin approval.

create or replace function public.submit_order_review(
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

  if p_review_text is null
    or btrim(p_review_text) = ''
    or char_length(btrim(p_review_text)) < 10
    or char_length(p_review_text) > 2000
  then
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

  if v_order_status = 'cancelled' then
    raise exception 'cancelled orders cannot be reviewed' using errcode = '55000';
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
  'Creates one moderated review for any non-cancelled customer order. The reward credit still requires admin approval.';

revoke all on function public.submit_order_review(uuid, integer, smallint, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_order_review(uuid, integer, smallint, text, text)
  to service_role;
