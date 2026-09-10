import { NextRequest, NextResponse } from "next/server";
import { requireWarehouseSession } from "@/lib/warehouse-api";
import { listWarehouseOrders, parseWarehouseStatus, WarehouseInputError } from "@/lib/warehouse-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireWarehouseSession(request);
  if (auth.response) return auth.response;
  try {
    const status = parseWarehouseStatus(request.nextUrl.searchParams.get("status"));
    const result = await listWarehouseOrders(status);
    return NextResponse.json({ success: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof WarehouseInputError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error("Warehouse order list failed");
    return NextResponse.json({ success: false, error: "โหลดงานคลังไม่สำเร็จ" }, { status: 500 });
  }
}
