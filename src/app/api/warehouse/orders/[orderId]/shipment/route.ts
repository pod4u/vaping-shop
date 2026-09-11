import { NextRequest, NextResponse } from "next/server";
import { getOrderLineRecipient } from "@/lib/order-payment-service";
import { pushMessage } from "@/lib/line-client";
import { getMemberLiffUrlForBotUserId } from "@/lib/line-account";
import { requireSameOrigin, requireWarehouseSession } from "@/lib/warehouse-api";
import { parseWarehouseOrderId, shipWarehouseOrder, WarehouseInputError } from "@/lib/warehouse-service";

export async function PATCH(request: NextRequest, { params }: { params: { orderId: string } }) {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  const auth = await requireWarehouseSession(request);
  if (auth.response) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const carrier = typeof body.carrier === "string" ? body.carrier : "";
    const trackingNumber = typeof body.trackingNumber === "string" ? body.trackingNumber : "";
    const orderId = parseWarehouseOrderId(params.orderId);
    const result = await shipWarehouseOrder({
      orderId,
      carrier,
      trackingNumber,
      actor: `warehouse:${auth.session.accountId}`,
    });

    let lineNotificationSent: boolean | null = null;
    if (!result.idempotent_replay) {
      try {
        const recipient = await getOrderLineRecipient(orderId);
        lineNotificationSent = recipient ? await pushMessage(recipient.providerUserId, {
          type: "text",
          text: `📦 จัดส่งสินค้าแล้วค่ะ\n\nบริษัทขนส่ง: ${carrier.trim()}\nเลขพัสดุ: ${trackingNumber.trim().toUpperCase()}\n\nดูรายละเอียดและติดตามพัสดุได้ในระบบสมาชิกค่ะ\n${getMemberLiffUrlForBotUserId(recipient.providerAccountId, "orders")}`,
        }, recipient.providerAccountId) : null;
      } catch {
        console.error("Warehouse LINE shipment notification failed");
        lineNotificationSent = false;
      }
    }
    return NextResponse.json({
      success: true,
      ...result,
      lineNotificationSent,
      message: lineNotificationSent === false
        ? "บันทึกเลขพัสดุแล้ว แต่ส่ง LINE ไม่สำเร็จ ลูกค้ายังเห็นเลขในระบบสมาชิกค่ะ"
        : "บันทึกเลขพัสดุและจัดส่งสำเร็จค่ะ",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof WarehouseInputError || error instanceof SyntaxError) {
      return NextResponse.json({ success: false, error: error instanceof WarehouseInputError ? error.message : "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }
    const db = error && typeof error === "object" ? error as { code?: string } : {};
    if (db.code === "P0002") return NextResponse.json({ success: false, error: "ไม่พบงานคลัง" }, { status: 404 });
    if (db.code === "55000") return NextResponse.json({ success: false, error: "ต้องแพ็กสินค้าให้เสร็จก่อนยืนยันจัดส่ง" }, { status: 409 });
    console.error("Warehouse shipment failed", { code: db.code ?? "unknown" });
    return NextResponse.json({ success: false, error: "บันทึกเลขพัสดุไม่สำเร็จ" }, { status: 500 });
  }
}
