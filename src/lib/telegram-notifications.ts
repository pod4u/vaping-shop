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

function maskPhone(value: unknown): string {
  const phone = String(value ?? "").replace(/\s+/g, "");
  if (phone.length < 4) return "ไม่ระบุ";
  return `${phone.slice(0, 3)}-xxx-${phone.slice(-4)}`;
}

function currency(value: unknown): string {
  return Number(value || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    text: "✅ <b>เชื่อมต่อ Pod4U สำเร็จ</b>\n\nห้องนี้พร้อมรับแจ้งเตือนทันทีเมื่อลูกค้าชำระเงินและออเดอร์พร้อมแพ็กค่ะ",
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
  if (existing.status === "sent" || existing.status === "sending") return null;
  if (new Date(existing.next_attempt_at).getTime() > Date.now()) return null;

  const { data: claimed, error: claimError } = await client
    .from("telegram_notification_events")
    .update({ status: "sending", attempt_count: Number(existing.attempt_count) + 1, last_error: null })
    .eq("id", existing.id)
    .in("status", ["pending", "failed"])
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
      .select("id,order_number,order_source,status,subtotal,shipping_fee,discount_amount,total,shipping_name,shipping_phone")
      .eq("id", orderId)
      .single(),
    client
      .from("order_items")
      .select("brand_name,product_name,flavor_name,quantity")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    client
      .from("order_payment_requests")
      .select("verified_at")
      .eq("order_id", orderId)
      .eq("status", "verified")
      .maybeSingle(),
  ]);
  if (orderResult.error) throw orderResult.error;
  if (itemsResult.error) throw itemsResult.error;
  if (paymentResult.error) throw paymentResult.error;
  const order = orderResult.data;
  if (!["confirmed", "shipped", "delivered"].includes(order.status)) {
    throw new Error("Telegram payment alert requires a confirmed order");
  }
  const items = itemsResult.data ?? [];
  const quantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const itemLines = items.slice(0, 8).map((item, index) =>
    `${index + 1}. ${escapeHtml(item.brand_name)} · ${escapeHtml(item.product_name)} · ${escapeHtml(item.flavor_name)} × ${Number(item.quantity)}`,
  );
  if (items.length > 8) itemLines.push(`…และอีก ${items.length - 8} รายการ`);
  const paidAt = new Date(paymentResult.data?.verified_at ?? Date.now()).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  });
  return {
    text: [
      "✅ <b>ชำระเงินแล้ว · พร้อมแพ็ก</b>",
      "",
      `<b>เลขที่:</b> ${escapeHtml(order.order_number)}`,
      `<b>ลูกค้า:</b> ${escapeHtml(order.shipping_name)} (${escapeHtml(maskPhone(order.shipping_phone))})`,
      `<b>ช่องทาง:</b> ${order.order_source === "line" ? "LINE OA" : "แอดมินกรอกเอง"}`,
      `<b>จำนวน:</b> ${quantity} ชิ้น`,
      "",
      ...itemLines,
      "",
      `<b>ยอดสินค้า:</b> ฿${currency(order.subtotal)}`,
      `<b>ค่าส่ง:</b> ฿${currency(order.shipping_fee)}`,
      Number(order.discount_amount || 0) > 0 ? `<b>ส่วนลด:</b> ฿${currency(order.discount_amount)}` : null,
      `<b>ยอดชำระ:</b> ฿${currency(order.total)}`,
      `<b>สถานะ:</b> รอคลังรับงาน`,
      `<b>ชำระเมื่อ:</b> ${escapeHtml(paidAt)}`,
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
    await client.from("telegram_notification_events").update({
      status: "sent",
      telegram_message_id: result.messageId,
      sent_at: new Date().toISOString(),
      last_error: null,
    }).eq("id", eventId);
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

export async function notifyPaymentReceivedSafely(orderId: string): Promise<void> {
  try {
    await notifyPaymentReceived(orderId);
  } catch (error) {
    console.error("Telegram payment alert failed", { message: safeDeliveryError(error) });
  }
}
