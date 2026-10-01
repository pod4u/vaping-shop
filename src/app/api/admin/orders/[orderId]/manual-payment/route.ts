import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, getAdminSession } from "@/lib/admin-auth";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { manuallyVerifyLineOrderPayment, notifyLineManualPaymentConfirmed } from "@/lib/order-payment-service";
import { OrderInputError, parseOrderId } from "@/lib/order-validation";
import { notifyPaymentReceived } from "@/lib/telegram-notifications";
import { requireSameOrigin } from "@/lib/warehouse-api";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { orderId: string } }) {
  const sameOrigin = requireSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const unauthorized = await requireAdminApiPermission(request, "payments.manual_verify");
  if (unauthorized) return unauthorized;
  const session = await getAdminSession(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const orderId = parseOrderId(params.orderId);
    const body = await request.json() as Record<string, unknown>;
    const amountText = typeof body.amount === "string" ? body.amount.trim() : "";
    const bankReference = typeof body.bankReference === "string" ? body.bankReference.trim() : "";
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(amountText)
      || Number(amountText) <= 0
      || bankReference.length < 6 || bankReference.length > 100
      || note.length < 10 || note.length > 500
      || body.bankDepositConfirmed !== true) {
      return NextResponse.json({ success: false, error: "กรุณากรอกยอด เลขอ้างอิง และเหตุผล พร้อมยืนยันว่าเห็นเงินเข้าบัญชีร้านจริง" }, { status: 400 });
    }

    const result = await manuallyVerifyLineOrderPayment({
      orderId,
      amount: Number(amountText),
      bankReference,
      note,
      verifiedBy: `${session.accountId}:${session.role}`,
    });

    let lineSent: boolean | null = null;
    if (!result.idempotentReplay) {
      lineSent = await notifyLineManualPaymentConfirmed(orderId).catch(() => false);
    }
    const telegram = await notifyPaymentReceived(orderId).catch(() => "failed" as const);
    return NextResponse.json({
      success: true,
      idempotentReplay: result.idempotentReplay,
      lineSent,
      telegram,
      message: result.idempotentReplay
        ? "ออเดอร์นี้ได้รับการยืนยันด้วยการตรวจยอดธนาคารไปแล้ว"
        : lineSent === false || telegram === "failed" || telegram === "not_configured"
          ? "ยืนยันยอดและส่งงานเข้าคลังแล้ว แต่มีข้อความแจ้งเตือนส่งไม่สำเร็จ กรุณาตรวจ LINE และ Telegram"
          : "ยืนยันเงินเข้าบัญชี ส่งงานเข้าคลัง และแจ้งลูกค้าเรียบร้อยแล้ว",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof OrderInputError || error instanceof SyntaxError) {
      return NextResponse.json({ success: false, error: "ข้อมูลออเดอร์ไม่ถูกต้อง" }, { status: 400 });
    }
    const value = error && typeof error === "object" ? error as { code?: unknown; message?: unknown } : {};
    const code = typeof value.code === "string" ? value.code : "";
    if (code === "23505") {
      return NextResponse.json({ success: false, error: "เลขอ้างอิงธนาคารนี้ถูกใช้กับออเดอร์อื่นแล้ว" }, { status: 409 });
    }
    if (code === "55000" || code === "P0002") {
      return NextResponse.json({ success: false, error: "ออเดอร์นี้ไม่อยู่ในเงื่อนไขยืนยันด้วยมือ หรือเวลาจองสินค้าหมดแล้ว กรุณารีเฟรชหน้า" }, { status: 409 });
    }
    console.error("Manual bank payment confirmation failed", { code });
    return NextResponse.json({ success: false, error: "ยืนยันการชำระเงินไม่สำเร็จ กรุณาตรวจสอบสถานะก่อนลองใหม่" }, { status: 500 });
  }
}
