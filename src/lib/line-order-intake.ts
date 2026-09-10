import "server-only";

import { getServerSupabase } from "@/lib/supabase";
import { createDraftOrder, reserveDraftOrder } from "@/lib/order-service";
import { requestLineOrderPayment } from "@/lib/order-payment-service";
import type { ParsedLineOrderItem } from "@/lib/line-order-parser";

interface CatalogVariant {
  id: string;
  sku: string;
  variant_key: string;
}

export class LineOrderIntakeError extends Error {
  readonly reason: "identity" | "address" | "catalog" | "event";

  constructor(
    reason: "identity" | "address" | "catalog" | "event",
    message: string,
  ) {
    super(message);
    this.name = "LineOrderIntakeError";
    this.reason = reason;
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function resolveVariants(items: ParsedLineOrderItem[]) {
  const client = getServerSupabase();
  const identifiers = [...new Set(items.map((item) => item.identifier))];
  const uuidIdentifiers = identifiers.filter(isUuid);

  const [skuResult, variantResult, idResult] = await Promise.all([
    client
      .from("product_flavors")
      .select("id,sku,variant_key")
      .in("sku", identifiers)
      .eq("is_active", true),
    client
      .from("product_flavors")
      .select("id,sku,variant_key")
      .in("variant_key", identifiers)
      .eq("is_active", true),
    uuidIdentifiers.length > 0
      ? client
        .from("product_flavors")
        .select("id,sku,variant_key")
        .in("id", uuidIdentifiers)
        .eq("is_active", true)
      : Promise.resolve({ data: [] as CatalogVariant[], error: null }),
  ]);

  const error = skuResult.error || variantResult.error || idResult.error;
  if (error) throw error;

  const rows = new Map<string, CatalogVariant>();
  for (const row of [
    ...(skuResult.data ?? []),
    ...(variantResult.data ?? []),
    ...(idResult.data ?? []),
  ] as CatalogVariant[]) {
    rows.set(row.id, row);
  }

  const matches = new Map<string, Set<string>>();
  for (const row of rows.values()) {
    for (const key of [row.id, row.sku, row.variant_key]) {
      if (!identifiers.includes(key)) continue;
      const ids = matches.get(key) ?? new Set<string>();
      ids.add(row.id);
      matches.set(key, ids);
    }
  }

  const quantities = new Map<string, number>();
  for (const item of items) {
    const ids = matches.get(item.identifier);
    if (!ids || ids.size !== 1) {
      throw new LineOrderIntakeError(
        "catalog",
        `ไม่พบหรือไม่สามารถระบุสินค้า ${item.identifier} ได้แน่นอน`,
      );
    }
    const [productFlavorId] = ids;
    const nextQuantity = (quantities.get(productFlavorId) ?? 0) + item.quantity;
    if (nextQuantity > 999) {
      throw new LineOrderIntakeError("catalog", "จำนวนสินค้ารวมเกินกำหนด");
    }
    quantities.set(productFlavorId, nextQuantity);
  }

  return [...quantities].map(([product_flavor_id, quantity]) => ({
    product_flavor_id,
    quantity,
  }));
}

export async function createLineDraftOrder(input: {
  providerAccountId: string;
  providerUserId: string;
  webhookEventId: string;
  items: ParsedLineOrderItem[];
}) {
  if (!/^[A-Za-z0-9:_-]{1,100}$/.test(input.webhookEventId)) {
    throw new LineOrderIntakeError("event", "LINE event ID ไม่ถูกต้อง");
  }

  const client = getServerSupabase();
  const { data: identity, error: identityError } = await client
    .from("customer_identities")
    .select("id,customer_id")
    .eq("provider", "line")
    .eq("provider_account_id", input.providerAccountId)
    .eq("provider_user_id", input.providerUserId)
    .eq("status", "verified")
    .maybeSingle();

  if (identityError) throw identityError;
  if (!identity) {
    throw new LineOrderIntakeError("identity", "ยังไม่ได้เชื่อมบัญชีสมาชิก");
  }

  const { data: address, error: addressError } = await client
    .from("customer_addresses")
    .select("id")
    .eq("customer_id", identity.customer_id)
    .eq("is_default", true)
    .maybeSingle();

  if (addressError) throw addressError;
  if (!address) {
    throw new LineOrderIntakeError("address", "ยังไม่มีที่อยู่จัดส่งหลัก");
  }

  const resolvedItems = await resolveVariants(input.items);
  const draft = await createDraftOrder({
    customerId: identity.customer_id,
    addressId: address.id,
    sourceCustomerIdentityId: identity.id,
    orderSource: "line",
    idempotencyKey: input.webhookEventId,
    items: resolvedItems,
    adminNote: null,
  }, "line-webhook");

  const [orderResult, itemResult] = await Promise.all([
    client
      .from("orders")
      .select("shipping_name,shipping_phone,shipping_address,shipping_province,shipping_postal_code,total")
      .eq("id", draft.orderId)
      .single(),
    client
      .from("order_items")
      .select("brand_name,product_name,flavor_name,quantity,unit_price")
      .eq("order_id", draft.orderId)
      .order("created_at", { ascending: true }),
  ]);
  if (orderResult.error) throw orderResult.error;
  if (itemResult.error) throw itemResult.error;

  return {
    ...draft,
    confirmation: {
      ...orderResult.data,
      items: itemResult.data ?? [],
    },
  };
}

export async function confirmLineDraftOrder(input: {
  providerAccountId: string;
  providerUserId: string;
  orderId: string;
}) {
  if (!isUuid(input.orderId)) {
    throw new LineOrderIntakeError("event", "เลขที่ออเดอร์ไม่ถูกต้อง");
  }

  const client = getServerSupabase();
  const { data: identity, error: identityError } = await client
    .from("customer_identities")
    .select("id")
    .eq("provider", "line")
    .eq("provider_account_id", input.providerAccountId)
    .eq("provider_user_id", input.providerUserId)
    .eq("status", "verified")
    .maybeSingle();
  if (identityError) throw identityError;
  if (!identity) {
    throw new LineOrderIntakeError("identity", "ยังไม่ได้เชื่อมบัญชีสมาชิก");
  }

  const { data: order, error: orderError } = await client
    .from("orders")
    .select("id,order_number,status")
    .eq("id", input.orderId)
    .eq("source_customer_identity_id", identity.id)
    .eq("order_source", "line")
    .maybeSingle();
  if (orderError) throw orderError;
  if (!order) {
    throw new LineOrderIntakeError("event", "ไม่พบออเดอร์ของสมาชิกนี้");
  }

  const actor = `line-customer:${identity.id}`;
  const reservation = await reserveDraftOrder(input.orderId, actor);
  const payment = await requestLineOrderPayment(input.orderId, actor);
  return { orderNumber: order.order_number, reservation, payment };
}
