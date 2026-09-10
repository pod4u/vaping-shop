import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, getAdminSession } from "@/lib/admin-auth";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { requestLineOrderPayment } from "@/lib/order-payment-service";
import { reserveDraftOrder } from "@/lib/order-service";
import { parseOrderId } from "@/lib/order-validation";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } },
) {
  const cannotReserve = await requireAdminApiPermission(request, "orders.reserve");
  if (cannotReserve) return cannotReserve;
  const cannotConfirm = await requireAdminApiPermission(request, "orders.confirm");
  if (cannotConfirm) return cannotConfirm;

  const session = await getAdminSession(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const orderId = parseOrderId(params.orderId);
    const reservation = await reserveDraftOrder(orderId);
    const payment = await requestLineOrderPayment(orderId, `${session.accountId}:${session.role}`);
    return NextResponse.json(
      {
        success: true,
        reservation,
        payment,
        message: payment.notificationSent
          ? "ยืนยันสต็อกและส่งยอดเข้า LINE แล้ว"
          : "จองสต็อกแล้ว แต่ส่งข้อความ LINE ไม่สำเร็จ กรุณากดส่งยอดอีกครั้ง",
      },
      { status: payment.notificationSent ? 200 : 502, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const value = error && typeof error === "object" ? error as { code?: unknown; message?: unknown } : {};
    const code = typeof value.code === "string" ? value.code : "";
    const message = typeof value.message === "string" ? value.message : "";
    const isStockError = code === "P0001" || message.includes("insufficient stock");
    return NextResponse.json(
      {
        success: false,
        error: isStockError
          ? "สต็อกไม่เพียงพอ กรุณาตรวจรายการก่อนยืนยัน"
          : "ยืนยันออเดอร์ไม่สำเร็จ กรุณารีเฟรชแล้วลองอีกครั้ง",
      },
      { status: isStockError ? 409 : 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
