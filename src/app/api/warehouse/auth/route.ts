import { NextRequest, NextResponse } from "next/server";
import {
  authenticateWarehouse,
  createWarehouseSessionToken,
  getWarehouseSession,
  isWarehouseConfigured,
  publicWarehouseSession,
  WAREHOUSE_COOKIE_NAME,
} from "@/lib/warehouse-auth";
import { requireSameOrigin } from "@/lib/warehouse-api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getWarehouseSession(request.cookies.get(WAREHOUSE_COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ success: true, session: publicWarehouseSession(session) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  if (!isWarehouseConfigured()) {
    return NextResponse.json({ success: false, error: "ยังไม่ได้ตั้งค่าบัญชีคลังสินค้า" }, { status: 503 });
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const username = typeof body.username === "string" ? body.username.slice(0, 100) : "";
  const password = typeof body.password === "string" ? body.password.slice(0, 200) : "";
  const account = await authenticateWarehouse(username, password);
  if (!account) {
    return NextResponse.json({ success: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }
  const token = await createWarehouseSessionToken(account);
  if (!token) return NextResponse.json({ success: false, error: "ระบบล็อกอินยังไม่พร้อมใช้งาน" }, { status: 503 });
  const response = NextResponse.json({ success: true, message: "เข้าสู่ระบบสำเร็จ" });
  response.cookies.set(WAREHOUSE_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 12 * 60 * 60,
    path: "/",
  });
  return response;
}

export async function DELETE(request: NextRequest) {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  const response = NextResponse.json({ success: true, message: "ออกจากระบบสำเร็จ" });
  response.cookies.set(WAREHOUSE_COOKIE_NAME, "", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", maxAge: 0, path: "/" });
  return response;
}
