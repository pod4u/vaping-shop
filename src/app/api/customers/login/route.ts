import { NextRequest, NextResponse } from "next/server";
import { createMemberSessionToken, MEMBER_COOKIE_NAME, MEMBER_SESSION_TTL_SECONDS } from "@/lib/member-auth";
import { CustomerInputError, parseMemberLoginInput } from "@/lib/customer-validation";
import { loginMemberWithPassword, MemberPasswordAuthError } from "@/lib/member-password-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const input = parseMemberLoginInput(await request.json());
    const customerId = await loginMemberWithPassword(input.phone, input.password);
    const response = NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(MEMBER_COOKIE_NAME, createMemberSessionToken(customerId), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: MEMBER_SESSION_TTL_SECONDS,
      path: "/",
    });
    return response;
  } catch (reason) {
    if (reason instanceof CustomerInputError) {
      return NextResponse.json({ success: false, error: reason.message }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    if (reason instanceof MemberPasswordAuthError && reason.reason === "invalid") {
      return NextResponse.json({ success: false, error: "เบอร์โทรศัพท์หรือรหัสผ่านไม่ถูกต้อง" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ success: false, error: "ระบบเข้าสู่ระบบขัดข้องชั่วคราว" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
