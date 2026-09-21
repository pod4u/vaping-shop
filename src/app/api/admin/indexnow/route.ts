import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { IndexNowError, submitIndexNow } from "@/lib/indexnow";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const denied = await requireAdminApiPermission(request, "settings.manage");
  if (denied) return denied;

  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) {
    return NextResponse.json(
      { error: "คำขอต้องมาจากหน้าแอดมินของเว็บไซต์นี้" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const body = await request.json();
    return NextResponse.json(await submitIndexNow(body.urls), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const status = error instanceof IndexNowError ? error.status : 500;
    const message = error instanceof IndexNowError ? error.message : "ส่ง URL ไป IndexNow ไม่สำเร็จ";
    return NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
