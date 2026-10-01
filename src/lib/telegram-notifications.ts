import "server-only";

import { getUncachedServerSupabase } from "@/lib/supabase";
import {
  deleteTelegramMessage,
  discoverTelegramChats,
  isTelegramTokenConfigured,
  sendTelegramMessage,
  verifyTelegramChat,
  type TelegramChatCandidate,
} from "@/lib/telegram-client";

const SETTINGS_ID = "order_alerts";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://www.pod4u.store").replace(/\/$/, "");

interface TelegramSettingsRow {
  id: string;
  chat_id: string;
  chat_title: string;
  chat_type: TelegramChatCandidate["type"];
  enabled: boolean;
  updated_at: string;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function currency(value: unknown): string {
  return Number(value || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function itemPrice(value: unknown): string {
  return Number(value || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 });
}

function safeDeliveryError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Telegram delivery failed";
  return message.replace(/\d{8,}:[A-Za-z0-9_-]+/g, "[redacted]").slice(0, 300);
}

export async function getTelegramSettings(): Promise<TelegramSettingsRow | null> {
  const { data, error } = await getUncachedServerSupabase()
    .from("telegram_notification_settings")
    .select("id,chat_id,chat_title,chat_type,enabled,updated_at")
    .eq("id", SETTINGS_ID)
    .maybeSingle();
  if (error) throw error;
  return data as TelegramSettingsRow | null;
}

export async function getTelegramAdminStatus() {
  const settings = await getTelegramSettings();
  const { data: latestEvent } = await getUncachedServerSupabase()
    .from("telegram_notification_events")
    .select("status,sent_at,last_error,updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return {
    tokenConfigured: isTelegramTokenConfigured(),
    connected: Boolean(settings?.enabled && settings.chat_id),
    destination: settings ? {
      id: settings.chat_id,
      title: settings.chat_title,
      type: settings.chat_type,
      enabled: settings.enabled,
      updatedAt: settings.updated_at,
    } : null,
    latestDelivery: latestEvent ?? null,
  };
}

export async function findTelegramDestinations(): Promise<TelegramChatCandidate[]> {
  return discoverTelegramChats();
}

export async function connectTelegramDestination(chatId: string, updatedBy: string) {
  const chat = await verifyTelegramChat(chatId);
  const { error } = await getUncachedServerSupabase()
    .from("telegram_notification_settings")
    .upsert({
      id: SETTINGS_ID,
      chat_id: chat.id,
      chat_title: chat.title,
      chat_type: chat.type,
      enabled: true,
      updated_by: updatedBy,
    }, { onConflict: "id" });
  if (error) throw error;
  return chat;
}

export async function sendTelegramTestMessage(): Promise<void> {
  const settings = await getTelegramSettings();
  if (!settings?.enabled) throw new Error("ยังไม่ได้เลือกห้อง Telegram สำหรับรับแจ้งเตือน");
  await sendTelegramMessage({
    chatId: settings.chat_id,
    text: [
      "🧪 <b>ทดสอบระบบ — ไม่ใช่ออเดอร์ลูกค้า</b>",
      "",
      "✅ <b>ชำระเงินแล้ว · พร้อมแพ็กและจัดส่ง</b>",
      "💳 ตรวจสอบยอดชำระผ่านแล้ว",
      "📦 คลังสามารถเริ่มแพ็กสินค้าและจัดส่งได้ทันที",
      "",
      "เลขที่ TEST-P4U-0001",
      "",
      "🛍️ <b>รายการสินค้า</b>",
      "1. สินค้าทดสอบ · รสชาติทดสอบ",
      "   1 ชิ้น × ฿0",
      "",
      "ยอดรวม ฿0.00",
      "",
      "📍 <b>ข้อมูลจัดส่ง</b>",
      "ผู้รับ: ลูกค้าทดสอบ",
      "โทร: 000-000-0000",
      "ที่อยู่: ข้อมูลจำลองสำหรับทดสอบระบบเท่านั้น",
    ].join("\n"),
    button: { label: "เปิดระบบคลัง", url: `${APP_URL}/warehouse` },
  });
}

export async function deleteTestOrderTelegramMessage(orderId: string): Promise<boolean> {
  const client = getUncachedServerSupabase();
  const [{ data: order, error: orderError }, settings, { data: event, error: eventError }] = await Promise.all([
    client.from("orders").select("status,admin_note").eq("id", orderId).single(),
    getTelegramSettings(),
    client
      .from("telegram_notification_events")
      .select("telegram_message_id")
      .eq("order_id", orderId)
      .eq("event_type", "order_created")
      .maybeSingle(),
  ]);
  if (orderError) throw orderError;
  if (eventError) throw eventError;
  const note = String(order.admin_note ?? "");
  const isTestOrder = note.includes("ทดสอบ") || /(?:^|\s)\[?test\]?(?:\s|$)/i.test(note);
  if (order.status !== "draft" || !isTestOrder) {
    throw new Error("ลบได้เฉพาะข้อความของออเดอร์ทดสอบสถานะ Draft เท่านั้น");
  }
  if (!settings?.chat_id || !event?.telegram_message_id) return false;
  await deleteTelegramMessage(settings.chat_id, Number(event.telegram_message_id));
  return true;
}

type TelegramOrderEvent = "order_created" | "payment_received" | "warehouse_problem";

export const PAYMENT_PROVIDER_FAILURE_CODES = new Set([
  "API_SERVER_ERROR", "BRANCH_INACTIVE", "INTERNAL_SERVER_ERROR", "INVALID_API_KEY",
  "IP_NOT_ALLOWED", "MISSING_API_KEY", "QUOTA_EXCEEDED",
  "RENEWAL_TEMPORARILY_UNAVAILABLE", "SERVICE_EXPIRED",
]);

async function claimTelegramEvent(orderId: string, eventType: TelegramOrderEvent) {
  const client = getUncachedServerSupabase();
  const { error: insertError } = await client
    .from("telegram_notification_events")
    .upsert({ order_id: orderId, event_type: eventType, status: "pending" }, {
      onConflict: "order_id,event_type",
      ignoreDuplicates: true,
    });
  if (insertError) throw insertError;

  const { data: existing, error: readError } = await client
    .from("telegram_notification_events")
    .select("id,status,attempt_count,next_attempt_at")
    .eq("order_id", orderId)
    .eq("event_type", eventType)
    .single();
  if (readError) throw readError;
  if (existing.status === "sent") return null;
  if (new Date(existing.next_attempt_at).getTime() > Date.now()) return null;
  if (Number(existing.attempt_count) >= 20) return null;

  const { data: claimed, error: claimError } = await client
    .from("telegram_notification_events")
    .update({
      status: "sending",
      attempt_count: Number(existing.attempt_count) + 1,
      next_attempt_at: new Date(Date.now() + 2 * 60_000).toISOString(),
      last_error: null,
    })
    .eq("id", existing.id)
    .eq("attempt_count", existing.attempt_count)
    .in("status", ["pending", "failed", "sending"])
    .select("id")
    .maybeSingle();
  if (claimError) throw claimError;
  return claimed?.id ? String(claimed.id) : null;
}

async function buildPaymentReceivedMessage(orderId: string) {
  const client = getUncachedServerSupabase();
  const [orderResult, itemsResult, paymentResult] = await Promise.all([
    client
      .from("orders")
      .select("id,order_number,status,total,shipping_name,shipping_phone,shipping_address,shipping_province,shipping_postal_code")
      .eq("id", orderId)
      .single(),
    client
      .from("order_items")
      .select("brand_name,product_name,flavor_name,unit_price,quantity")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    client.from("order_payment_requests")
      .select("status,verification_method")
      .eq("order_id", orderId).maybeSingle(),
  ]);
  if (orderResult.error) throw orderResult.error;
  if (itemsResult.error) throw itemsResult.error;
  if (paymentResult.error) throw paymentResult.error;
  const order = orderResult.data;
  if (!["confirmed", "shipped", "delivered"].includes(order.status)
    || paymentResult.data?.status !== "verified") {
    throw new Error("Telegram payment alert requires a confirmed order");
  }
  const manualBank = paymentResult.data.verification_method === "manual_bank";
  const items = itemsResult.data ?? [];
  const itemLines = items.slice(0, 20).map((item, index) =>
    `${index + 1}. ${escapeHtml(item.brand_name)} · ${escapeHtml(item.product_name)} · ${escapeHtml(item.flavor_name)}\n   ${Number(item.quantity)} ชิ้น × ฿${itemPrice(item.unit_price)}`,
  );
  if (items.length > 20) itemLines.push(`…และอีก ${items.length - 20} รายการ กรุณาเปิดดูในระบบคลัง`);
  const address = [order.shipping_address, order.shipping_province, order.shipping_postal_code]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" ");
  return {
    text: [
      "✅ <b>ชำระเงินแล้ว · พร้อมแพ็กและจัดส่ง</b>",
      manualBank
        ? "💳 แอดมินตรวจยอดเข้าบัญชีร้านและยืนยันด้วยมือ · ไม่ใช่ผลตรวจจาก Thunder"
        : "💳 ตรวจสอบสลิปผ่าน Thunder แล้ว · ยอดชำระถูกต้อง",
      "📦 คลังสามารถเริ่มแพ็กสินค้าและจัดส่งได้ทันที",
      "",
      `เลขที่ ${escapeHtml(order.order_number)}`,
      "",
      "🛍️ <b>รายการสินค้า</b>",
      ...itemLines,
      "",
      `ยอดรวม ฿${currency(order.total)}`,
      "",
      "📍 <b>ข้อมูลจัดส่ง</b>",
      `ผู้รับ: ${escapeHtml(order.shipping_name)}`,
      `โทร: ${escapeHtml(order.shipping_phone)}`,
      `ที่อยู่: ${address}`,
    ].filter(Boolean).join("\n"),
    url: `${APP_URL}/warehouse/orders/${encodeURIComponent(order.id)}`,
  };
}

