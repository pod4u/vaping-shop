import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiPermission } from "@/lib/admin-api";
import {
  createLineIdentityLinkCode,
  IdentityLinkConfigurationError,
} from "@/lib/customer-identity-service";
import { getLineBotUserId } from "@/lib/line-client";
import {
  CustomerInputError,
  parseLineIdentityLinkInput,
  parsePositiveInteger,
} from "@/lib/customer-validation";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { customerId: string } },
) {
  const unauthorized = await requireAdminApiPermission(request, "customers.link_line");
  if (unauthorized) return unauthorized;

  try {
    const customerId = parsePositiveInteger(params.customerId, "รหัสลูกค้า");
    const input = parseLineIdentityLinkInput(await request.json());
    const providerAccountId = await getLineBotUserId();
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const result = await createLineIdentityLinkCode({
      customerId,
      providerAccountId,
      providerUserId: input.providerUserId,
      createdBy: "admin-session",
      ipAddress: forwardedFor?.slice(0, 64) || null,
      userAgent: request.headers.get("user-agent")?.slice(0, 500) || null,
    });

    return NextResponse.json(
      {
        success: true,
        code: result.code,
        expires_at: result.expiresAt,
        message: "สร้างรหัสสำเร็จ กรุณาแจ้งผ่านเบอร์เดิมในระบบเท่านั้น",
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    if (error instanceof CustomerInputError || error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof CustomerInputError
            ? error.message
            : "รูปแบบข้อมูลไม่ถูกต้อง",
        },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (error instanceof IdentityLinkConfigurationError) {
      console.error("LINE identity linking is not configured");
      return NextResponse.json(
        { success: false, error: "ระบบยืนยันสมาชิกยังตั้งค่าไม่ครบ" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const code = typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "unknown";
    if (code === "P0002" || code === "23503") {
      return NextResponse.json(
        { success: false, error: "ไม่พบลูกค้าที่พร้อมเชื่อมบัญชี" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    console.error("LINE identity link code creation failed", { code });
    return NextResponse.json(
      { success: false, error: "สร้างรหัสยืนยันไม่สำเร็จ" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
