import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, getAdminSession } from "@/lib/admin-auth";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { OrderPaymentError, requestLineOrderPayment } from "@/lib/order-payment-service";
import { OrderInputError, parseOrderId } from "@/lib/order-validation";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } },
) {
  const unauthorized = await requireAdminApiPermission(request, "orders.confirm");
  if (unauthorized) return unauthorized;

  try {
    const session = await getAdminSession(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const result = await requestLineOrderPayment(
      parseOrderId(params.orderId),
      `${session.accountId}:${session.role}`,
    );
    return NextResponse.json(
      {
        success: true,
        ...result,
        message: result.notificationSent
          ? "ส่งยอดและข้อมูลชำระเงินเข้า LINE ลูกค้าแล้ว"
          : "สร้างคำขอชำระเงินแล้ว แต่ส่ง LINE ไม่สำเร็จ กรุณาลองส่งอีกครั้ง",
      },
      { status: result.notificationSent ? 200 : 502, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    if (error instanceof OrderInputError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    if (error instanceof OrderPaymentError && error.reason === "configuration") {
      return NextResponse.json(
        { success: false, error: "ระบบตรวจสอบการชำระเงินยังไม่พร้อม กรุณาตรวจการตั้งค่าหรือติดต่อผู้ดูแลระบบ" },
        { status: 503 },
      );
    }
    const value = error && typeof error === "object" ? error as { code?: unknown; message?: unknown } : {};
    const code = typeof value.code === "string" ? value.code : "";
    const message = typeof value.message === "string" ? value.message : "";
    if (code === "P0002" || message.includes("not found")) {
      return NextResponse.json({ success: false, error: "ไม่พบออเดอร์หรือ LINE ที่เชื่อมไว้" }, { status: 404 });
    }
    if (code === "55000") {
      return NextResponse.json(
        { success: false, error: "ออเดอร์หรือเวลาจองสต็อกไม่พร้อมรับชำระเงิน" },
        { status: 409 },
      );
    }
    console.error("Admin payment request failed", { code });
    return NextResponse.json({ success: false, error: "ส่งคำขอชำระเงินไม่สำเร็จ" }, { status: 500 });
  }
}