export async function notifyPaymentReceived(orderId: string): Promise<"sent" | "skipped" | "not_configured"> {
  const settings = await getTelegramSettings();
  if (!isTelegramTokenConfigured() || !settings?.enabled) return "not_configured";
  const eventId = await claimTelegramEvent(orderId, "payment_received");
  if (!eventId) return "skipped";
  const client = getUncachedServerSupabase();
  try {
    const message = await buildPaymentReceivedMessage(orderId);
    const result = await sendTelegramMessage({
      chatId: settings.chat_id,
      text: message.text,
      button: { label: "เปิดงานในระบบคลัง", url: message.url },
    });
    const { error: deliveryError } = await client.from("telegram_notification_events").update({
      status: "sent",
      telegram_message_id: result.messageId,
      sent_at: new Date().toISOString(),
      last_error: null,
    }).eq("id", eventId);
    if (deliveryError) throw deliveryError;
    return "sent";
  } catch (error) {
    await client.from("telegram_notification_events").update({
      status: "failed",
      last_error: safeDeliveryError(error),
      next_attempt_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    }).eq("id", eventId);
    throw error;
  }
}

export async function resendPaymentReceived(orderId: string): Promise<"sent" | "not_configured"> {
  const settings = await getTelegramSettings();
  if (!isTelegramTokenConfigured() || !settings?.enabled) return "not_configured";

  const client = getUncachedServerSupabase();
  const [{ data: event, error: eventError }, message] = await Promise.all([
    client
      .from("telegram_notification_events")
      .select("id,attempt_count")
      .eq("order_id", orderId)
      .eq("event_type", "payment_received")
      .maybeSingle(),
    buildPaymentReceivedMessage(orderId),
  ]);
  if (eventError) throw eventError;

  const result = await sendTelegramMessage({
    chatId: settings.chat_id,
    text: message.text,
    button: { label: "เปิดงานในระบบคลัง", url: message.url },
  });

  const sentAt = new Date().toISOString();
  const eventWrite = event?.id
    ? client.from("telegram_notification_events").update({
      status: "sent",
      attempt_count: Number(event.attempt_count) + 1,
      telegram_message_id: result.messageId,
      sent_at: sentAt,
      last_error: null,
    }).eq("id", event.id)
    : client.from("telegram_notification_events").insert({
      order_id: orderId,
      event_type: "payment_received",
      status: "sent",
      attempt_count: 1,
      telegram_message_id: result.messageId,
      sent_at: sentAt,
      last_error: null,
    });
  const { error: eventWriteError } = await eventWrite;
  if (eventWriteError) {
    console.error("Telegram manual resend audit update failed", { message: safeDeliveryError(eventWriteError) });
  }
  return "sent";
}

