import "server-only";

import { getServerSupabase } from "@/lib/supabase";
import { getLineMessageContent, pushMessage } from "@/lib/line-client";

const THUNDER_VERIFY_URL = "https://api.thunder.in.th/v2/verify/bank";

type PaymentRequest = {
  id: string;
  order_id: string;
  expected_amount: number | string;
  expires_at: string;
};

type ThunderResult = {
  success?: unknown;
  data?: {
    isDuplicate?: unknown;
    matchedAccount?: unknown;
    amountInSlip?: unknown;
    isAmountMatched?: unknown;
    rawSlip?: {
      transRef?: unknown;
      date?: unknown;
      amount?: { amount?: unknown };
    };
  };
  error?: { code?: unknown; message?: unknown };
};

export class OrderPaymentError extends Error {
  readonly reason: "configuration" | "identity" | "order" | "image" | "verification" | "expired";
  readonly code: string;

  constructor(reason: OrderPaymentError["reason"], code: string, message: string) {
    super(message);
    this.name = "OrderPaymentError";
    this.reason = reason;
    this.code = code;
  }
}

function paymentInstructions(): string {
  const value = process.env.PAYMENT_INSTRUCTIONS?.trim();
  if (!value || value.length > 1500) {
    throw new OrderPaymentError(
      "configuration",
      "PAYMENT_INSTRUCTIONS_MISSING",
      "Payment instructions are not configured",
    );
  }
  return value;
}

function thunderApiKey(): string {
  const value = process.env.THUNDER_API_KEY?.trim();
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new OrderPaymentError("configuration", "THUNDER_API_KEY_MISSING", "Thunder API key is not configured");
  }
  return value;
}

async function getLineRecipient(identityId: string) {
  const { data, error } = await getServerSupabase()
    .from("customer_identities")
    .select("provider_account_id,provider_user_id")
    .eq("id", identityId)
    .eq("provider", "line")
    .eq("status", "verified")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new OrderPaymentError("identity", "LINE_IDENTITY_NOT_FOUND", "Verified LINE identity not found");
  return {
    providerAccountId: String(data.provider_account_id),
    providerUserId: String(data.provider_user_id),
  };
}

export async function requestLineOrderPayment(orderId: string, actor: string) {
  const client = getServerSupabase();
  const { data: order, error: orderError } = await client
    .from("orders")
    .select("order_number,total,discount_amount,source_customer_identity_id")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) throw orderError;
  if (!order?.source_customer_identity_id) {
    throw new OrderPaymentError("order", "LINE_ORDER_REQUIRED", "Linked LINE order is required");
  }

  const instructions = paymentInstructions();
  thunderApiKey();
  const { data, error } = await client.rpc("prepare_line_order_payment", {
    p_order_id: orderId,
    p_requested_by: actor,
  });
  if (error) throw error;
  const result = data && typeof data === "object" ? data as Record<string, unknown> : {};
  if (typeof result.payment_request_id !== "string" || typeof result.expires_at !== "string") {
    throw new Error("Payment request returned an invalid result");
  }

  const recipient = await getLineRecipient(String(order.source_customer_identity_id));
  const amount = Number(result.expected_amount ?? order.total);
  const discountAmount = Number(order.discount_amount ?? 0);
  const expiresAt = new Date(result.expires_at);
  const sent = await pushMessage(recipient.providerUserId, {
    type: "text",
    text:
      `💳 เช็กและจองสต๊อกเรียบร้อยแล้ว\n\nเลขที่ออเดอร์: ${order.order_number}${discountAmount > 0 ? `\n🎁 ใช้ส่วนลดจากรีวิว: −฿${discountAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}` : ""}\nยอดชำระ: ฿${amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}\n\n${instructions}\n\nกรุณาโอนยอดให้ตรงและส่งรูปสลิปในแชทนี้ภายใน ${expiresAt.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}\nหากไม่ส่งสลิปภายในเวลานี้ ออเดอร์จะยกเลิกอัตโนมัติและต้องสั่งใหม่อีกครั้ง\n\nระบบจะยืนยันออเดอร์ให้กับลูกค้าหลังจากตรวจเช็กสลิปเรียบร้อยแล้ว\nเลข Tracking พัสดุจะสามารถเข้าไปเช็กได้ในระบบสมาชิกวันพรุ่งนี้นะคะ`,
  }, recipient.providerAccountId);

  return {
    paymentRequestId: result.payment_request_id,
    expiresAt: result.expires_at,
    expectedAmount: amount,
    idempotentReplay: result.idempotent_replay === true,
    notificationSent: sent,
  };
}

