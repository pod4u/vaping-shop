import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { ADMIN_COOKIE_NAME, getAdminSession } from "@/lib/admin-auth";
import { requireSameOrigin } from "@/lib/warehouse-api";
import {
  parseWarehouseOrderId,
  shipWarehouseOrder,
  updateWarehouseFulfillment,
  WarehouseInputError,
  type WarehouseAction,
} from "@/lib/warehouse-service";

export const dynamic = "force-dynamic";

const ACTIONS = new Set<WarehouseAction | "ship">(["start", "pack", "problem", "resume", "ship"]);
const PROBLEM_CODES = new Set(["item_missing", "quantity_mismatch", "damaged", "address_unclear", "shipping_unavailable", "other"]);

export async function PATCH(request: NextRequest, { params }: { params: { orderId: string } }) {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  const unauthorized = await requireAdminApiPermission(request, "orders.ship");
  if (unauthorized) return unauthorized;
  const session = await getAdminSession(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json() as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action as WarehouseAction | "ship" : "" as WarehouseAction;
    if (!ACTIONS.has(action)) throw new WarehouseInputError("คำสั่งงานไม่ถูกต้อง");
    const orderId = parseWarehouseOrderId(params.orderId);
    const actor = `admin:${session.accountId}:${session.role}`;
    const problemCode = typeof body.problemCode === "string" ? body.problemCode : null;
    const problemNote = typeof body.problemNote === "string" ? body.problemNote.trim() : null;
    if (action === "problem" && (!problemCode || !PROBLEM_CODES.has(problemCode) || !problemNote || problemNote.length > 500)) {
      throw new WarehouseInputError("กรุณาเลือกปัญหาและระบุรายละเอียดไม่เกิน 500 ตัวอักษร");
    }
    const result = action === "ship"
      ? await shipWarehouseOrder({ orderId, actor })
      : await updateWarehouseFulfillment({ orderId, action, actor, problemCode, problemNote });
    const messages = {
      start: "รับงานและเริ่มแพ็กแล้ว",
      pack: "บันทึกว่าแพ็กสินค้าเสร็จแล้ว",
      problem: "บันทึกปัญหางานจัดส่งแล้ว",
      resume: "นำงานกลับเข้าคิวแล้ว",
      ship: "ยืนยันการจัดส่งแล้ว ลูกค้าดูสถานะได้ในระบบสมาชิกค่ะ",
    };
    return NextResponse.json({ success: true, ...result, message: messages[action] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof WarehouseInputError || error instanceof SyntaxError) {
      return NextResponse.json({ success: false, error: error instanceof WarehouseInputError ? error.message : "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }
    const db = error && typeof error === "object" ? error as { code?: string } : {};
    if (db.code === "P0002") return NextResponse.json({ success: false, error: "ไม่พบงานคลัง" }, { status: 404 });
    if (db.code === "55000") return NextResponse.json({ success: false, error: "สถานะงานเปลี่ยนไปแล้วหรือยังแพ็กไม่เสร็จ กรุณาโหลดหน้าใหม่" }, { status: 409 });
    console.error("Admin fulfillment action failed", { code: db.code ?? "unknown" });
    return NextResponse.json({ success: false, error: "อัปเดตสถานะจัดส่งไม่สำเร็จ" }, { status: 500 });
  }
}
