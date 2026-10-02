import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, getAdminSession } from "@/lib/admin-auth";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { manuallyVerifyLineOrderPayment, notifyLineManualPaymentConfirmed } from "@/lib/order-payment-service";
import { OrderInputError, parseOrderId } from "@/lib/order-validation";
import { notifyPaymentReceived } from "@/lib/telegram-notifications";
import { getServerSupabase } from "@/lib/supabase";
import { requireSameOrigin } from "@/lib/warehouse-api";

export const dynamic = "force-dynamic";
const SLIP_BUCKET = "manual-payment-slips";
const MAX_SLIP_BYTES = 4 * 1024 * 1024;

function inspectSlip(bytes: Uint8Array): { mime: string; extension: string } | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", extension: "jpg" };
  }
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) {
    return { mime: "image/png", extension: "png" };
  }
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") {
    return { mime: "image/webp", extension: "webp" };
  }
  return null;
}

export async function POST(request: NextRequest, { params }: { params: { orderId: string } }) {
  const sameOrigin = requireSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const unauthorized = await requireAdminApiPermission(request, "payments.manual_verify");
  if (unauthorized) return unauthorized;
  const session = await getAdminSession(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const orderId = parseOrderId(params.orderId);
    const body = await request.formData();
    const amountText = String(body.get("amount") ?? "").trim();
    const bankReference = String(body.get("bankReference") ?? "").trim();
    const note = String(body.get("note") ?? "").trim();
    const recoveryMode = body.get("recoveryMode") === "true";
    if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(amountText)
      || Number(amountText) <= 0
      || bankReference.length < 6 || bankReference.length > 100
      || note.length < 10 || note.length > 500
      || body.get("bankDepositConfirmed") !== "true") {
      return NextResponse.json({ success: false, error: "กรุณากรอกยอด เลขอ้างอิง และเหตุผล พร้อมยืนยันว่าเห็นเงินเข้าบัญชีร้านจริง" }, { status: 400 });
    }

    const suppliedSlip = body.get("slip");
    const slip = suppliedSlip instanceof File ? suppliedSlip : null;
    if (suppliedSlip && !slip) {
      return NextResponse.json({ success: false, error: "ไฟล์สลิปไม่ถูกต้อง" }, { status: 400 });
    }
    let slipPath: string | null = null;
    const storage = getServerSupabase().storage.from(SLIP_BUCKET);
    if (slip) {
      if (!slip.size || slip.size > MAX_SLIP_BYTES) {
        return NextResponse.json({ success: false, error: "สลิปต้องมีขนาดไม่เกิน 4 MB" }, { status: 400 });
      }
      const bytes = new Uint8Array(await slip.arrayBuffer());
      const inspected = inspectSlip(bytes);
      if (!inspected || slip.type !== inspected.mime) {
        return NextResponse.json({ success: false, error: "รองรับสลิป JPG, PNG หรือ WebP เท่านั้น" }, { status: 400 });
      }
      slipPath = `${orderId}/${crypto.randomUUID()}.${inspected.extension}`;
      const { error: uploadError } = await storage.upload(slipPath, bytes, {
        contentType: inspected.mime,
        cacheControl: "0",
        upsert: false,
      });
      if (uploadError) {
        console.error("Manual payment slip upload failed", { code: uploadError.name });
        return NextResponse.json({ success: false, error: "บันทึกสลิปไม่สำเร็จ กรุณาลองใหม่" }, { status: 502 });
      }
    }

    let result: Awaited<ReturnType<typeof manuallyVerifyLineOrderPayment>>;
    try {
      result = await manuallyVerifyLineOrderPayment({
        orderId,
        amount: Number(amountText),
        bankReference,
        note,
        verifiedBy: `${session.accountId}:${session.role}`,
        slipPath,
        recoveryMode,
      });
    } catch (error) {
      if (slipPath) await storage.remove([slipPath]).catch(() => undefined);
      throw error;
    }
    if (slipPath && result.idempotentReplay) await storage.remove([slipPath]).catch(() => undefined);

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
          ? `${recoveryMode ? "กู้ออเดอร์เดิมและ" : ""}ยืนยันยอด ส่งงานเข้าคลังแล้ว แต่มีข้อความแจ้งเตือนส่งไม่สำเร็จ กรุณาตรวจ LINE และ Telegram`
          : `${recoveryMode ? "กู้ออเดอร์เดิม " : ""}ยืนยันเงินเข้าบัญชี ส่งงานเข้าคลัง และแจ้งลูกค้าเรียบร้อยแล้ว`,
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
    if (code === "P0001") {
      return NextResponse.json({ success: false, error: "สินค้าคงเหลือไม่เพียงพอ ยังไม่กู้ออเดอร์หรือส่งงานคลัง กรุณาติดต่อลูกค้าเพื่อเปลี่ยนสินค้าหรือคืนเงิน" }, { status: 409 });
    }
    if (code === "55000" || code === "P0002") {
      return NextResponse.json({ success: false, error: "ออเดอร์หรือหลักฐานไม่อยู่ในเงื่อนไขยืนยัน กรุณารีเฟรชและตรวจสถานะก่อนลองใหม่" }, { status: 409 });
    }
    console.error("Manual bank payment confirmation failed", { code });
    return NextResponse.json({ success: false, error: "ยืนยันการชำระเงินไม่สำเร็จ กรุณาตรวจสอบสถานะก่อนลองใหม่" }, { status: 500 });
  }
}
