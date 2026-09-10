import "server-only";

import { getServerSupabase } from "@/lib/supabase";

export const WAREHOUSE_STATUSES = ["ready_to_pack", "packing", "packed", "problem", "shipped"] as const;
export type WarehouseStatus = (typeof WAREHOUSE_STATUSES)[number];
export type WarehouseAction = "start" | "pack" | "problem" | "resume";

const LIST_SELECT = [
  "id", "order_id", "status", "assigned_to", "problem_code", "problem_note",
  "started_at", "packed_at", "shipped_at", "created_at", "updated_at",
  "order:orders!inner(id,order_number,status,shipping_name,shipping_phone,shipping_province,shipping_postal_code,total,carrier,tracking_number,created_at)",
].join(",");

export class WarehouseInputError extends Error {}

export function parseWarehouseStatus(value: string | null): WarehouseStatus | null {
  if (!value || value === "all") return null;
  if (!(WAREHOUSE_STATUSES as readonly string[]).includes(value)) {
    throw new WarehouseInputError("สถานะงานไม่ถูกต้อง");
  }
  return value as WarehouseStatus;
}

export function parseWarehouseOrderId(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)) {
    throw new WarehouseInputError("เลขอ้างอิงออเดอร์ไม่ถูกต้อง");
  }
  return value.toLowerCase();
}

export async function listWarehouseOrders(status: WarehouseStatus | null) {
  const client = getServerSupabase();
  let query = client.from("warehouse_fulfillments").select(LIST_SELECT);
  query = status ? query.eq("status", status) : query.neq("status", "cancelled");

  const [listResult, ...countResults] = await Promise.all([
    query.order("updated_at", { ascending: false }).limit(100),
    ...WAREHOUSE_STATUSES.map((candidate) => client
      .from("warehouse_fulfillments")
      .select("id", { count: "exact", head: true })
      .eq("status", candidate)),
  ]);
  if (listResult.error) throw listResult.error;
  for (const result of countResults) if (result.error) throw result.error;

  const counts = Object.fromEntries(
    WAREHOUSE_STATUSES.map((candidate, index) => [candidate, countResults[index].count ?? 0]),
  ) as Record<WarehouseStatus, number>;
  const rawJobs = (listResult.data ?? []) as unknown as Array<Record<string, unknown> & { order?: unknown }>;
  const jobs = rawJobs.map((job) => ({
    ...job,
    order: Array.isArray(job.order) ? job.order[0] ?? {} : job.order ?? {},
  }));
  return { jobs, counts };
}

export async function getWarehouseOrder(orderId: string) {
  const client = getServerSupabase();
  const [jobResult, orderResult, itemsResult] = await Promise.all([
    client.from("warehouse_fulfillments").select("*").eq("order_id", orderId).maybeSingle(),
    client.from("orders")
      .select("id,order_number,status,shipping_name,shipping_phone,shipping_address,shipping_province,shipping_postal_code,total,carrier,tracking_number,shipped_at,created_at")
      .eq("id", orderId)
      .maybeSingle(),
    client.from("order_items")
      .select("id,brand_name,product_name,flavor_name,variant_key,sku,quantity")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
  ]);
  if (jobResult.error) throw jobResult.error;
  if (orderResult.error) throw orderResult.error;
  if (itemsResult.error) throw itemsResult.error;
  if (!jobResult.data || !orderResult.data || orderResult.data.status === "cancelled") return null;
  return { job: jobResult.data, order: orderResult.data, items: itemsResult.data ?? [] };
}

export async function updateWarehouseFulfillment(input: {
  orderId: string;
  action: WarehouseAction;
  actor: string;
  problemCode?: string | null;
  problemNote?: string | null;
}) {
  const { data, error } = await getServerSupabase().rpc("update_warehouse_fulfillment", {
    p_order_id: input.orderId,
    p_action: input.action,
    p_actor: input.actor,
    p_problem_code: input.problemCode ?? null,
    p_problem_note: input.problemNote ?? null,
  });
  if (error) throw error;
  return data as { order_id: string; status: WarehouseStatus; idempotent_replay: boolean };
}

export async function shipWarehouseOrder(input: {
  orderId: string;
  carrier: string;
  trackingNumber: string;
  actor: string;
}) {
  if (!input.carrier.trim() || input.carrier.trim().length > 100) {
    throw new WarehouseInputError("กรุณาเลือกบริษัทขนส่ง");
  }
  if (!/^[A-Za-z0-9-]{6,50}$/u.test(input.trackingNumber.trim())) {
    throw new WarehouseInputError("เลขพัสดุต้องมี 6–50 ตัว และใช้เฉพาะตัวอักษร ตัวเลข หรือขีดกลาง");
  }
  const { data, error } = await getServerSupabase().rpc("mark_warehouse_order_shipped", {
    p_order_id: input.orderId,
    p_carrier: input.carrier.trim(),
    p_tracking_number: input.trackingNumber.trim().toUpperCase(),
    p_actor: input.actor,
  });
  if (error) throw error;
  return data as { order_id: string; status: "shipped"; idempotent_replay: boolean };
}
