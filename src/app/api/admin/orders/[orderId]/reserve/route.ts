import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { reserveDraftOrder } from "@/lib/order-service";
import { OrderInputError, parseOrderId } from "@/lib/order-validation";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } },
) {
  const unauthorized = await requireAdminApiPermission(request, "orders.reserve");
  if (unauthorized) return unauthorized;

  try {
    const result = await reserveDraftOrder(parseOrderId(params.orderId));
    return NextResponse.json(
      {
        success: true,
        ...result,
        message: result.idempotentReplay
          ? "ออเดอร์นี้จองสต็อกไว้แล้ว"
          : "จองสต็อกและเปลี่ยนเป็นรอตรวจสอบสำเร็จ",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    if (error instanceof OrderInputError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const databaseError = error && typeof error === "object"
      ? error as { code?: unknown; message?: unknown }
      : {};
    const code = typeof databaseError.code === "string" ? databaseError.code : "";
    const message = typeof databaseError.message === "string"
      ? databaseError.message
      : error instanceof Error ? error.message : "";

    if (code === "P0001" || message.includes("insufficient stock")) {
      return NextResponse.json(
        { success: false, error: "สต็อกพร้อมขายไม่เพียงพอ กรุณาตรวจรายการอีกครั้ง" },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (
      code === "55000"
      || message.includes("only draft orders")
      || message.includes("reservation is missing or expired")
    ) {
      return NextResponse.json(
        { success: false, error: "สถานะออเดอร์ไม่พร้อมสำหรับการจองสต็อก" },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (code === "P0002" || message.includes("order not found")) {
      return NextResponse.json(
        { success: false, error: "ไม่พบออเดอร์" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    console.error("Admin order reservation failed");
    return NextResponse.json(
      { success: false, error: "จองสต็อกไม่สำเร็จ" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
