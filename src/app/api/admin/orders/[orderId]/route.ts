import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { getOrderDetail } from "@/lib/order-service";
import { OrderInputError, parseOrderId } from "@/lib/order-validation";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } },
) {
  const unauthorized = await requireAdminApiPermission(request, "orders.view");
  if (unauthorized) return unauthorized;

  try {
    const orderId = parseOrderId(params.orderId);
    const detail = await getOrderDetail(orderId);
    if (!detail) {
      return NextResponse.json(
        { success: false, error: "ไม่พบออเดอร์" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { success: true, ...detail },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    if (error instanceof OrderInputError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("Admin order detail failed");
    return NextResponse.json(
      { success: false, error: "โหลดออเดอร์ไม่สำเร็จ" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
