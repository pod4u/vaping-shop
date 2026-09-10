import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  authenticateAdmin,
  createAdminSessionToken,
  getAdminSession,
  publicAdminSession,
} from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ success: true, session: publicAdminSession(session) }, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";

  const account = await authenticateAdmin(username, password);
  if (!process.env.ADMIN_PASSWORD && !process.env.ADMIN_ACCOUNTS_JSON) {
    return NextResponse.json({
      success: false,
      error: 'ยังไม่ได้ตั้งค่าระบบแอดมิน'
    }, { status: 503 });
  }

  if (!account) {
    return NextResponse.json({
      success: false,
      error: 'รหัสผ่านไม่ถูกต้อง'
    }, { status: 401 });
  }
  const sessionToken = await createAdminSessionToken(account.accountId, account.role);
  if (!sessionToken) {
    return NextResponse.json({ success: false, error: "ยังไม่ได้ตั้งค่าระบบแอดมิน" }, { status: 503 });
  }
  
  const response = NextResponse.json({
    success: true,
    message: 'เข้าสู่ระบบสำเร็จ',
    role: account.role,
  });
  
  response.cookies.set(ADMIN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60,
    path: '/',
  });
  
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: 'ออกจากระบบสำเร็จ'
  });
  
  response.cookies.delete(ADMIN_COOKIE_NAME);
  
  return response;
}