export async function notifyPaymentReceivedSafely(orderId: string): Promise<void> {
  try {
    await notifyPaymentReceived(orderId);
  } catch (error) {
    console.error("Telegram payment alert failed", { message: safeDeliveryError(error) });
  }
}

export async function notifyPaymentVerificationProblem(
  orderId: string,
  _failureCode?: string,
): Promise<"sent" | "skipped" | "not_configured"> {
  // Reserve the delivery record before checking configuration so outages remain
  // visible and retryable even when the bot or destination is temporarily absent.
  const eventId = await claimTelegramEvent(orderId, "warehouse_problem");
  if (!eventId) return "skipped";
  const client = getUncachedServerSupabase();
  try {
    const settings = await getTelegramSettings();
    if (!isTelegramTokenConfigured() || !settings?.enabled) {
      throw new Error("Telegram bot or destination is not configured");
    }
    const { text, url } = await buildPaymentVerificationProblemMessage(orderId);
    const result = await sendTelegramMessage({
      chatId: settings.chat_id,
      text,
      button: { label: "เปิดออเดอร์ในแอดมิน", url },
    });

    const { error: deliveryError } = await client.from("telegram_notification_events").update({
      status: "sent",
      telegram_message_id: result.messageId,
      sent_at: new Date().toISOString(),
      last_error: null,
    }).eq("id", eventId);
    if (deliveryError) throw deliveryError;
    return "sent";
  } catch (error) {
    const { error: eventError } = await client.from("telegram_notification_events").update({
      status: "failed",
      last_error: safeDeliveryError(error),
      next_attempt_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    }).eq("id", eventId);
    if (eventError) console.error("Failed to record Telegram alert failure", { message: safeDeliveryError(eventError) });
    throw error;
  }
}

