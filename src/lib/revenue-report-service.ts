import "server-only";

import { getUncachedServerSupabase } from "@/lib/supabase";

const REPORT_TIME_ZONE = "Asia/Bangkok";
const DAY_MS = 24 * 60 * 60 * 1000;

export interface DailyRevenueRow {
  date: string;
  orderCount: number;
  revenue: number;
  merchandise: number;
  shipping: number;
  discount: number;
}

function bangkokDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function number(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getDailyRevenueReport(days = 7) {
  if (!Number.isInteger(days) || days < 1 || days > 31) throw new Error("Revenue report range is invalid");

  const todayKey = bangkokDateKey(new Date());
  const todayStart = new Date(`${todayKey}T00:00:00+07:00`);
  const dateKeys = Array.from({ length: days }, (_, index) =>
    bangkokDateKey(new Date(todayStart.getTime() - (days - 1 - index) * DAY_MS)),
  );
  const startAt = new Date(`${dateKeys[0]}T00:00:00+07:00`).toISOString();
  const endAt = new Date(todayStart.getTime() + DAY_MS).toISOString();
  const client = getUncachedServerSupabase();

  const { data: payments, error: paymentError } = await client
    .from("order_payment_requests")
    .select("order_id,actual_amount,verified_at")
    .eq("status", "verified")
    .gte("verified_at", startAt)
    .lt("verified_at", endAt)
    .order("verified_at", { ascending: true })
    .limit(5000);
  if (paymentError) throw paymentError;

  const orderIds = (payments ?? []).map((payment) => String(payment.order_id));
  const { data: orders, error: orderError } = orderIds.length > 0
    ? await client
      .from("orders")
      .select("id,subtotal,shipping_fee,discount_amount,total")
      .in("id", orderIds)
    : { data: [], error: null };
  if (orderError) throw orderError;

  const orderById = new Map((orders ?? []).map((order) => [String(order.id), order]));
  const dailyByDate = new Map<string, DailyRevenueRow>(dateKeys.map((date) => [date, {
    date,
    orderCount: 0,
    revenue: 0,
    merchandise: 0,
    shipping: 0,
    discount: 0,
  }]));

  for (const payment of payments ?? []) {
    if (!payment.verified_at) continue;
    const date = bangkokDateKey(new Date(payment.verified_at));
    const row = dailyByDate.get(date);
    if (!row) continue;
    const order = orderById.get(String(payment.order_id));
    row.orderCount += 1;
    row.revenue += number(payment.actual_amount);
    row.merchandise += number(order?.subtotal);
    row.shipping += number(order?.shipping_fee);
    row.discount += number(order?.discount_amount);
  }

  const daily = dateKeys.map((date) => dailyByDate.get(date)!);
  const totals = daily.reduce((sum, row) => ({
    orderCount: sum.orderCount + row.orderCount,
    revenue: sum.revenue + row.revenue,
    merchandise: sum.merchandise + row.merchandise,
    shipping: sum.shipping + row.shipping,
    discount: sum.discount + row.discount,
  }), { orderCount: 0, revenue: 0, merchandise: 0, shipping: 0, discount: 0 });

  return {
    generatedAt: new Date().toISOString(),
    timeZone: REPORT_TIME_ZONE,
    today: daily[daily.length - 1],
    totals,
    daily,
  };
}
