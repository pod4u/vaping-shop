import "server-only";

import { getUncachedServerSupabase } from "@/lib/supabase";
import {
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
    text: "✅ <b>เชื่อมต่อ Pod4U สำเร็จ</b>\n\nห้องนี้พร้อมรับการแจ้งเตือนออเดอร์ใหม่แล้วค่ะ",
    button: { label: "เปิดระบบแอดมิน", url: `${APP_URL}/admin/orders` },
  });
}

async function claimOrderCreatedEvent(orderId: string) {
  const client = getUncachedServerSupabase();
  const { error: insertError } = await client
    .from("telegram_notification_events")
    .upsert({ order_id: orderId, event_type: "order_created", status: "pending" }, {
      onConflict: "order_id,event_type",
      ignoreDuplicates: true,
    });
  if (insertError) throw insertError;

  const { data: existing, error: readError } = await client
    .from("telegram_notification_events")
    .select("id,status,attempt_count,next_attempt_at")
    .eq("order_id", orderId)
    .eq("event_type", "order_created")
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

async function buildOrderMessage(orderId: string) {
  const client = getUncachedServerSupabase();
  const [orderResult, itemsResult] = await Promise.all([
    client
      .from("orders")
      .select("id,order_number,order_source,status,subtotal,shipping_fee,discount_amount,total,shipping_name,shipping_phone,admin_note,created_at")
      .eq("id", orderId)
      .single(),
    client
      .from("order_items")
      .select("brand_name,product_name,flavor_name,quantity")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
  ]);
  if (orderResult.error) throw orderResult.error;
  if (itemsResult.error) throw itemsResult.error;
  const order = orderResult.data;
  const items = itemsResult.data ?? [];
  const quantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const adminNote = String(order.admin_note ?? "");
  const isTestOrder = adminNote.includes("ทดสอบ") || /(?:^|\s)\[?test\]?(?:\s|$)/i.test(adminNote);
  const itemLines = items.slice(0, 8).map((item, index) =>
    `${index + 1}. ${escapeHtml(item.brand_name)} · ${escapeHtml(item.product_name)} · ${escapeHtml(item.flavor_name)} × ${Number(item.quantity)}`,
  );
  if (items.length > 8) itemLines.push(`…และอีก ${items.length - 8} รายการ`);
  const createdAt = new Date(order.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" });
  return {
    text: [
      isTestOrder
        ? "🧪 <b>ออเดอร์ทดสอบ — ห้ามแพ็กหรือจัดส่ง</b>"
        : "🛒 <b>ออเดอร์ใหม่</b>",
      isTestOrder ? "⚠️ รายการนี้สร้างเพื่อตรวจระบบเท่านั้น ไม่ใช่คำสั่งซื้อของลูกค้า" : null,
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
      `<b>สถานะ:</b> รอตรวจสอบออเดอร์`,
      `<b>เวลา:</b> ${escapeHtml(createdAt)}`,
    ].filter(Boolean).join("\n"),
    url: `${APP_URL}/admin/orders/${encodeURIComponent(order.id)}`,
  };
}

export async function notifyOrderCreated(orderId: string): Promise<"sent" | "skipped" | "not_configured"> {
  const settings = await getTelegramSettings();
  if (!isTelegramTokenConfigured() || !settings?.enabled) return "not_configured";
  const eventId = await claimOrderCreatedEvent(orderId);
  if (!eventId) return "skipped";
  const client = getUncachedServerSupabase();
  try {
    const message = await buildOrderMessage(orderId);
    const result = await sendTelegramMessage({
      chatId: settings.chat_id,
      text: message.text,
      button: { label: "เปิดออเดอร์ในแอดมิน", url: message.url },
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

export async function notifyOrderCreatedSafely(orderId: string): Promise<void> {
  try {
    await notifyOrderCreated(orderId);
  } catch (error) {
    console.error("Telegram order alert failed", { message: safeDeliveryError(error) });
  }
}