async function buildPaymentVerificationProblemMessage(orderId: string) {
  const client = getUncachedServerSupabase();
  const [{ data: order, error: orderError }, { data: payment, error: paymentError }] = await Promise.all([
    client.from("orders").select("id,order_number,total,status").eq("id", orderId).single(),
    client.from("order_payment_requests")
      .select("status,failure_code,line_message_id,expires_at")
      .eq("order_id", orderId).single(),
  ]);
  if (orderError) throw orderError;
  if (paymentError) throw paymentError;
  if (order.status !== "pending" || payment.status !== "awaiting_slip"
    || !PAYMENT_PROVIDER_FAILURE_CODES.has(String(payment.failure_code))) {
    throw new Error("Order is not awaiting manual review for a payment provider failure");
  }
  return {
    text: [
      "⚠️ <b>ด่วน: ลูกค้าส่งสลิปแล้ว ระบบตรวจเงินขัดข้อง</b>",
      "Thunder ตรวจสลิปไม่ได้ กรุณาเช็กยอดเงินเข้าในแอปธนาคารของร้าน",
      "⛔ ยังไม่ได้ยืนยันว่าชำระเงินจริง อย่าเพิ่งให้คลังแพ็กสินค้า",
      "",
      `เลขที่ ${escapeHtml(order.order_number)}`,
      `ยอดที่ต้องตรวจ ฿${currency(order.total)}`,
      `สาเหตุ: ${escapeHtml(payment.failure_code)}`,
      `รับสลิปใน LINE: ${payment.line_message_id ? "แล้ว" : "ยังไม่มีข้อมูล"}`,
      `จองสินค้าไว้ถึง: ${new Date(payment.expires_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}`,
    ].join("\n"),
    url: `${APP_URL}/admin/orders/${encodeURIComponent(order.id)}`,
  };
}

