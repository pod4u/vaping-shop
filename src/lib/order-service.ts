import "server-only";

import { getServerSupabase } from "@/lib/supabase";
import type { DraftOrderInput } from "@/lib/order-validation";

const ORDER_FIELDS = [
  "id",
  "order_number",
  "customer_id",
  "source_customer_identity_id",
  "source_address_id",
  "order_source",
  "shipping_name",
  "shipping_phone",
  "shipping_address",
  "shipping_province",
  "shipping_postal_code",
  "status",
  "subtotal",
  "shipping_fee",
  "discount_amount",
  "discount_credit_id",
  "total",
  "admin_note",
  "carrier",
  "tracking_number",
  "shipped_at",
  "shipped_by",
  "delivered_at",
  "delivered_by",
  "cancelled_at",
  "cancelled_by",
  "created_by",
  "created_at",
  "updated_at",
].join(",");

export async function createDraftOrder(
  input: DraftOrderInput,
  createdBy = "admin-session",
) {
  const { data, error } = await getServerSupabase().rpc("create_draft_order", {
    p_customer_id: input.customerId,
    p_address_id: input.addressId,
    p_source_customer_identity_id: input.sourceCustomerIdentityId,
    p_order_source: input.orderSource,
    p_idempotency_key: input.idempotencyKey,
    p_items: input.items,
    p_created_by: createdBy,
    p_admin_note: input.adminNote,
  });

  if (error) throw error;
  if (!data || typeof data !== "object" || !("order_id" in data)) {
    throw new Error("Draft order creation returned an invalid result");
  }
  return {
    orderId: String(data.order_id),
    orderNumber: String(data.order_number),
    idempotentReplay: data.idempotent_replay === true,
  };
}

export async function reserveDraftOrder(orderId: string, reservedBy = "admin-session") {
  const { data, error } = await getServerSupabase().rpc("reserve_draft_order", {
    p_order_id: orderId,
    p_reserved_by: reservedBy,
    p_ttl_minutes: 30,
  });

  if (error) throw error;
  if (!data || typeof data !== "object" || !("order_id" in data)) {
    throw new Error("Order reservation returned an invalid result");
  }

  return {
    orderId: String(data.order_id),
    status: String(data.status),
    reservationExpiresAt: String(data.reservation_expires_at),
    idempotentReplay: data.idempotent_replay === true,
  };
}

export async function confirmPendingOrder(orderId: string) {
  const { data, error } = await getServerSupabase().rpc("confirm_pending_order", {
    p_order_id: orderId,
    p_confirmed_by: "admin-session",
  });

  if (error) throw error;
  if (!data || typeof data !== "object" || !("order_id" in data)) {
    throw new Error("Order confirmation returned an invalid result");
  }

  return {
    orderId: String(data.order_id),
    status: String(data.status),
    idempotentReplay: data.idempotent_replay === true,
    reservationExpired: data.reservation_expired === true,
  };
}

function parseOrderOperationResult(data: unknown, operation: string) {
  if (!data || typeof data !== "object" || !("order_id" in data) || !("status" in data)) {
    throw new Error(`${operation} returned an invalid result`);
  }
  const value = data as Record<string, unknown>;
  return {
    orderId: String(value.order_id),
    status: String(value.status),
    idempotentReplay: value.idempotent_replay === true,
    stockRestored: value.stock_restored === true,
  };
}

export async function cancelOrder(orderId: string, actor: string) {
  const { data, error } = await getServerSupabase().rpc("cancel_order", {
    p_order_id: orderId,
    p_cancelled_by: actor,
  });
  if (error) throw error;
  return parseOrderOperationResult(data, "Order cancellation");
}

export async function markOrderShipped(
  orderId: string,
  carrier: string,
  trackingNumber: string,
  actor: string,
) {
  const { data, error } = await getServerSupabase().rpc("mark_order_shipped", {
    p_order_id: orderId,
    p_carrier: carrier,
    p_tracking_number: trackingNumber,
    p_shipped_by: actor,
  });
  if (error) throw error;
  return parseOrderOperationResult(data, "Order shipment");
}

export async function markOrderDelivered(orderId: string, actor: string) {
  const { data, error } = await getServerSupabase().rpc("mark_order_delivered", {
    p_order_id: orderId,
    p_delivered_by: actor,
  });
  if (error) throw error;
  return parseOrderOperationResult(data, "Order delivery");
}

export async function listOrders(options: {
  page: number;
  pageSize: number;
  status: string | null;
}) {
  const from = (options.page - 1) * options.pageSize;
  const to = from + options.pageSize - 1;
  let request = getServerSupabase()
    .from("orders")
    .select(`${ORDER_FIELDS},customer:customers(id,full_name,phone)`, { count: "exact" });

  if (options.status) request = request.eq("status", options.status);
  const { data, error, count } = await request
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;
  const orders = (data ?? []) as unknown as Array<Record<string, unknown> & { id: string }>;
  const orderIds = orders.map((order) => order.id);
  if (orderIds.length === 0) return { orders, total: count ?? 0 };

  const { data: payments, error: paymentError } = await getServerSupabase()
    .from("order_payment_requests")
    .select("order_id,status,expires_at")
    .in("order_id", orderIds);
  if (paymentError && paymentError.code !== "42P01") throw paymentError;

  const paymentByOrderId = new Map(
    (payments ?? []).map((payment) => [payment.order_id, payment]),
  );

  return {
    orders: orders.map((order) => ({
      ...order,
      payment: paymentByOrderId.get(order.id) ?? null,
    })),
    total: count ?? 0,
  };
}

export async function getOrderDetail(orderId: string) {
  const client = getServerSupabase();
  const [orderResult, itemsResult, reservationsResult, paymentResult] = await Promise.all([
    client
      .from("orders")
      .select(`${ORDER_FIELDS},customer:customers(id,full_name,phone,email)`)
      .eq("id", orderId)
      .maybeSingle(),
    client
      .from("order_items")
      .select("id,order_id,product_flavor_id,product_name,flavor_name,brand_name,variant_key,sku,unit_price,quantity,total_price,created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    client
      .from("stock_reservations")
      .select("id,order_id,order_item_id,product_flavor_id,quantity,status,expires_at,created_at,updated_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    client
      .from("order_payment_requests")
      .select("id,status,expected_amount,requested_at,expires_at,actual_amount,account_matched,amount_matched,is_duplicate,failure_code,verified_at")
      .eq("order_id", orderId)
      .maybeSingle(),
  ]);

  if (orderResult.error) throw orderResult.error;
  if (itemsResult.error) throw itemsResult.error;
  if (reservationsResult.error) throw reservationsResult.error;
  if (paymentResult.error && paymentResult.error.code !== "42P01") throw paymentResult.error;
  if (!orderResult.data) return null;
  return {
    order: orderResult.data,
    items: itemsResult.data ?? [],
    reservations: reservationsResult.data ?? [],
    payment: paymentResult.data ?? null,
  };
}
