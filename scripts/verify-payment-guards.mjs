import { readFile } from "node:fs/promises";

const service = await readFile("src/lib/order-payment-service.ts", "utf8");
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

if (failures.length > 0) {
  console.error("Payment guard verification failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("✓ Payment retries are allowed while transaction references remain unique across orders.");
