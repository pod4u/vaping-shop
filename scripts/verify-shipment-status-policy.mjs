import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const member = read("src/app/(public)/member/page.tsx");
const memberService = read("src/lib/member-service.ts");
const adminDetail = read("src/app/admin/orders/[orderId]/page.tsx");
const adminStatusApi = read("src/app/api/admin/orders/[orderId]/status/route.ts");
const warehouseDetail = read("src/app/warehouse/orders/[orderId]/page.tsx");
const warehouseShipmentApi = read("src/app/api/warehouse/orders/[orderId]/shipment/route.ts");
const lineWebhook = read("src/app/api/line/webhook/route.ts");
const payment = read("src/lib/order-payment-service.ts");
const lineRegistration = read("src/lib/line-registration-service.ts");
const migration = read("supabase/migrations/20260916103747_remove_tracking_requirement.sql");
const cleanupMigration = read("supabase/migrations/20260916104509_drop_legacy_tracking_shipment_functions.sql");
const orderService = read("src/lib/order-service.ts");

for (const [name, source] of [
  ["member UI", member],
  ["member query", memberService],
  ["admin shipment UI", adminDetail],
  ["admin shipment API", adminStatusApi],
  ["warehouse UI", warehouseDetail],
  ["warehouse shipment API", warehouseShipmentApi],
  ["LINE order query", lineRegistration],
]) {
  assert.doesNotMatch(source, /tracking_number|trackingNumber|p_tracking_number/, `${name} still depends on tracking data`);
}

assert.match(member, /กรุณารอรับสินค้าภายในไม่เกิน 2 วันค่ะ/, "member UI must show the delivery window");
assert.match(lineWebhook, /สถานะ: ชำระแล้ว · กำลังเตรียมจัดส่งค่ะ/, "LINE payment receipt must show the preparation status");
assert.match(lineWebhook, /ระบบจะไม่ส่งข้อความสถานะซ้ำ/, "LINE payment receipt must explain that later status updates stay in member");
assert.match(payment, /กรุณารอรับสินค้าภายในไม่เกิน 2 วันหลังจัดส่งค่ะ/, "payment message must explain the delivery window");
assert.doesNotMatch(adminDetail, /ยืนยันว่าจัดส่งแล้ว/, "admin UI must not provide a shipment confirmation action");
assert.match(adminDetail, /ส่งงานเข้าคลังแล้ว/, "admin UI must explain the automatic warehouse handoff");
assert.match(adminDetail, /แอดมินไม่ต้องกดยืนยันซ้ำ/, "admin UI must state that no duplicate admin action is required");
assert.match(warehouseDetail, /ยืนยันว่าจัดส่งแล้ว/, "warehouse UI must provide a shipment confirmation action");
assert.match(member, /ชำระแล้ว \/ กำลังเตรียมจัดส่ง/, "member UI must clearly show paid orders are being prepared for shipment");
assert.doesNotMatch(adminStatusApi, /pushMessage|getOrderLineRecipient|lineNotificationSent/, "admin shipment must not push LINE messages");
assert.doesNotMatch(warehouseShipmentApi, /pushMessage|getOrderLineRecipient|lineNotificationSent/, "warehouse shipment must not push LINE messages");
assert.doesNotMatch(adminStatusApi, /markOrderShipped|markOrderDelivered|"ship"|"deliver"/, "admin API must not bypass the warehouse workflow");
assert.match(warehouseDetail, /ระบบจะไม่ส่งข้อความ LINE เพิ่ม/, "warehouse UI must explain the no-push policy");
assert.match(migration, /create function public\.mark_order_shipped\([\s\S]*p_shipped_by text/, "migration must add a status-only order transition");
assert.match(migration, /create function public\.mark_warehouse_order_shipped\([\s\S]*p_actor text/, "migration must add a status-only warehouse transition");
assert.match(cleanupMigration, /drop function if exists public\.mark_order_shipped\(uuid, text, text, text\)/, "legacy order shipment transition must be removed");
assert.match(cleanupMigration, /drop function if exists public\.mark_warehouse_order_shipped\(uuid, text, text, text\)/, "legacy warehouse shipment transition must be removed");
assert.match(orderService, /export async function getOrderDetail[\s\S]*getUncachedServerSupabase\(\)/, "admin order detail must always read the latest order status");
assert.match(orderService, /export async function listOrders[\s\S]*getUncachedServerSupabase\(\)/, "admin order list must always read the latest order status");

console.log("Shipment status policy verification passed (27 checks)");
