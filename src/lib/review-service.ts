import "server-only";

import { getServerSupabase } from "@/lib/supabase";

export type ReviewCategory = "product" | "delivery" | "service" | "overall";
export type ReviewStatus = "pending" | "approved" | "rejected";

export interface OrderReview {
  id: string;
  order_id: string;
  customer_id: number;
  rating: number;
  category: ReviewCategory;
  review_text: string;
  status: ReviewStatus;
  rejection_reason: string | null;
  submitted_at: string;
  moderated_at: string | null;
  moderated_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewWithOrder extends OrderReview {
  order_number: string;
  delivered_at: string | null;
  items: Array<{
    product_name: string;
    flavor_name: string;
    brand_name: string;
  }>;
  customer_name: string;
}

export interface CustomerCredit {
  id: string;
  customer_id: number;
  source_type: string;
  source_review_id: string | null;
  amount: number;
  status: "available" | "reserved" | "redeemed" | "void";
  created_at: string;
}

export interface PublicReview {
  id: string;
  rating: number;
  category: ReviewCategory;
  review_text: string;
  published_at: string;
  masked_order_number: string;
  masked_customer_name: string;
  verification_status: "member_order" | "payment_confirmed" | "shipped" | "delivered";
  items: Array<{
    product_name: string;
    flavor_name: string;
    brand_name: string;
  }>;
}

export interface ReviewSummary {
  average_rating: number;
  total_reviews: number;
  rating_distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

const REVIEW_FIELDS = [
  "id",
  "order_id",
  "customer_id",
  "rating",
  "category",
  "review_text",
  "status",
  "rejection_reason",
  "submitted_at",
  "moderated_at",
  "moderated_by",
  "published_at",
  "created_at",
  "updated_at",
].join(", ");

export async function submitOrderReview(
  orderId: string,
  customerId: number,
  rating: number,
  category: ReviewCategory,
  reviewText: string,
): Promise<{ reviewId: string; status: ReviewStatus; idempotentReplay: boolean }> {
  const client = getServerSupabase();

  const { data, error } = await client.rpc("submit_order_review", {
    p_order_id: orderId,
    p_customer_id: customerId,
    p_rating: rating,
    p_category: category,
    p_review_text: reviewText,
  });

  if (error) {
    // P0002 is "no_data_found" - used for not found errors
    if (error.code === "P0002") throw new Error("order_not_found");
    // 42501 is "insufficient_privilege" - used for authorization errors
    if (error.code === "42501") throw new Error("not_authorized");
    // 22023 is "invalid_parameter_value" - used for validation errors
    if (error.code === "22023") throw new Error("invalid_input");
    // 55000 is "object_not_in_prerequisite_state" - used for business rule violations
    if (error.code === "55000") throw new Error(error.message);
    throw error;
  }

  if (!data || typeof data !== "object" || !("review_id" in data)) {
    throw new Error("Review submission returned an invalid result");
  }

  return {
    reviewId: String(data.review_id),
    status: data.status as ReviewStatus,
    idempotentReplay: data.idempotent_replay === true,
  };
}

export async function updateRejectedReview(
  orderId: string,
  customerId: number,
  rating: number,
  category: ReviewCategory,
  reviewText: string,
): Promise<{ reviewId: string; status: ReviewStatus }> {
  const client = getServerSupabase();

  const { data, error } = await client.rpc("update_rejected_review", {
    p_order_id: orderId,
    p_customer_id: customerId,
    p_rating: rating,
    p_category: category,
    p_review_text: reviewText,
  });

  if (error) {
    // P0002 is "no_data_found" - used for not found errors
    if (error.code === "P0002") throw new Error("review_not_found");
    // 42501 is "insufficient_privilege" - used for authorization errors
    if (error.code === "42501") throw new Error("not_authorized");
    // 55000 is "object_not_in_prerequisite_state" - used for business rule violations
    if (error.code === "55000") throw new Error(error.message);
    throw error;
  }

  if (!data || typeof data !== "object" || !("review_id" in data)) {
    throw new Error("Review update returned an invalid result");
  }

  return {
    reviewId: String(data.review_id),
    status: data.status as ReviewStatus,
  };
}

export async function approveOrderReview(
  reviewId: string,
  moderatedBy: string,
): Promise<{ reviewId: string; creditId: string; idempotentReplay: boolean }> {
  const client = getServerSupabase();

  const { data, error } = await client.rpc("approve_order_review", {
    p_review_id: reviewId,
    p_moderated_by: moderatedBy,
  });

  if (error) {
    // P0002 is "no_data_found" - used for not found errors
    if (error.code === "P0002") throw new Error("review_not_found");
    // 55000 is "object_not_in_prerequisite_state" - used for business rule violations
    if (error.code === "55000") throw new Error(error.message);
    throw error;
  }

  if (!data || typeof data !== "object" || !("review_id" in data)) {
    throw new Error("Review approval returned an invalid result");
  }

  return {
    reviewId: String(data.review_id),
    creditId: String(data.credit_id),
    idempotentReplay: data.idempotent_replay === true,
  };
}

export async function rejectOrderReview(
  reviewId: string,
  moderatedBy: string,
  rejectionReason: string,
): Promise<{ reviewId: string; idempotentReplay: boolean }> {
  const client = getServerSupabase();

  const { data, error } = await client.rpc("reject_order_review", {
    p_review_id: reviewId,
    p_moderated_by: moderatedBy,
    p_rejection_reason: rejectionReason,
  });

  if (error) {
    // P0002 is "no_data_found" - used for not found errors
    if (error.code === "P0002") throw new Error("review_not_found");
    // 22023 is "invalid_parameter_value" - used for validation errors
    if (error.code === "22023") throw new Error("invalid_input");
    // 55000 is "object_not_in_prerequisite_state" - used for business rule violations
    if (error.code === "55000") throw new Error(error.message);
    throw error;
  }

  if (!data || typeof data !== "object" || !("review_id" in data)) {
    throw new Error("Review rejection returned an invalid result");
  }

  return {
    reviewId: String(data.review_id),
    idempotentReplay: data.idempotent_replay === true,
  };
}

export async function getCustomerAvailableCredit(customerId: number): Promise<number> {
  const client = getServerSupabase();

  const { data, error } = await client.rpc("get_customer_available_credit", {
    p_customer_id: customerId,
  });

  if (error) throw error;
  return Number(data ?? 0);
}

export async function getOrderReview(orderId: string): Promise<OrderReview | null> {
  const client = getServerSupabase();

  const { data, error } = await client
    .from("order_reviews")
    .select(REVIEW_FIELDS)
    .eq("order_id", orderId)
    .maybeSingle();

  if (error) throw error;
  return data as OrderReview | null;
}

export async function getCustomerReviews(customerId: number): Promise<OrderReview[]> {
  const client = getServerSupabase();

  const { data, error } = await client
    .from("order_reviews")
    .select(REVIEW_FIELDS)
    .eq("customer_id", customerId)
    .order("submitted_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as OrderReview[];
}

export async function getAdminReviewQueue(
  status: ReviewStatus | "all",
  page: number,
  pageSize: number,
): Promise<{ reviews: ReviewWithOrder[]; total: number; counts: { pending: number; approved: number; rejected: number; all: number } }> {
  const client = getServerSupabase();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Get counts for all statuses in parallel using count queries (no data fetch)
  const [pendingCount, approvedCount, rejectedCount, allCount] = await Promise.all([
    client.from("order_reviews").select("*", { count: "exact", head: true }).eq("status", "pending"),
    client.from("order_reviews").select("*", { count: "exact", head: true }).eq("status", "approved"),
    client.from("order_reviews").select("*", { count: "exact", head: true }).eq("status", "rejected"),
    client.from("order_reviews").select("*", { count: "exact", head: true }),
  ]);

  // Check for database errors and throw them
  if (pendingCount.error) throw pendingCount.error;
  if (approvedCount.error) throw approvedCount.error;
  if (rejectedCount.error) throw rejectedCount.error;
  if (allCount.error) throw allCount.error;

  const counts = {
    pending: pendingCount.count ?? 0,
    approved: approvedCount.count ?? 0,
    rejected: rejectedCount.count ?? 0,
    all: allCount.count ?? 0,
  };

  // Get paginated/filtered reviews
  let query = client
    .from("order_reviews")
    .select(
      `${REVIEW_FIELDS},orders(order_number,delivered_at,customers(full_name))`,
      { count: "exact" },
    );

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data: reviews, error: reviewsError, count } = await query
    .order("submitted_at", { ascending: false })
    .range(from, to);

  if (reviewsError) throw reviewsError;

  const typedReviews = reviews as unknown as Array<Record<string, unknown> & { order_id: string }>;
  const orderIds = (typedReviews ?? []).map((review) => review.order_id);

  const { data: items, error: itemsError } = await client
    .from("order_items")
    .select("order_id,product_name,flavor_name,brand_name")
    .in("order_id", orderIds);

  if (itemsError) throw itemsError;

  const itemsByOrder = new Map<string, Array<{ product_name: string; flavor_name: string; brand_name: string }>>();
  for (const item of items ?? []) {
    const existing = itemsByOrder.get(item.order_id) ?? [];
    existing.push({
      product_name: item.product_name,
      flavor_name: item.flavor_name,
      brand_name: item.brand_name,
    });
    itemsByOrder.set(item.order_id, existing);
  }

  const result: ReviewWithOrder[] = (typedReviews ?? []).map((review) => {
    const orderData = review.orders as unknown as {
      order_number: string;
      delivered_at: string | null;
      customers?: { full_name: string } | null;
    } | null;

    return {
      ...(review as unknown as OrderReview),
      order_number: orderData?.order_number ?? "",
      delivered_at: orderData?.delivered_at ?? null,
      customer_name: orderData?.customers?.full_name ?? "ลูกค้า",
      items: itemsByOrder.get(review.order_id) ?? [],
    };
  });

  return { reviews: result, total: count ?? 0, counts };
}

export async function getAdminReviewDetail(reviewId: string): Promise<ReviewWithOrder | null> {
  const client = getServerSupabase();

  const { data: review, error: reviewError } = await client
    .from("order_reviews")
    .select(
      `${REVIEW_FIELDS},orders(order_number,delivered_at,shipping_name,shipping_phone,customers(full_name,phone))`,
    )
    .eq("id", reviewId)
    .maybeSingle();

  if (reviewError) throw reviewError;
  if (!review) return null;

  const typedReview = review as unknown as Record<string, unknown> & { order_id: string };

  const { data: items, error: itemsError } = await client
    .from("order_items")
    .select("product_name,flavor_name,brand_name,quantity,unit_price,total_price")
    .eq("order_id", typedReview.order_id);

  if (itemsError) throw itemsError;

  const orderData = typedReview.orders as unknown as {
    order_number: string;
    delivered_at: string | null;
    shipping_name: string;
    shipping_phone: string;
    customers?: { full_name: string; phone: string } | null;
  } | null;

  return {
    ...(typedReview as unknown as OrderReview),
    order_number: orderData?.order_number ?? "",
    delivered_at: orderData?.delivered_at ?? null,
    customer_name: orderData?.customers?.full_name ?? "ลูกค้า",
    items: (items ?? []).map((item) => ({
      product_name: item.product_name,
      flavor_name: item.flavor_name,
      brand_name: item.brand_name,
    })),
  };
}

export async function getPublicReviews(
  category: ReviewCategory | "all",
  page: number,
  pageSize: number,
): Promise<{ reviews: PublicReview[]; summary: ReviewSummary; total: number }> {
  const client = getServerSupabase();

  // Get approved reviews with pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = client
    .from("order_reviews")
    .select(
      "id,rating,category,review_text,published_at,order_id",
      { count: "exact" },
    )
    .eq("status", "approved");

  if (category !== "all") {
    query = query.eq("category", category);
  }

  const { data: reviews, error: reviewsError, count } = await query
    .order("published_at", { ascending: false })
    .range(from, to);

  if (reviewsError) throw reviewsError;

  // Get aggregate summary
  const { data: summaryData, error: summaryError } = await client
    .from("order_reviews")
    .select("rating")
    .eq("status", "approved");

  if (summaryError) throw summaryError;

  const totalReviews = (summaryData ?? []).length;
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let ratingSum = 0;

  for (const review of summaryData ?? []) {
    const rating = review.rating as 1 | 2 | 3 | 4 | 5;
    ratingDistribution[rating] += 1;
    ratingSum += rating;
  }

  const averageRating = totalReviews > 0 ? ratingSum / totalReviews : 0;

  // Get order details
  const orderIds = (reviews ?? []).map((review) => review.order_id);

  const { data: orders, error: ordersError } = await client
    .from("orders")
    .select("id,order_number,customer_id,status")
    .in("id", orderIds);

  if (ordersError) throw ordersError;

  const { data: items, error: itemsError } = await client
    .from("order_items")
    .select("order_id,product_name,flavor_name,brand_name")
    .in("order_id", orderIds);

  if (itemsError) throw itemsError;

  const { data: customers, error: customersError } = await client
    .from("customers")
    .select("id,full_name")
    .in(
      "id",
      (orders ?? []).map((order) => order.customer_id),
    );

  if (customersError) throw customersError;

  const orderByOrderId = new Map<string, { orderNumber: string; customerId: number; status: string }>();
  for (const order of orders ?? []) {
    orderByOrderId.set(order.id, {
      orderNumber: order.order_number,
      customerId: order.customer_id,
      status: order.status,
    });
  }

  const itemsByOrder = new Map<string, Array<{ product_name: string; flavor_name: string; brand_name: string }>>();
  for (const item of items ?? []) {
    const existing = itemsByOrder.get(item.order_id) ?? [];
    existing.push({
      product_name: item.product_name,
      flavor_name: item.flavor_name,
      brand_name: item.brand_name,
    });
    itemsByOrder.set(item.order_id, existing);
  }

  const customerNameById = new Map<number, string>();
  for (const customer of customers ?? []) {
    customerNameById.set(customer.id, customer.full_name);
  }

  const result: PublicReview[] = (reviews ?? []).map((review) => {
    const order = orderByOrderId.get(review.order_id);
    const maskedOrderNumber = maskOrderNumber(order?.orderNumber ?? "");
    const customerName = order ? customerNameById.get(order.customerId) : null;

    return {
      id: review.id,
      rating: review.rating,
      category: review.category as ReviewCategory,
      review_text: review.review_text,
      published_at: review.published_at,
      masked_order_number: maskedOrderNumber,
      masked_customer_name: maskCustomerName(customerName),
      verification_status: getReviewVerificationStatus(order?.status),
      items: itemsByOrder.get(review.order_id) ?? [],
    };
  });

  return {
    reviews: result,
    summary: {
      average_rating: Math.round(averageRating * 10) / 10,
      total_reviews: totalReviews,
      rating_distribution: ratingDistribution,
    },
    total: count ?? 0,
  };
}

function maskCustomerName(fullName: string | null | undefined): string {
  const firstCharacter = fullName?.trim().charAt(0);
  return firstCharacter ? `คุณ ${firstCharacter}•••` : "สมาชิก Pod4U";
}

function getReviewVerificationStatus(status: string | undefined): PublicReview["verification_status"] {
  if (status === "delivered") return "delivered";
  if (status === "shipped") return "shipped";
  if (status === "confirmed") return "payment_confirmed";
  return "member_order";
}

function maskOrderNumber(orderNumber: string): string {
  if (!orderNumber || orderNumber.length < 8) return orderNumber;
  const prefix = orderNumber.slice(0, 4);
  const suffix = orderNumber.slice(-4);
  return `${prefix}••••${suffix}`;
}
