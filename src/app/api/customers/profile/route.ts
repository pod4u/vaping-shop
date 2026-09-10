import { NextRequest, NextResponse } from "next/server";
import { MEMBER_COOKIE_NAME, verifyMemberSessionToken } from "@/lib/member-auth";
import { CustomerInputError, parseMemberProfileInput, parseUuid } from "@/lib/customer-validation";
import { getServerSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  const session = verifyMemberSessionToken(request.cookies.get(MEMBER_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "กรุณาเข้าสู่ระบบสมาชิกผ่าน LINE อีกครั้ง" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const body = await request.json();
    const input = parseMemberProfileInput(body);
    const addressId = body && typeof body === "object" && "address_id" in body && body.address_id
      ? parseUuid(String(body.address_id), "รหัสที่อยู่")
      : null;
    const { data, error } = await getServerSupabase().rpc("update_member_profile", {
      p_customer_id: session.customerId,
      p_address_id: addressId,
      p_full_name: input.fullName,
      p_phone: input.phone,
      p_recipient_name: input.recipientName,
      p_address: input.address,
      p_province: input.province,
      p_postal_code: input.postalCode,
    });
    if (error) throw error;

    return NextResponse.json(
      { success: true, profile: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (reason) {
    if (reason instanceof CustomerInputError) {
      return NextResponse.json(
        { success: false, error: reason.message, field: reason.field },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const code = reason && typeof reason === "object" && "code" in reason ? String(reason.code) : "";
    if (code === "23505") {
      return NextResponse.json(
        { success: false, error: "เบอร์โทรศัพท์นี้ถูกใช้กับสมาชิกอื่นแล้ว กรุณาติดต่อเจ้าหน้าที่ใน LINE" },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (code === "P0002") {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลสมาชิกหรือที่อยู่ กรุณาเปิดระบบสมาชิกผ่าน LINE อีกครั้ง" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { success: false, error: "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
