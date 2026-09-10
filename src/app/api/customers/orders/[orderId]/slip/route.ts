import { NextRequest, NextResponse } from "next/server";
import { MEMBER_COOKIE_NAME, verifyMemberSessionToken } from "@/lib/member-auth";
import { getServerSupabase } from "@/lib/supabase";
import {
  OrderPaymentError,
  verifySlipBufferWithThunder,
} from "@/lib/order-payment-service";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function friendlyErrorMessage(code: string, fallback: string): string {
  switch (code) {
    case "SLIP_NOT_FOUND":
    case "CANNOT_READ_QR_CODE":
    case "QR_NOT_FOUND":
    case "VALIDATION_ERROR":
    case "INVALID_SLIP":
    case "THUNDER_RESPONSE_INVALID":
      return "ไม่พบข้อมูล QR Code ในสลิป หรือรูปภาพไม่ถูกต้อง กรุณาถ่ายหรือแคปรูปสลิปให้เห็น QR Code ชัดเจน";
    case "RECEIVER_MISMATCH":
      return "สลิปนี้ไม่ได้โอนเข้าบัญชีธนาคารของทางร้าน กรุณาตรวจสอบเลขที่บัญชีปลายทาง";
    case "AMOUNT_MISMATCH":
      return "ยอดเงินในสลิปไม่ตรงกับยอดคำสั่งซื้อ กรุณาโอนยอดให้ตรงตามที่แจ้ง";
    case "SLIP_DUPLICATE":
      return "สลิปนี้ถูกใช้งานไปแล้ว ไม่สามารถใช้ซ้ำได้";
    case "SLIP_EXPIRED":
    case "SLIP_DATE_OUT_OF_RANGE":
      return "สลิปนี้ไม่อยู่ในช่วงเวลาที่กำหนด กรุณาใช้สลิปการโอนล่าสุด";
    case "ORDER_RESERVATION_EXPIRED":
      return "ระยะเวลาจองสินค้าของออเดอร์นี้หมดอายุแล้ว กรุณาสั่งซื้อใหม่อีกครั้ง";
    case "THUNDER_API_KEY_MISSING":
      return "ระบบตรวจสอบสลิปกำลังปรับปรุง กรุณาติดต่อแอดมินทาง LINE";
    default:
      return fallback && !fallback.toLowerCase().includes("thunder")
        ? fallback
        : "ไม่สามารถตรวจสอบสลิปได้ กรุณาตรวจสอบรูปภาพสลิปอีกครั้ง";
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const session = verifyMemberSessionToken(request.cookies.get(MEMBER_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "กรุณาเข้าสู่ระบบสมาชิกก่อนดำเนินการ" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const orderId = params?.orderId;
  if (!orderId || !UUID_PATTERN.test(orderId)) {
    return NextResponse.json(
      { success: false, error: "รหัสคำสั่งซื้อไม่ถูกต้อง" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const client = getServerSupabase();

  // 1. Fetch order details
  const { data: order, error: orderError } = await client
    .from("orders")
    .select("id, order_number, customer_id, status, total, source_customer_identity_id, admin_note")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    return NextResponse.json(
      { success: false, error: "ไม่พบคำสั่งซื้อนี้ในระบบ" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  // 2. Ownership verification
  if (order.customer_id !== session.customerId) {
    return NextResponse.json(
      { success: false, error: "คุณไม่มีสิทธิ์เข้าถึงคำสั่งซื้อนี้" },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  // 3. Idempotent check: if already confirmed
  if (order.status === "confirmed") {
    return NextResponse.json(
      {
        success: true,
        message: "ออเดอร์นี้ได้รับการยืนยันและชำระเงินเรียบร้อยแล้ว",
        order: {
          id: order.id,
          orderNumber: order.order_number,
          status: "confirmed",
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  if (order.status !== "pending") {
    return NextResponse.json(
      { success: false, error: `ไม่สามารถแจ้งชำระเงินได้เนื่องจากสถานะออเดอร์คือ: ${order.status}` },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  // 4. Verify active stock reservation
  const { data: reservation } = await client
    .from("stock_reservations")
    .select("id, expires_at")
    .eq("order_id", orderId)
    .eq("status", "reserved")
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (!reservation) {
    return NextResponse.json(
      {
        success: false,
        error: "ระยะเวลาจองสินค้าของออเดอร์นี้หมดอายุแล้ว กรุณาสร้างคำสั่งซื้อใหม่อีกครั้ง",
        code: "ORDER_RESERVATION_EXPIRED",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  // 5. Parse uploaded slip file
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: "ไม่สามารถอ่านไฟล์ที่อัปโหลดได้" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json(
      { success: false, error: "กรุณาเลือกไฟล์รูปภาพสลิปการโอนเงิน" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { success: false, error: "ขนาดไฟล์รูปภาพต้องไม่เกิน 10MB" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { success: false, error: "ประเภทไฟล์ไม่ถูกต้อง ต้องเป็นไฟล์รูปภาพ (JPG, PNG, WebP) เท่านั้น" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  // 6. Call Thunder API to verify slip
  const expectedAmount = Number(order.total);
  const imageBuffer = await file.arrayBuffer();

  let verified: Awaited<ReturnType<typeof verifySlipBufferWithThunder>>;
  try {
    verified = await verifySlipBufferWithThunder(imageBuffer, file.type, expectedAmount);
  } catch (err: any) {
    console.error("Thunder verification failed:", err);
    const isTimeout = err?.name === "TimeoutError" || err?.name === "AbortError" || String(err?.message || "").includes("timeout");
    const code = isTimeout ? "TIMEOUT" : err instanceof OrderPaymentError ? err.code : err?.code || "THUNDER_ERROR";
    const msg = isTimeout
      ? "การเชื่อมต่อตรวจสอบสลิปใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง"
      : friendlyErrorMessage(String(code), err?.message);
    return NextResponse.json(
      { success: false, error: msg, code },
      { status: 422, headers: { "Cache-Control": "no-store" } }
    );
  }

  // 7. Verify match conditions
  const actualCents = Math.round(verified.amount * 100);
  const expectedCents = Math.round(expectedAmount * 100);

  if (!verified.accountMatched) {
    return NextResponse.json(
      {
        success: false,
        error: "สลิปนี้ไม่ได้โอนเข้าบัญชีธนาคารของทางร้าน กรุณาตรวจสอบเลขที่บัญชีปลายทาง",
        code: "RECEIVER_MISMATCH",
      },
      { status: 422, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!verified.amountMatched || actualCents !== expectedCents) {
    return NextResponse.json(
      {
        success: false,
        error: `ยอดเงินในสลิป (฿${verified.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}) ไม่ตรงกับยอดคำสั่งซื้อ (฿${expectedAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })})`,
        code: "AMOUNT_MISMATCH",
      },
      { status: 422, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (verified.isDuplicate) {
    return NextResponse.json(
      {
        success: false,
        error: "สลิปนี้เคยถูกส่งตรวจสอบแล้ว ไม่สามารถใช้ซ้ำได้",
        code: "SLIP_DUPLICATE",
      },
      { status: 422, headers: { "Cache-Control": "no-store" } }
    );
  }

  // 8. Cross-order duplicate check in database
  const { data: existingPayment } = await client
    .from("order_payment_requests")
    .select("id, order_id")
    .eq("provider_transaction_ref", verified.transRef)
    .maybeSingle();

  if (existingPayment && existingPayment.order_id !== order.id) {
    return NextResponse.json(
      {
        success: false,
        error: "สลิปนี้ถูกนำไปใช้ยืนยันออเดอร์อื่นแล้วในระบบ ไม่สามารถใช้ซ้ำได้",
        code: "SLIP_DUPLICATE",
      },
      { status: 422, headers: { "Cache-Control": "no-store" } }
    );
  }

  // 9. Confirm the order atomically (deduct stock, write ledger, update status to confirmed)
  const { data: confirmResult, error: confirmError } = await client.rpc("confirm_pending_order", {
    p_order_id: order.id,
    p_confirmed_by: "thunder-web-verification",
  });

  if (confirmError) {
    console.error("Order confirmation RPC failed:", confirmError);
    if (confirmError.message?.includes("reservation")) {
      return NextResponse.json(
        {
          success: false,
          error: "ระยะเวลาจองสินค้าของออเดอร์นี้หมดอายุแล้ว ไม่สามารถยืนยันคำสั่งซื้อได้",
          code: "ORDER_RESERVATION_EXPIRED",
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: "เกิดข้อผิดพลาดในการตัดสต็อกและยืนยันออเดอร์ กรุณาติดต่อแอดมิน",
        code: "CONFIRM_FAILED",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  // 10. Record slip transaction reference into order metadata
  const noteVerification = `\n[Thunder Slip Verified] Ref: ${verified.transRef} | Amount: ฿${verified.amount} | Date: ${verified.slipDate}`;
  await client
    .from("orders")
    .update({
      admin_note: (order.admin_note || "") + noteVerification,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  // If customer identity exists, record in order_payment_requests to guarantee DB unique index guard
  if (order.source_customer_identity_id) {
    try {
      await client
        .from("order_payment_requests")
        .upsert(
          {
            order_id: order.id,
            source_customer_identity_id: order.source_customer_identity_id,
            expected_amount: expectedAmount,
            actual_amount: verified.amount,
            status: "verified",
            requested_by: "web-member-session",
            line_message_id: `web-${order.id.slice(0, 8)}-${Date.now()}`,
            provider_transaction_ref: verified.transRef,
            account_matched: true,
            amount_matched: true,
            is_duplicate: false,
            verified_at: new Date().toISOString(),
            expires_at: reservation.expires_at,
          },
          { onConflict: "order_id" }
        );
    } catch (e) {
      console.error("Payment request upsert warning:", e);
    }
  }

  return NextResponse.json(
    {
      success: true,
      message: "ตรวจสอบสลิปผ่าน Thunder สำเร็จ ยืนยันการชำระเงินเรียบร้อยแล้ว!",
      order: {
        id: order.id,
        orderNumber: order.order_number,
        status: "confirmed",
        transRef: verified.transRef,
        verifiedAmount: verified.amount,
        slipDate: verified.slipDate,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
