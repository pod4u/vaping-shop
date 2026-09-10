import { NextRequest, NextResponse } from "next/server";
import { MEMBER_COOKIE_NAME, verifyMemberSessionToken } from "@/lib/member-auth";
import { getServerSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface DraftItemInput {
  product_flavor_id: string;
  quantity: number;
}

function validItems(value: unknown): value is DraftItemInput[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) return false;
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "object" || item === null) return false;
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.product_flavor_id !== "string" || !UUID_PATTERN.test(candidate.product_flavor_id)) return false;
    if (!Number.isInteger(candidate.quantity) || Number(candidate.quantity) < 1 || Number(candidate.quantity) > 99) return false;
    if (seen.has(candidate.product_flavor_id)) return false;
    seen.add(candidate.product_flavor_id);
  }
  return true;
}

export async function PATCH(request: NextRequest, { params }: { params: { orderId: string } }) {
  const session = verifyMemberSessionToken(request.cookies.get(MEMBER_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ success: false, error: "กรุณาเข้าสู่ระบบสมาชิกผ่าน LINE อีกครั้ง" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  if (!UUID_PATTERN.test(params.orderId)) {
    return NextResponse.json({ success: false, error: "เลขที่ออเดอร์ไม่ถูกต้อง" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "ข้อมูลรายการสินค้าไม่ถูกต้อง" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const items = typeof body === "object" && body !== null ? (body as Record<string, unknown>).items : null;
  if (!validItems(items)) {
    return NextResponse.json({ success: false, error: "ต้องมีสินค้า 1–100 รายการ และจำนวนต่อรายการ 1–99 ชิ้น" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const { data, error } = await getServerSupabase().rpc("update_member_draft_order", {
    p_order_id: params.orderId,
    p_customer_id: session.customerId,
    p_items: items,
  });

  if (error) {
    const conflict = error.message.includes("only draft") || error.message.includes("order not found");
    const unavailable = error.message.includes("unavailable");
    return NextResponse.json(
      { success: false, error: conflict ? "ออเดอร์นี้ถูกยืนยันหรือยกเลิกแล้ว จึงแก้ไขไม่ได้" : unavailable ? "มีสินค้าบางรายการไม่พร้อมขาย กรุณาลบรายการนั้นแล้วลองใหม่" : "บันทึกการแก้ไขไม่สำเร็จ กรุณาลองใหม่" },
      { status: conflict ? 409 : unavailable ? 422 : 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { data: refreshedOrder, error: refreshError } = await getServerSupabase()
    .from("orders")
    .select("id,order_number,status,subtotal,shipping_fee,discount_amount,discount_credit_id,total")
    .eq("id", params.orderId)
    .eq("customer_id", session.customerId)
    .maybeSingle();

  if (refreshError || !refreshedOrder) {
    return NextResponse.json({ success: false, error: "บันทึกรายการแล้ว แต่โหลดสรุปยอดไม่สำเร็จ กรุณารีเฟรชหน้า" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({ success: true, order: { ...data, ...refreshedOrder } }, { headers: { "Cache-Control": "no-store" } });
}
