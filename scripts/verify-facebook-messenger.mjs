import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = {
  service: await readFile("src/lib/facebook-messenger.ts", "utf8"),
  webhook: await readFile("src/app/api/facebook/webhook/route.ts", "utf8"),
  adminApi: await readFile("src/app/api/admin/facebook/route.ts", "utf8"),
  adminPage: await readFile("src/app/admin/facebook/page.tsx", "utf8"),
  migration: await readFile("supabase/migrations/20260927160021_facebook_messenger_inbox.sql", "utf8"),
};

assert.match(files.webhook, /x-hub-signature-256/, "Webhook must verify Meta signature");
assert.match(files.service, /timingSafeEqual/, "Secret comparisons must be timing safe");
assert.match(files.service, /recentlySentAutomation/, "Automation must suppress duplicate replies");
assert.match(files.service, /FACEBOOK_PAGE_ACCESS_TOKEN/, "Send API token must stay server-side");
assert.doesNotMatch(files.service, /NEXT_PUBLIC_FACEBOOK/, "Facebook secrets must not be public");
assert.match(files.migration, /enable row level security/g, "Messenger tables must enable RLS");
assert.match(files.migration, /revoke all.*anon/s, "Messenger data must not be available to anon");
assert.match(files.adminApi, /requireAdminApiPermission/, "Admin inbox API must require admin permission");
assert.match(files.adminPage, /ตอบอัตโนมัติ/, "Admin inbox must label automatic replies");

console.log("Facebook Messenger verification passed");
