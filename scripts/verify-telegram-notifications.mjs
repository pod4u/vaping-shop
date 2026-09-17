import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20260914120904_telegram_order_notifications.sql");
const client = read("src/lib/telegram-client.ts");
const notifications = read("src/lib/telegram-notifications.ts");
const route = read("src/app/api/admin/telegram/route.ts");
const orders = read("src/lib/order-service.ts");
const linePayment = read("src/lib/order-payment-service.ts");
const memberSlip = read("src/app/api/customers/orders/[orderId]/slip/route.ts");

assert.match(migration, /unique \(order_id, event_type\)/i, "delivery log must prevent duplicate order alerts");
assert.match(migration, /enable row level security/i, "Telegram tables must enable RLS");
assert.match(migration, /revoke all on table public\.telegram_notification_settings from public, anon, authenticated, service_role/i);
assert.match(migration, /grant select, insert, update, delete on table public\.telegram_notification_events to service_role/i);
assert.match(client, /process\.env\.TELEGRAM_BOT_TOKEN/, "bot token must be read server-side");
assert.doesNotMatch(client, /NEXT_PUBLIC_TELEGRAM/, "bot token must not be public");
assert.match(client, /AbortSignal\.timeout/, "Telegram requests must have a timeout");
assert.match(route, /requireAdminApiPermission\(request, "settings\.manage"\)/, "connect and test require settings permission");
assert.match(route, /requireSameOrigin/, "Telegram mutations must reject cross-origin requests");
assert.match(notifications, /maskPhone/, "alerts must mask customer phone numbers");
assert.match(notifications, /claimTelegramEvent\(orderId, "payment_received"\)/, "paid alerts must use the payment_received idempotency key");
assert.match(notifications, /ชำระเงินแล้ว · พร้อมแพ็ก/, "paid alerts need an actionable Thai heading");
assert.match(notifications, /สถานะ:<\/b> รอคลังรับงาน/, "paid alerts need the warehouse queue status");
assert.match(notifications, /เปิดงานในระบบคลัง/, "paid alerts must link to the warehouse job");
assert.match(notifications, /พร้อมรับแจ้งเตือนทันทีเมื่อลูกค้าชำระเงิน/, "test message must explain the paid-order trigger");
assert.doesNotMatch(orders, /notifyOrderCreatedSafely/, "draft order creation must not alert Telegram");
assert.match(linePayment, /notifyPaymentReceivedSafely\(payment\.order_id\)/, "LINE slip verification must alert Telegram after confirmation");
assert.match(memberSlip, /notifyPaymentReceivedSafely\(order\.id\)/, "member slip verification must alert Telegram after confirmation");

console.log("Telegram paid-order notification verification passed (19 checks)");
