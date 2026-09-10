import { NextRequest, NextResponse } from "next/server";
import { requireWarehouseSession } from "@/lib/warehouse-api";
import { getWarehouseOrder, parseWarehouseOrderId, WarehouseInputError } from "@/lib/warehouse-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { orderId: string } }) {
  const auth = await requireWarehouseSession(request);
  if (auth.response) return auth.response;
  try {
    const detail = await getWarehouseOrder(parseWarehouseOrderId(params.orderId));
    if (!detail) return NextResponse.json({ success: false, error: "ไม่พบงานคลัง" }, { status: 404 });
    return NextResponse.json({ success: true, ...detail }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof WarehouseInputError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error("Warehouse order detail failed");
    return NextResponse.json({ success: false, error: "โหลดรายละเอียดงานไม่สำเร็จ" }, { status: 500 });
  }
}
