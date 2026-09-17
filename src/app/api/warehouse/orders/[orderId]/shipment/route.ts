import { NextRequest, NextResponse } from "next/server";
import { requireSameOrigin, requireWarehouseSession } from "@/lib/warehouse-api";
import { parseWarehouseOrderId, shipWarehouseOrder, WarehouseInputError } from "@/lib/warehouse-service";

export async function PATCH(request: NextRequest, { params }: { params: { orderId: string } }) {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  const auth = await requireWarehouseSession(request);
  if (auth.response) return auth.response;
  try {
    const orderId = parseWarehouseOrderId(params.orderId);
    const result = await shipWarehouseOrder({
      orderId,
      actor: `warehouse:${auth.session.accountId}`,
    });

    return NextResponse.json({
      success: true,
      ...result,
      message: result.idempotent_replay
        ? "ออเดอร์นี้บันทึกการจัดส่งไว้แล้วค่ะ"
        : "ยืนยันการจัดส่งสำเร็จ ลูกค้าตรวจสอบสถานะได้ในระบบสมาชิกค่ะ",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof WarehouseInputError || error instanceof SyntaxError) {
      return NextResponse.json({ success: false, error: error instanceof WarehouseInputError ? error.message : "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }
    const db = error && typeof error === "object" ? error as { code?: string } : {};
    if (db.code === "P0002") return NextResponse.json({ success: false, error: "ไม่พบงานคลัง" }, { status: 404 });
    if (db.code === "55000") return NextResponse.json({ success: false, error: "ต้องแพ็กสินค้าให้เสร็จก่อนยืนยันจัดส่ง" }, { status: 409 });
    console.error("Warehouse shipment failed", { code: db.code ?? "unknown" });
    return NextResponse.json({ success: false, error: "ยืนยันการจัดส่งไม่สำเร็จ" }, { status: 500 });
  }
}