async function resolveLineIdentityId(providerAccountId: string, providerUserId: string): Promise<string> {
  const client = getServerSupabase();
  const { data: identity, error: identityError } = await client
    .from("customer_identities")
    .select("id")
    .eq("provider", "line")
    .eq("provider_account_id", providerAccountId)
    .eq("provider_user_id", providerUserId)
    .eq("status", "verified")
    .maybeSingle();
  if (identityError) throw identityError;
  if (!identity) throw new OrderPaymentError("identity", "LINE_IDENTITY_NOT_FOUND", "LINE identity is not linked");
  return String(identity.id);
}

async function findActivePayment(identityId: string): Promise<PaymentRequest> {
  const client = getServerSupabase();
  const { data, error } = await client
    .from("order_payment_requests")
    .select("id,order_id,expected_amount,expires_at")
    .eq("source_customer_identity_id", identityId)
    .eq("status", "awaiting_slip")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new OrderPaymentError("order", "NO_ACTIVE_PAYMENT", "No active payment request");
  return data as unknown as PaymentRequest;
}

async function findVerifiedReplay(identityId: string, messageId: string): Promise<PaymentRequest | null> {
  const { data, error } = await getServerSupabase()
    .from("order_payment_requests")
    .select("id,order_id,expected_amount,expires_at")
    .eq("source_customer_identity_id", identityId)
    .eq("line_message_id", messageId)
    .eq("status", "verified")
    .maybeSingle();
  if (error) throw error;
  return data as PaymentRequest | null;
}

export function getBankTransferDetails() {
  const raw = process.env.PAYMENT_INSTRUCTIONS || "ธนาคารกรุงไทย\nเลขบัญชี 204-0-94166-5\nชื่อบัญชี ธเนศ ชนวัฒน์";
  return {
    bankName: "ธนาคารกรุงไทย",
    bankEnglish: "Krungthai Bank (KTB)",
    bankCode: "006",
    bankShort: "KTB",
    accountNumber: "204-0-94166-5",
    accountNumberClean: "2040941665",
    accountName: "ธเนศ ชนวัฒน์",
    rawInstructions: raw,
  };
}

