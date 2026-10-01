import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const sql = read("supabase/migrations/20261001142945_manual_bank_payment_verification.sql");
const route = read("src/app/api/admin/orders/[orderId]/manual-payment/route.ts");
const page = read("src/app/admin/orders/[orderId]/page.tsx");
const notifications = read("src/lib/telegram-notifications.ts");
const permissions = read("src/lib/admin-permissions.ts");

assert.match(sql, /security invoker/i);
assert.match(sql, /for update/i);
assert.match(sql, /line_message_id is null/i);
assert.match(sql, /failure_code not in/i);
assert.match(sql, /p_amount <> round\(p_amount, 2\)/i);
assert.match(sql, /p_amount.*expected_amount/i);
assert.match(sql, /verification_method = 'manual_bank'/i);
assert.match(sql, /public\.confirm_pending_order\(/i);
assert.match(sql, /revoke all on function public\.manually_verify_line_order_payment/i);
assert.match(sql, /grant execute on function public\.manually_verify_line_order_payment[\s\S]*to service_role/i);
assert.match(route, /requireSameOrigin/);
assert.match(route, /payments\.manual_verify/);
assert.match(route, /bankDepositConfirmed !== true/);
assert.match(page, /ฉันตรวจยอดเงินเข้าบัญชีร้านจริงแล้ว/);
assert.match(page, /window\.confirm/);
assert.match(notifications, /ไม่ใช่ผลตรวจจาก Thunder/);
assert.match(permissions, /"payments\.manual_verify"/);
assert.doesNotMatch(permissions.match(/order_staff:\s*\[([\s\S]*?)\]/)?.[1] ?? "", /payments\.manual_verify/);

console.log("Manual bank payment approval guard checks passed");
