import "server-only";

import crypto from "node:crypto";
import { fuzzySearchProducts } from "@/lib/fuzzy-search";
import {
  isGreeting,
  isOrderHelpQuestion,
  isPaymentQuestion,
  isProductAvailabilityQuestion,
  isShippingQuestion,
  isTrackingQuestion,
} from "@/lib/line-automation";
import { getUncachedServerSupabase } from "@/lib/supabase";

const graphVersion = process.env.FACEBOOK_GRAPH_API_VERSION?.trim() || "v23.0";
const stockUrl = "https://www.pod4u.store/stock?source=facebook";
const memberUrl = "https://www.pod4u.store/member?source=facebook";

type MessengerEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    attachments?: Array<{ type?: string; payload?: Record<string, unknown> }>;
  };
  postback?: { mid?: string; title?: string; payload?: string };
};

type StoredConversation = {
  id: string;
  page_id: string;
  participant_id: string;
  display_name: string | null;
  profile_picture_url: string | null;
  status: "open" | "resolved";
  unread_count: number;
  last_message_preview: string | null;
  last_message_at: string;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
};

function getRequiredEnv(name: "FACEBOOK_APP_SECRET" | "FACEBOOK_PAGE_ACCESS_TOKEN" | "FACEBOOK_WEBHOOK_VERIFY_TOKEN") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function getFacebookMessengerStatus() {
  return {
    appConfigured: Boolean(process.env.FACEBOOK_APP_ID?.trim() && process.env.FACEBOOK_APP_SECRET?.trim()),
    webhookConfigured: Boolean(process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN?.trim()),
    pageConnected: Boolean(process.env.FACEBOOK_PAGE_ID?.trim() && process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim()),
    pageId: process.env.FACEBOOK_PAGE_ID?.trim() || null,
  };
}

export function verifyFacebookWebhook(rawBody: string, signature: string | null) {
  if (!signature?.startsWith("sha256=")) return false;
  const expected = `sha256=${crypto.createHmac("sha256", getRequiredEnv("FACEBOOK_APP_SECRET")).update(rawBody).digest("hex")}`;
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function verifyFacebookChallenge(mode: string | null, token: string | null, challenge: string | null) {
  if (mode !== "subscribe" || !challenge) return null;
  const expected = getRequiredEnv("FACEBOOK_WEBHOOK_VERIFY_TOKEN");
  const receivedBuffer = Buffer.from(token || "");
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)) return null;
  return challenge;
}

async function fetchParticipantProfile(participantId: string) {
  const accessToken = getRequiredEnv("FACEBOOK_PAGE_ACCESS_TOKEN");
  const url = new URL(`https://graph.facebook.com/${graphVersion}/${encodeURIComponent(participantId)}`);
  url.searchParams.set("fields", "first_name,last_name,profile_pic");
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;
  const body = await response.json() as Record<string, unknown>;
  const name = [body.first_name, body.last_name].filter((value) => typeof value === "string").join(" ").trim();
  return {
    displayName: name || null,
    profilePictureUrl: typeof body.profile_pic === "string" ? body.profile_pic : null,
  };
}

