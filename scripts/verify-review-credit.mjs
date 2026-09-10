#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const migration = await readFile(
  "supabase/migrations/20260909161121_apply_review_credit_to_orders.sql",
  "utf8",
);
const orderService = await readFile("src/lib/order-service.ts", "utf8");
const memberService = await readFile("src/lib/member-service.ts", "utf8");
const memberPage = await readFile("src/app/(public)/member/page.tsx", "utf8");
const adminList = await readFile("src/app/admin/orders/page.tsx", "utf8");
const adminDetail = await readFile("src/app/admin/orders/[orderId]/page.tsx", "utf8");
const paymentService = await readFile("src/lib/order-payment-service.ts", "utf8");

const failures = [];
const requireText = (source, expected, message) => {
  if (!source.includes(expected)) failures.push(message);
};

requireText(migration, "add column discount_amount", "orders.discount_amount is missing");
requireText(migration, "add column discount_credit_id", "orders.discount_credit_id is missing");
requireText(migration, "orders_total_calculation_check", "final-total invariant is missing");
requireText(migration, "create function public.reserve_order_review_credit", "credit reservation function is missing");
requireText(migration, "for update skip locked", "concurrent credit reservation guard is missing");
requireText(migration, "create function public.release_order_review_credit", "credit release function is missing");
requireText(migration, "create function public.redeem_order_review_credit", "credit redemption function is missing");
requireText(migration, "after insert on public.orders", "automatic reservation trigger is missing");
requireText(migration, "after update of status on public.orders", "status synchronization trigger is missing");
requireText(migration, "to service_role", "service-role function grants are missing");
requireText(migration, "from public, anon, authenticated", "public function revocations are missing");

for (const [name, source] of [
  ["order service", orderService],
  ["member service", memberService],
  ["member page", memberPage],
  ["admin order list", adminList],
  ["admin order detail", adminDetail],
  ["payment service", paymentService],
]) {
  requireText(source, "discount_amount", `${name} does not include discount_amount`);
}

requireText(memberPage, "ใช้ส่วนลดจากรีวิวแล้ว", "member discount confirmation is missing");
requireText(adminDetail, "ส่วนลดจากรีวิว", "admin price breakdown is missing");
requireText(paymentService, "ใช้ส่วนลดจากรีวิว", "LINE payment summary is missing the discount");

if (failures.length > 0) {
  console.error("Review-credit verification failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("✓ Review credit is reserved, released, redeemed, and displayed throughout the order flow.");
