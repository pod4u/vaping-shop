import { NextRequest, NextResponse } from "next/server";
import { MEMBER_COOKIE_NAME, verifyMemberSessionToken } from "@/lib/member-auth";
import { getServerSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } },
) {
  const session = verifyMemberSessionToken(request.cookies.get(MEMBER_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "กรุณาเข้าสู่ระบบสมาชิกผ่าน LINE อีกครั้ง" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!UUID_PATTERN.test(params.orderId)) {
    return NextResponse.json(
      { success: false, error: "เลขที่ออเดอร์ไม่ถูกต้อง" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const { data, error } = await getServerSupabase().rpc("cancel_member_unpaid_order", {
      p_order_id: params.orderId,
      p_customer_id: session.customerId,
    });
    if (error) throw error;
    return NextResponse.json(
      { success: true, status: data?.status ?? "cancelled" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (reason) {
    const code = reason && typeof reason === "object" && "code" in reason
      ? String(reason.code)
      : "";
    if (code === "P0002" || code === "55000") {
      return NextResponse.json(
        { success: false, error: "ยกเลิกไม่ได้ รายการนี้อาจชำระเงินหรือดำเนินการต่อแล้ว กรุณาติดต่อเจ้าหน้าที่ใน LINE" },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { success: false, error: "ระบบยกเลิกออเดอร์ขัดข้องชั่วคราว" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