async function upsertConversation(pageId: string, participantId: string, preview: string, timestamp: string) {
  const client = getUncachedServerSupabase();
  const { data: existing, error: readError } = await client
    .from("facebook_conversations")
    .select("id,display_name,profile_picture_url,unread_count")
    .eq("page_id", pageId)
    .eq("participant_id", participantId)
    .maybeSingle();
  if (readError) throw readError;

  const profile = existing?.display_name ? null : await fetchParticipantProfile(participantId).catch(() => null);
  const row = {
    page_id: pageId,
    participant_id: participantId,
    display_name: existing?.display_name || profile?.displayName || null,
    profile_picture_url: existing?.profile_picture_url || profile?.profilePictureUrl || null,
    status: "open",
    unread_count: Number(existing?.unread_count || 0) + 1,
    last_message_preview: preview.slice(0, 300),
    last_message_at: timestamp,
    last_inbound_at: timestamp,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client
    .from("facebook_conversations")
    .upsert(row, { onConflict: "page_id,participant_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data as StoredConversation;
}

async function saveInboundMessage(conversationId: string, event: MessengerEvent, text: string | null, timestamp: string) {
  const providerMessageId = event.message?.mid || event.postback?.mid || null;
  const attachments = event.message?.attachments || [];
  const messageType = text
    ? "text"
    : event.postback
      ? "postback"
      : attachments.some((attachment) => attachment.type === "image")
        ? "image"
        : attachments.length
          ? "attachment"
          : "unknown";
  const { error } = await getUncachedServerSupabase().from("facebook_messages").insert({
    conversation_id: conversationId,
    provider_message_id: providerMessageId,
    direction: "inbound",
    message_type: messageType,
    message_text: text,
    payload: {
      attachments: attachments.map((attachment) => ({ type: attachment.type || "unknown" })),
      postbackPayload: event.postback?.payload || null,
      receivedAt: timestamp,
    },
    created_at: timestamp,
  });
  if (error?.code === "23505") return false;
  if (error) throw error;
  return true;
}

async function recentlySentAutomation(conversationId: string, automationKey: string, minutes: number) {
  const after = new Date(Date.now() - minutes * 60_000).toISOString();
  const { data, error } = await getUncachedServerSupabase()
    .from("facebook_messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("direction", "outbound")
    .eq("automation_key", automationKey)
    .gte("created_at", after)
    .limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}

export async function sendFacebookTextMessage(input: {
  participantId: string;
  conversationId?: string;
  text: string;
  automationKey?: string | null;
}) {
  const accessToken = getRequiredEnv("FACEBOOK_PAGE_ACCESS_TOKEN");
  const response = await fetch(`https://graph.facebook.com/${graphVersion}/me/messages?access_token=${encodeURIComponent(accessToken)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: input.participantId },
      messaging_type: "RESPONSE",
      message: { text: input.text.slice(0, 2000) },
    }),
    cache: "no-store",
  });
  const result = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(`Facebook Send API failed (${response.status})`);

  if (input.conversationId) {
    const now = new Date().toISOString();
    const client = getUncachedServerSupabase();
    const { error: messageError } = await client.from("facebook_messages").insert({
      conversation_id: input.conversationId,
      provider_message_id: typeof result.message_id === "string" ? result.message_id : null,
      direction: "outbound",
      message_type: "text",
      message_text: input.text,
      automation_key: input.automationKey || null,
      payload: {},
      created_at: now,
    });
    if (messageError && messageError.code !== "23505") throw messageError;
    const { error: conversationError } = await client.from("facebook_conversations").update({
      last_message_preview: input.text.slice(0, 300),
      last_message_at: now,
      last_outbound_at: now,
      updated_at: now,
    }).eq("id", input.conversationId);
    if (conversationError) throw conversationError;
  }
  return result;
}

async function buildAutomaticReply(message: string) {
  const normalized = message.trim().toLowerCase();
  if (isGreeting(normalized)) {
    return {
      key: "greeting",
      cooldownMinutes: 720,
      text: `สวัสดีค่ะ ยินดีต้อนรับสู่ Pod4U 💚\n\nดูสินค้าพร้อมส่งและจำนวนคงเหลือล่าสุดได้ที่ ${stockUrl}\n\nวันนี้ลูกค้ากำลังมองหาแบรนด์หรือรสไหนอยู่คะ`,
    };
  }
  if (isShippingQuestion(normalized)) {
    return {
      key: "shipping",
      cooldownMinutes: 30,
      text: `ค่าจัดส่งทั่วไทย 50 บาทค่ะ\nเฉพาะสินค้าดูดแล้วทิ้ง ตั้งแต่ 3 ชิ้นขึ้นไปส่งฟรีค่ะ\n\nดูสินค้าพร้อมส่ง: ${stockUrl}`,
    };
  }
  if (isPaymentQuestion(normalized)) {
    return {
      key: "payment",
      cooldownMinutes: 30,
      text: `หลังยืนยันออเดอร์ ระบบจะส่งยอดและบัญชีรับชำระให้อัตโนมัติค่ะ จากนั้นโอนยอดให้ตรงและส่งรูปสลิปในแชทได้เลย\n\nเริ่มสั่งซื้อ: ${stockUrl}`,
    };
  }
  if (isTrackingQuestion(normalized)) {
    return {
      key: "order-status",
      cooldownMinutes: 30,
      text: `ตรวจสอบสถานะออเดอร์และการจัดส่งได้ในระบบสมาชิกค่ะ หากขึ้นว่า “จัดส่งแล้ว” กรุณารอรับสินค้าภายในไม่เกิน 2 วัน\n\n${memberUrl}`,
    };
  }
  if (isOrderHelpQuestion(normalized)) {
    return {
      key: "order-help",
      cooldownMinutes: 30,
      text: `สั่งซื้อง่าย ๆ 3 ขั้นตอนค่ะ\n1. ดูสินค้าพร้อมส่ง\n2. เข้าสู่ระบบสมาชิกและเพิ่มที่อยู่\n3. เพิ่มตะกร้า แล้วยืนยันรายการ\n\nเริ่มเลือกสินค้า: ${stockUrl}`,
    };
  }
  if (isProductAvailabilityQuestion(normalized) || /(?:มาโบ|มาร์โบ|m\s*bar|relx|alfa|พอต|pod)/i.test(normalized)) {
    const products = await fuzzySearchProducts(message, 5);
    const available = products.filter((product) => product.stock > 0);
    if (available.length) {
      const lines = available.map((product) => `• ${product.brandNameTh || product.brandName} ${product.productNameTh || product.productName} · ${product.flavorNameTh || product.flavorName} — ฿${product.price.toLocaleString("th-TH")} (${product.stock} ชิ้น)`);
      return {
        key: `product:${available[0].brandId || "match"}`,
        cooldownMinutes: 15,
        text: `รายการที่พร้อมส่งตอนนี้ค่ะ\n${lines.join("\n")}\n\nกดดูรายละเอียดและสั่งซื้อได้ที่ ${stockUrl}\nลูกค้ารับรสไหนและกี่ชิ้นดีคะ`,
      };
    }
    return {
      key: "product-not-found",
      cooldownMinutes: 30,
      text: `ตอนนี้ร้านจำหน่ายเฉพาะสินค้าที่แสดงในหน้า “สินค้าพร้อมส่ง” ค่ะ สินค้าในรูปหรือชื่อที่ส่งมาอาจไม่มีจำหน่าย\n\nเช็กสินค้าจริงล่าสุดได้ที่ ${stockUrl}\nสนใจให้ช่วยแนะนำจากแบรนด์หรือรสที่ชอบไหมคะ`,
    };
  }
  return null;
}

export async function processFacebookMessengerEvent(pageId: string, event: MessengerEvent) {
  if (event.message?.is_echo) return "ignored" as const;
  const participantId = event.sender?.id?.trim();
  if (!participantId || participantId === pageId) return "ignored" as const;
  const text = typeof event.message?.text === "string"
    ? event.message.text.trim()
    : typeof event.postback?.title === "string"
      ? event.postback.title.trim()
      : null;
  const preview = text || (event.message?.attachments?.length ? "ส่งไฟล์แนบ" : "ข้อความใหม่");
  const timestamp = event.timestamp ? new Date(event.timestamp).toISOString() : new Date().toISOString();
  const conversation = await upsertConversation(pageId, participantId, preview, timestamp);
  const inserted = await saveInboundMessage(conversation.id, event, text, timestamp);
  if (!inserted || !text) return inserted ? "stored" as const : "duplicate" as const;

  const reply = await buildAutomaticReply(text);
  if (!reply) return "stored" as const;
  if (await recentlySentAutomation(conversation.id, reply.key, reply.cooldownMinutes)) return "suppressed" as const;
  await sendFacebookTextMessage({
    participantId,
    conversationId: conversation.id,
    text: reply.text,
    automationKey: reply.key,
  });
  return "replied" as const;
}

export async function listFacebookConversations() {
  const client = getUncachedServerSupabase();
  const { data, error } = await client.from("facebook_conversations").select("*").order("last_message_at", { ascending: false }).limit(100);
  if (error) throw error;
  return data || [];
}

export async function listFacebookMessages(conversationId: string) {
  const client = getUncachedServerSupabase();
  const { data, error } = await client.from("facebook_messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(300);
  if (error) throw error;
  await client.from("facebook_conversations").update({ unread_count: 0, updated_at: new Date().toISOString() }).eq("id", conversationId);
  return data || [];
}

export async function getFacebookConversation(conversationId: string) {
  const { data, error } = await getUncachedServerSupabase().from("facebook_conversations").select("*").eq("id", conversationId).single();
  if (error) throw error;
  return data as StoredConversation;
}
