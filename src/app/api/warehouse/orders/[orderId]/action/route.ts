import { NextRequest, NextResponse } from "next/server";
import { requireSameOrigin, requireWarehouseSession } from "@/lib/warehouse-api";
import { parseWarehouseOrderId, updateWarehouseFulfillment, WarehouseInputError, type WarehouseAction } from "@/lib/warehouse-service";

const ACTIONS = new Set<WarehouseAction>(["start", "pack", "problem", "resume"]);
const PROBLEM_CODES = new Set(["item_missing", "quantity_mismatch", "damaged", "address_unclear", "shipping_unavailable", "other"]);

export async function PATCH(request: NextRequest, { params }: { params: { orderId: string } }) {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  const auth = await requireWarehouseSession(request);
  if (auth.response) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action as WarehouseAction : "" as WarehouseAction;
    if (!ACTIONS.has(action)) throw new WarehouseInputError("คำสั่งงานไม่ถูกต้อง");
    const problemCode = typeof body.problemCode === "string" ? body.problemCode : null;
    const problemNote = typeof body.problemNote === "string" ? body.problemNote.trim() : null;
    if (action === "problem" && (!problemCode || !PROBLEM_CODES.has(problemCode) || !problemNote || problemNote.length > 500)) {
      throw new WarehouseInputError("กรุณาเลือกปัญหาและระบุรายละเอียดไม่เกิน 500 ตัวอักษร");
    }
    const result = await updateWarehouseFulfillment({
      orderId: parseWarehouseOrderId(params.orderId),
      action,
      actor: `warehouse:${auth.session.accountId}`,
      problemCode,
      problemNote,
    });
    return NextResponse.json({ success: true, ...result, message: actionMessage(action) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof WarehouseInputError || error instanceof SyntaxError) {
      return NextResponse.json({ success: false, error: error instanceof WarehouseInputError ? error.message : "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }
    const db = error && typeof error === "object" ? error as { code?: string } : {};
    if (db.code === "P0002") return NextResponse.json({ success: false, error: "ไม่พบงานคลัง" }, { status: 404 });
    if (db.code === "55000") return NextResponse.json({ success: false, error: "สถานะงานเปลี่ยนไปแล้ว กรุณาโหลดหน้าใหม่" }, { status: 409 });
    console.error("Warehouse action failed", { code: db.code ?? "unknown" });
    return NextResponse.json({ success: false, error: "อัปเดตงานไม่สำเร็จ" }, { status: 500 });
  }
}

function actionMessage(action: WarehouseAction): string {
  return ({ start: "รับงานและเริ่มแพ็กแล้ว", pack: "บันทึกว่าแพ็กเสร็จแล้ว", problem: "แจ้งปัญหาให้ร้านแล้ว", resume: "นำงานกลับเข้าคิวแล้ว" })[action];
}