export async function resendPaymentVerificationProblem(orderId: string): Promise<"sent" | "not_configured"> {
  const settings = await getTelegramSettings();
  if (!isTelegramTokenConfigured() || !settings?.enabled) return "not_configured";
  const message = await buildPaymentVerificationProblemMessage(orderId);
  const result = await sendTelegramMessage({
    chatId: settings.chat_id,
    text: message.text,
    button: { label: "เปิดออเดอร์ในแอดมิน", url: message.url },
  });
  const client = getUncachedServerSupabase();
  const { data: existing, error: readError } = await client.from("telegram_notification_events")
    .select("attempt_count").eq("order_id", orderId).eq("event_type", "warehouse_problem").maybeSingle();
  if (readError) throw readError;
  const { error: writeError } = await client.from("telegram_notification_events").upsert({
    order_id: orderId,
    event_type: "warehouse_problem",
    status: "sent",
    attempt_count: Math.min(Number(existing?.attempt_count ?? 0) + 1, 20),
    telegram_message_id: result.messageId,
    sent_at: new Date().toISOString(),
    last_error: null,
  }, { onConflict: "order_id,event_type" });
  if (writeError) throw writeError;
  return "sent";
}

export async function reconcileTelegramPaymentAlerts(): Promise<{ reviewed: number; sent: number; failed: number }> {
  const client = getUncachedServerSupabase();
  const since = new Date(Date.now() - 48 * 60 * 60_000).toISOString();
  const [{ data: problems, error: problemError }, { data: verified, error: verifiedError }] = await Promise.all([
    client.from("order_payment_requests")
      .select("order_id,failure_code")
      .eq("status", "awaiting_slip")
      .gt("expires_at", new Date().toISOString())
      .gte("updated_at", since)
      .not("failure_code", "is", null)
      .order("updated_at", { ascending: false }).limit(10),
    client.from("order_payment_requests")
      .select("order_id")
      .eq("status", "verified")
      .gte("verified_at", since)
      .order("verified_at", { ascending: false }).limit(10),
  ]);
  if (problemError) throw problemError;
  if (verifiedError) throw verifiedError;

  let reviewed = 0;
  let sent = 0;
  let failed = 0;
  for (const payment of problems ?? []) {
    if (!PAYMENT_PROVIDER_FAILURE_CODES.has(String(payment.failure_code))) continue;
    if (reviewed >= 8 || failed > 0) break;
    reviewed += 1;
    try {
      if (await notifyPaymentVerificationProblem(String(payment.order_id)) === "sent") sent += 1;
    } catch { failed += 1; }
  }
  for (const payment of verified ?? []) {
    if (reviewed >= 8 || failed > 0) break;
    reviewed += 1;
    try {
      if (await notifyPaymentReceived(String(payment.order_id)) === "sent") sent += 1;
    } catch { failed += 1; }
  }
  return { reviewed, sent, failed };
}

export async function notifyPaymentVerificationProblemSafely(
  orderId: string,
  failureCode: string,
): Promise<void> {
  try {
    await notifyPaymentVerificationProblem(orderId, failureCode);
  } catch (error) {
    console.error("Telegram payment verification problem alert failed", {
      message: safeDeliveryError(error),
    });
  }
}
