import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { confirmPendingOrder } from "@/lib/order-service";
import { OrderInputError, parseOrderId } from "@/lib/order-validation";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } },
) {
  const unauthorized = await requireAdminApiPermission(request, "orders.confirm");
  if (unauthorized) return unauthorized;

  try {
    const result = await confirmPendingOrder(parseOrderId(params.orderId));

    if (result.reservationExpired) {
      return NextResponse.json(
        {
          success: false,
          ...result,
          error: "เวลาจองสินค้าหมดแล้ว ออเดอร์กลับไปรอการยืนยัน กรุณาตรวจและจองใหม่",
        },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      {
        success: true,
        ...result,
        message: result.idempotentReplay
          ? "ออเดอร์นี้ยืนยันและตัดสต็อกแล้ว"
          : "ยืนยันออเดอร์และตัดสต็อกสำเร็จ",
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

    if (code === "P0001" || message.includes("insufficient physical stock")) {
      return NextResponse.json(
        { success: false, error: "สต็อกจริงไม่เพียงพอ จึงยังไม่ได้ยืนยันออเดอร์" },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (code === "55000") {
      return NextResponse.json(
        {
          success: false,
          error: message.includes("verified payment is required")
            ? "ออเดอร์จาก LINE ต้องตรวจสอบหลักฐานการชำระเงินให้เรียบร้อยก่อนยืนยัน"
            : "สถานะออเดอร์หรือข้อมูลการจองไม่พร้อมสำหรับการยืนยัน",
        },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (code === "P0002" || message.includes("order not found")) {
      return NextResponse.json(
        { success: false, error: "ไม่พบออเดอร์" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    console.error("Admin order confirmation failed");
    return NextResponse.json(
      { success: false, error: "ยืนยันออเดอร์ไม่สำเร็จ" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
