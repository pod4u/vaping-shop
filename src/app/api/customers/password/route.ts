import { NextRequest, NextResponse } from "next/server";
import { MEMBER_COOKIE_NAME, verifyMemberSessionToken } from "@/lib/member-auth";
import { CustomerInputError, parseMemberPasswordInput } from "@/lib/customer-validation";
import { MemberPasswordAuthError, setMemberPassword } from "@/lib/member-password-auth";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest) {
  const session = verifyMemberSessionToken(request.cookies.get(MEMBER_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ success: false, error: "กรุณาเข้าสู่ระบบสมาชิกอีกครั้ง" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const password = parseMemberPasswordInput(await request.json());
    const result = await setMemberPassword(session.customerId, password);
    return NextResponse.json({ success: true, created: result.created }, { headers: { "Cache-Control": "no-store" } });
  } catch (reason) {
    if (reason instanceof CustomerInputError) {
      return NextResponse.json({ success: false, error: reason.message, field: reason.field }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    if (reason instanceof MemberPasswordAuthError && reason.reason === "conflict") {
      return NextResponse.json({ success: false, error: "ไม่สามารถสร้างบัญชีเข้าสู่ระบบได้ กรุณาติดต่อเจ้าหน้าที่" }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ success: false, error: "ตั้งรหัสผ่านไม่สำเร็จ กรุณาลองใหม่" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
