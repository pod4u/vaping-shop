import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, getAdminSession } from "@/lib/admin-auth";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { cancelOrder } from "@/lib/order-service";
import { OrderInputError, parseOrderId } from "@/lib/order-validation";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string } },
) {
  try {
    const body = await request.json() as Record<string, unknown>;
    if (body.action !== "cancel") {
      throw new OrderInputError("การจัดส่งต้องดำเนินการจากระบบคลังเท่านั้น");
    }

    const unauthorized = await requireAdminApiPermission(request, "orders.cancel");
    if (unauthorized) return unauthorized;

    const session = await getAdminSession(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const orderId = parseOrderId(params.orderId);
    const actor = `${session.accountId}:${session.role}`;
    const result = await cancelOrder(orderId, actor);
    return NextResponse.json(
      {
        success: true,
        ...result,
        message: result.stockRestored ? "ยกเลิกออเดอร์และคืนสต็อกสำเร็จ" : "ยกเลิกออเดอร์สำเร็จ",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    if (error instanceof OrderInputError || error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: error instanceof OrderInputError ? error.message : "รูปแบบข้อมูลไม่ถูกต้อง" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const databaseError = error && typeof error === "object" ? error as { code?: unknown; message?: unknown } : {};
    const code = typeof databaseError.code === "string" ? databaseError.code : "";
    const message = typeof databaseError.message === "string" ? databaseError.message : "";
    if (code === "P0002" || message.includes("order not found")) {
      return NextResponse.json({ success: false, error: "ไม่พบออเดอร์" }, { status: 404 });
    }
    if (code === "55000") {
      return NextResponse.json(
        { success: false, error: "สถานะปัจจุบันไม่รองรับคำสั่งนี้ กรุณาโหลดหน้าใหม่" },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("Admin order status operation failed", { code });
    return NextResponse.json(
      { success: false, error: "เปลี่ยนสถานะออเดอร์ไม่สำเร็จ" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
