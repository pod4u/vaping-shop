import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, createAdminSessionToken } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { password } = body;

  const adminPassword = process.env.ADMIN_PASSWORD;
  const sessionToken = await createAdminSessionToken();
  if (!adminPassword || !sessionToken) {
    return NextResponse.json({
      success: false,
      error: 'ยังไม่ได้ตั้งค่าระบบแอดมิน'
    }, { status: 503 });
  }

  if (password !== adminPassword) {
    return NextResponse.json({
      success: false,
      error: 'รหัสผ่านไม่ถูกต้อง'
    }, { status: 401 });
  }
  
  const response = NextResponse.json({
    success: true,
    message: 'เข้าสู่ระบบสำเร็จ'
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
