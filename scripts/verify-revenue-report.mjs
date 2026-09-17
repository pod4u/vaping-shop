import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const service = read("src/lib/revenue-report-service.ts");
const route = read("src/app/api/admin/revenue/route.ts");
const dashboard = read("src/app/admin/page.tsx");

assert.match(service, /\.eq\("status", "verified"\)/, "report must only count verified payments");
assert.match(service, /actual_amount/, "report must use the amount that was actually verified");
assert.match(service, /verified_at/, "report must group receipts by payment verification time");
assert.match(service, /Asia\/Bangkok/, "daily boundaries must use the store time zone");
assert.match(service, /shipping_fee/, "report must expose received shipping fees");
assert.match(service, /discount_amount/, "report must expose applied discounts");
assert.match(route, /requireAdminApiPermission\(request, "analytics\.view"\)/, "revenue data needs analytics permission");
assert.match(route, /Cache-Control": "no-store"/, "revenue responses must not be cached");
assert.match(dashboard, /รายงานยอดรับรายวัน/, "admin dashboard must show the daily receipt report");
assert.match(dashboard, /ยอดรับวันนี้/, "admin dashboard must show today's received amount");
assert.match(dashboard, /ยังไม่หักต้นทุนหรือรายการคืนเงิน/, "dashboard must not present receipts as profit");

console.log("Daily revenue report verification passed (11 checks)");
