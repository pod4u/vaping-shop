import { NextRequest, NextResponse } from 'next/server';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { password } = body;
  
  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({
      success: false,
      error: 'รหัสผ่านไม่ถูกต้อง'
    }, { status: 401 });
  }
  
  const response = NextResponse.json({
    success: true,
    message: 'เข้าสู่ระบบสำเร็จ'
  });
  
  // ตั้ง cookie ง่ายๆ
  response.cookies.set('admin_logged_in', 'true', {
    httpOnly: true,
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
  
  response.cookies.delete('admin_logged_in');
  
  return response;
}