export async function verifySlipBufferWithThunder(
  imageBuffer: ArrayBuffer,
  contentType: string,
  expectedAmount: number
) {
  const form = new FormData();
  form.append(
    "image",
    new Blob([imageBuffer], { type: contentType }),
    `slip.${contentType.split("/")[1] || "jpg"}`
  );
  form.append("matchAccount", "true");
  form.append("matchAmount", expectedAmount.toFixed(2));
  // Thunder marks every verification attempt as seen, including attempts that
  // fail account matching. Allow the customer to resend the same slip after a
  // recoverable mismatch; the database unique transaction reference remains
  // the authoritative cross-order duplicate guard.
  form.append("checkDuplicate", "false");

  const response = await fetch(THUNDER_VERIFY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${thunderApiKey()}` },
    body: form,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await response.json().catch(() => null)) as ThunderResult | null;
  if (!response.ok || body?.success !== true || !body.data) {
    const code = typeof body?.error?.code === "string" ? body.error.code : `THUNDER_HTTP_${response.status}`;
    throw new OrderPaymentError("verification", code, "Thunder could not verify the slip");
  }

  const rawAmount = body.data.amountInSlip ?? body.data.rawSlip?.amount?.amount;
  const amount = typeof rawAmount === "number" ? rawAmount : Number(rawAmount);
  const transRef = body.data.rawSlip?.transRef;
  const slipDate = body.data.rawSlip?.date;
  if (!Number.isFinite(amount) || typeof transRef !== "string" || typeof slipDate !== "string") {
    throw new OrderPaymentError("verification", "THUNDER_RESPONSE_INVALID", "Thunder response is incomplete");
  }

  return {
    amount,
    transRef,
    slipDate,
    accountMatched: body.data.matchedAccount !== null && body.data.matchedAccount !== undefined,
    amountMatched: body.data.isAmountMatched === true,
    isDuplicate: body.data.isDuplicate === true,
  };
}

async function verifyWithThunder(
  providerAccountId: string,
  messageId: string,
  expectedAmount: number,
) {
  const image = await getLineMessageContent(messageId, providerAccountId);
  const imageBuffer = image.bytes.buffer.slice(
    image.bytes.byteOffset,
    image.bytes.byteOffset + image.bytes.byteLength,
  ) as ArrayBuffer;
  return verifySlipBufferWithThunder(imageBuffer, image.contentType, expectedAmount);
}

async function recordFailure(paymentRequestId: string, messageId: string, code: string) {
  await getServerSupabase().rpc("record_line_payment_failure", {
    p_payment_request_id: paymentRequestId,
    p_line_message_id: messageId,
    p_failure_code: code.slice(0, 100),
  });
}

export async function processLinePaymentSlip(input: {
  providerAccountId: string;
  providerUserId: string;
  messageId: string;
}) {
  const identityId = await resolveLineIdentityId(input.providerAccountId, input.providerUserId);
  const replay = await findVerifiedReplay(identityId, input.messageId);
  if (replay) {
    const { data: order, error } = await getServerSupabase()
      .from("orders")
      .select("order_number")
      .eq("id", replay.order_id)
      .maybeSingle();
    if (error) throw error;
    return {
      orderNumber: String(order?.order_number ?? "-"),
      amount: Number(replay.expected_amount),
      result: { idempotent_replay: true },
    };
  }

  const payment = await findActivePayment(identityId);
  const expectedAmount = Number(payment.expected_amount);

  let verified: Awaited<ReturnType<typeof verifyWithThunder>>;
  try {
    verified = await verifyWithThunder(input.providerAccountId, input.messageId, expectedAmount);
  } catch (error) {
    const code = error instanceof OrderPaymentError ? error.code : "SLIP_PROCESSING_FAILED";
    await recordFailure(payment.id, input.messageId, code).catch(() => undefined);
    throw error;
  }

  const actualCents = Math.round(verified.amount * 100);
  const expectedCents = Math.round(expectedAmount * 100);
  if (!verified.accountMatched || !verified.amountMatched || verified.isDuplicate || actualCents !== expectedCents) {
    const code = verified.isDuplicate
      ? "SLIP_DUPLICATE"
      : !verified.accountMatched
        ? "RECEIVER_MISMATCH"
        : "AMOUNT_MISMATCH";
    await recordFailure(payment.id, input.messageId, code);
    throw new OrderPaymentError("verification", code, "Slip checks did not pass");
  }

  const { data, error } = await getServerSupabase().rpc("complete_line_order_payment", {
    p_payment_request_id: payment.id,
    p_line_message_id: input.messageId,
    p_provider_transaction_ref: verified.transRef,
    p_slip_date: verified.slipDate,
    p_actual_amount: verified.amount,
    p_account_matched: verified.accountMatched,
    p_amount_matched: verified.amountMatched,
    p_is_duplicate: verified.isDuplicate,
  });
  if (error) {
    if (error.code === "23505") {
      throw new OrderPaymentError("verification", "SLIP_DUPLICATE", "Slip transaction was already used");
    }
    throw error;
  }
  const result = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const { data: order, error: orderError } = await getServerSupabase()
    .from("orders")
    .select("order_number")
    .eq("id", payment.order_id)
    .maybeSingle();
  if (orderError) throw orderError;
  return {
    orderNumber: String(order?.order_number ?? result.order_number ?? "-"),
    amount: expectedAmount,
    result,
  };
}

export async function getOrderLineRecipient(orderId: string): Promise<{
  providerAccountId: string;
  providerUserId: string;
} | null> {
  const { data: order, error } = await getServerSupabase()
    .from("orders")
    .select("source_customer_identity_id")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  if (!order?.source_customer_identity_id) return null;
  return getLineRecipient(String(order.source_customer_identity_id));
}
