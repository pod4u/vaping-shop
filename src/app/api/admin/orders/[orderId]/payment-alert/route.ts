import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { parseOrderId } from "@/lib/order-validation";
import { resendPaymentVerificationProblem } from "@/lib/telegram-notifications";
import { requireSameOrigin } from "@/lib/warehouse-api";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } },
) {
  const sameOrigin = requireSameOrigin(request);
  if (sameOrigin) return sameOrigin;
  const unauthorized = await requireAdminApiPermission(request, "orders.confirm");
  if (unauthorized) return unauthorized;

  try {
    const result = await resendPaymentVerificationProblem(parseOrderId(params.orderId));
    if (result !== "sent") {
      return NextResponse.json({ success: false, error: "ยังไม่ได้เชื่อม Telegram หรือบอตไม่พร้อม" }, {
        status: 503, headers: { "Cache-Control": "no-store" },
      });
    }
    return NextResponse.json({ success: true, message: "ส่งแจ้งเตือนให้กลุ่ม Telegram แล้ว" }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "ส่งแจ้งเตือน Telegram ไม่สำเร็จ",
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
