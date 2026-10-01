import { readFile } from "node:fs/promises";

const service = await readFile("src/lib/order-payment-service.ts", "utf8");
const webhook = await readFile("src/app/api/line/webhook/route.ts", "utf8");
const telegram = await readFile("src/lib/telegram-notifications.ts", "utf8");
const migration = await readFile(
  "supabase/migrations/20260908152125_order_payment_verification.sql",
  "utf8",
);

const failures = [];
if (!service.includes('form.append("checkDuplicate", "false")')) {
  failures.push("Thunder retry-safe duplicate option is missing");
}
if (!migration.includes("create unique index order_payment_requests_verified_transaction_key")) {
  failures.push("database transaction-reference uniqueness guard is missing");
}
if (!service.includes('error.code === "23505"')) {
  failures.push("duplicate transaction conflict handling is missing");
}
if (!telegram.includes('"SERVICE_EXPIRED"') || !service.includes("notifyPaymentVerificationProblemSafely")) {
  failures.push("Thunder provider outages must notify admins");
}
if (!webhook.includes("กรุณาไม่ต้องส่งสลิปซ้ำ")) {
  failures.push("customers must not be told to resend slips during provider outages");
}
if (!telegram.includes("ด่วน: ลูกค้าส่งสลิปแล้ว ระบบตรวจเงินขัดข้อง")) {
  failures.push("Telegram must clearly label manual payment-review alerts");
}

if (failures.length > 0) {
  console.error("Payment guard verification failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("✓ Payment retries are allowed while transaction references remain unique across orders.");
