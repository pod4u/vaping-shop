import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, getAdminSession } from "@/lib/admin-auth";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { cancelOrder, markOrderDelivered, markOrderShipped } from "@/lib/order-service";
import { getOrderLineRecipient } from "@/lib/order-payment-service";
import { pushMessage } from "@/lib/line-client";
import { getMemberLiffUrlForBotUserId } from "@/lib/line-account";
import { OrderInputError, parseOrderId } from "@/lib/order-validation";

export const dynamic = "force-dynamic";

type OrderAction = "cancel" | "ship" | "deliver";

function parseText(value: unknown, label: string, maximum: number): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maximum) {
    throw new OrderInputError(`${label}ไม่ถูกต้อง`);
  }
  return value.trim();
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string } },
) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const action = body.action as OrderAction;
    if (!(["cancel", "ship", "deliver"] as string[]).includes(action)) {
      throw new OrderInputError("คำสั่งเปลี่ยนสถานะไม่ถูกต้อง");
    }

    const permission = action === "cancel" ? "orders.cancel" : "orders.ship";
    const unauthorized = await requireAdminApiPermission(request, permission);
    if (unauthorized) return unauthorized;

    const session = await getAdminSession(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const orderId = parseOrderId(params.orderId);
    const actor = `${session.accountId}:${session.role}`;
    const result = action === "cancel"
      ? await cancelOrder(orderId, actor)
      : action === "ship"
        ? await markOrderShipped(
          orderId,
          parseText(body.carrier, "บริษัทขนส่ง", 100),
          parseText(body.trackingNumber, "เลขพัสดุ", 200),
          actor,
        )
        : await markOrderDelivered(orderId, actor);

    let lineNotificationSent: boolean | null = null;
    if (action === "ship") {
      try {
        const recipient = await getOrderLineRecipient(orderId);
        lineNotificationSent = recipient
          ? await pushMessage(recipient.providerUserId, {
            type: "text",
            text: `📦 จัดส่งสินค้าแล้วค่ะ\n\nบริษัทขนส่ง: ${String(body.carrier).trim()}\nเลขพัสดุ: ${String(body.trackingNumber).trim()}\n\nดูรายละเอียดและติดตามพัสดุได้ในระบบสมาชิกค่ะ\n${getMemberLiffUrlForBotUserId(recipient.providerAccountId, "orders")}`,
          }, recipient.providerAccountId)
          : null;
      } catch {
        console.error("LINE shipment notification failed");
        lineNotificationSent = false;
      }
    }

    const messages: Record<OrderAction, string> = {
      cancel: result.stockRestored ? "ยกเลิกออเดอร์และคืนสต็อกสำเร็จ" : "ยกเลิกออเดอร์สำเร็จ",
      ship: "บันทึกการจัดส่งสำเร็จ",
      deliver: "บันทึกว่าส่งถึงลูกค้าสำเร็จ",
    };
    return NextResponse.json(
      {
        success: true,
        ...result,
        lineNotificationSent,
        message: action === "ship" && lineNotificationSent === false
          ? "บันทึกการจัดส่งแล้ว แต่ส่งแจ้งเตือน LINE ไม่สำเร็จ"
          : messages[action],
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
