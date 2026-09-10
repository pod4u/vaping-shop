import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { createDraftOrder, listOrders } from "@/lib/order-service";
import {
  OrderInputError,
  parseDraftOrderInput,
  parseOrderStatus,
} from "@/lib/order-validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminApiPermission(request, "orders.view");
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = request.nextUrl;
    const page = parseBoundedInteger(searchParams.get("page"), 1, 1, 100_000);
    const pageSize = parseBoundedInteger(searchParams.get("page_size"), 25, 1, 100);
    const status = parseOrderStatus(searchParams.get("status"));
    const result = await listOrders({ page, pageSize, status });

    return NextResponse.json(
      {
        success: true,
        orders: result.orders,
        pagination: {
          page,
          page_size: pageSize,
          total: result.total,
          total_pages: Math.ceil(result.total / pageSize),
        },
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
    console.error("Admin order list failed");
    return NextResponse.json(
      { success: false, error: "โหลดรายการออเดอร์ไม่สำเร็จ" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminApiPermission(request, "orders.create");
  if (unauthorized) return unauthorized;

  try {
    const input = parseDraftOrderInput(await request.json());
    const result = await createDraftOrder(input);
    return NextResponse.json(
      {
        success: true,
        order_id: result.orderId,
        order_number: result.orderNumber,
        idempotent_replay: result.idempotentReplay,
        message: "บันทึกรายการสำเร็จ กรุณาตรวจสอบก่อนยืนยันสต๊อก",
      },
      { status: result.idempotentReplay ? 200 : 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    if (error instanceof OrderInputError || error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof OrderInputError ? error.message : "รูปแบบข้อมูลไม่ถูกต้อง",
        },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const code = typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "unknown";
    if (code === "P0002" || code === "23503") {
      return NextResponse.json(
        { success: false, error: "ไม่พบลูกค้า ที่อยู่ บัญชี LINE หรือสินค้าที่เลือก" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("Admin draft order creation failed", { code });
    return NextResponse.json(
      { success: false, error: "บันทึกรายการไม่สำเร็จ" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

function parseBoundedInteger(
  value: string | null,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value === null || value === "") return fallback;
  if (!/^\d+$/.test(value)) throw new OrderInputError("พารามิเตอร์หน้าไม่ถูกต้อง");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new OrderInputError("พารามิเตอร์หน้าไม่ถูกต้อง");
  }
  return parsed;
}
