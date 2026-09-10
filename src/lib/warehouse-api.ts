import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { getWarehouseSession, WAREHOUSE_COOKIE_NAME, type WarehouseSession } from "@/lib/warehouse-auth";

export async function requireWarehouseSession(request: NextRequest): Promise<
  | { session: WarehouseSession; response: null }
  | { session: null; response: NextResponse }
> {
  const session = await getWarehouseSession(request.cookies.get(WAREHOUSE_COOKIE_NAME)?.value);
  if (session) return { session, response: null };
  return {
    session: null,
    response: NextResponse.json(
      { success: false, error: "กรุณาเข้าสู่ระบบคลังสินค้า" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    ),
  };
}

export function requireSameOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin) {
    return NextResponse.json({ success: false, error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  }
  try {
    if (new URL(origin).origin !== request.nextUrl.origin) {
      return NextResponse.json({ success: false, error: "คำขอข้ามเว็บไซต์ถูกปฏิเสธ" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ success: false, error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  }
  return null;
}
