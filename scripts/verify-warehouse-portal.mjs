import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20260910151811_warehouse_fulfillment_portal.sql");
const middleware = read("src/middleware.ts");
const auth = read("src/lib/warehouse-auth.ts");
const shipment = read("src/app/api/warehouse/orders/[orderId]/shipment/route.ts");
const detail = read("src/app/warehouse/orders/[orderId]/page.tsx");
const warehouseService = read("src/lib/warehouse-service.ts");
const supabase = read("src/lib/supabase.ts");

assert.match(migration, /enable row level security/i, "warehouse table must enable RLS");
assert.match(migration, /revoke all on table public\.warehouse_fulfillments from public, anon, authenticated/i);
assert.match(migration, /grant execute on function public\.update_warehouse_fulfillment[\s\S]*to service_role/i);
assert.match(migration, /grant execute on function public\.mark_warehouse_order_shipped[\s\S]*to service_role/i);
assert.match(migration, /new\.status = 'confirmed'/, "only confirmed orders enter the warehouse queue");
assert.match(migration, /v_job\.status <> 'packed'/, "shipping must require a packed job");
assert.match(middleware, /\/warehouse\/:path\*/, "warehouse pages must be protected by middleware");
assert.match(middleware, /\/api\/warehouse\/:path\*/, "warehouse APIs must be protected by middleware");
assert.match(auth, /WAREHOUSE_SESSION_SECRET/, "warehouse session must use a separate secret");
assert.match(auth, /warehouse_session/, "warehouse must use a separate cookie");
assert.match(shipment, /!result\.idempotent_replay/, "LINE must not be pushed again for an idempotent shipment");
assert.match(detail, /window\.confirm/, "shipment must require a confirmation step");
assert.doesNotMatch(detail, /payment|slip|discount|review/i, "warehouse UI must not expose payment or customer-history fields");
assert.match(warehouseService, /getUncachedServerSupabase/, "warehouse reads must bypass the Next.js fetch cache");
assert.match(supabase, /cache:\s*['\"]no-store['\"]/, "uncached server client must disable the fetch cache");

console.log("Warehouse portal verification passed (14 checks)");
