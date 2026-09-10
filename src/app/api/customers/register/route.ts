import { NextRequest, NextResponse } from "next/server";
import { registerCustomerWithAddress } from "@/lib/customer-service";
import { CustomerInputError, parseRegistrationInput } from "@/lib/customer-validation";
import {
  LineRegistrationError,
  registerLineCustomerWithAddress,
} from "@/lib/line-registration-service";
import { pushMessage } from "@/lib/line-client";
import {
  createMemberSessionToken,
  MEMBER_COOKIE_NAME,
  MEMBER_SESSION_TTL_SECONDS,
} from "@/lib/member-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = parseRegistrationInput(body);
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const ipAddress = forwardedFor?.slice(0, 64) || null;
    const userAgent = request.headers.get("user-agent")?.slice(0, 500) || null;
    const lineSessionId = typeof body.line_session_id === "string"
      ? body.line_session_id.trim()
      : "";
    const lineSessionToken = typeof body.line_session_token === "string"
      ? body.line_session_token.trim()
      : "";

    if (Boolean(lineSessionId) !== Boolean(lineSessionToken)) {
      throw new LineRegistrationError("invalid", "ข้อมูลเชื่อมต่อ LINE ไม่ครบถ้วน");
    }

    if (lineSessionId && lineSessionToken) {
      const result = await registerLineCustomerWithAddress({
        sessionId: lineSessionId,
        token: lineSessionToken,
        registration: input,
        ipAddress,
        userAgent,
      });
      const notificationSent = await pushMessage(result.providerUserId, {
        type: "text",
        text: "✅ สมัครสมาชิกและเชื่อมบัญชี LINE สำเร็จแล้ว\n\nตอนนี้คุณสามารถเลือกสินค้าจากเมนู ‘สั่งซื้อสินค้า’ และส่งรายการเข้าระบบได้ทันทีค่ะ",
      });

      const response = NextResponse.json(
        {
          success: true,
          customer_id: result.customerId,
          line_linked: true,
          notification_sent: notificationSent,
          message: "สมัครสมาชิกและเชื่อม LINE สำเร็จ!",
        },
        { status: 201, headers: { "Cache-Control": "no-store" } },
      );
      response.cookies.set(MEMBER_COOKIE_NAME, createMemberSessionToken(result.customerId), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: MEMBER_SESSION_TTL_SECONDS,
        path: "/",
      });
      return response;
    }

    const customerId = await registerCustomerWithAddress(input, { ipAddress, userAgent });

    const response = NextResponse.json(
      { success: true, customer_id: customerId, message: "สมัครสมาชิกสำเร็จ!" },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(MEMBER_COOKIE_NAME, createMemberSessionToken(customerId), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: MEMBER_SESSION_TTL_SECONDS,
      path: "/",
    });
    return response;
  } catch (error: unknown) {
    if (
      error instanceof CustomerInputError
      || error instanceof LineRegistrationError
      || error instanceof SyntaxError
    ) {
      const status = error instanceof LineRegistrationError && error.reason === "expired"
        ? 410
        : error instanceof LineRegistrationError && error.reason === "already_linked"
          ? 409
          : 400;
      return NextResponse.json(
        {
          success: false,
          error: error instanceof CustomerInputError
            ? error.message
            : error instanceof LineRegistrationError
              ? error.reason === "expired"
                ? "ลิงก์สมัครสมาชิกหมดอายุ กรุณาขอลิงก์ใหม่จาก LINE"
                : error.reason === "already_linked"
                  ? "บัญชี LINE นี้เชื่อมสมาชิกแล้ว"
                  : "ลิงก์สมัครสมาชิกไม่ถูกต้อง กรุณาขอลิงก์ใหม่จาก LINE"
              : "รูปแบบข้อมูลไม่ถูกต้อง",
          ...(error instanceof CustomerInputError && error.field ? { field: error.field } : {}),
        },
        { status, headers: { "Cache-Control": "no-store" } },
      );
    }

    const code = typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "unknown";
    console.error("Customer registration failed", { code });

    if (code === "23505") {
      return NextResponse.json(
        { success: false, error: "เบอร์โทรนี้เคยสมัครแล้ว" },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาด กรุณาลองใหม่" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
