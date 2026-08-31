import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // ถ้าเข้า /admin
  if (pathname.startsWith('/admin') && !pathname.includes('/admin/login')) {
    const isLoggedIn = request.cookies.get('admin_logged_in')?.value;
    
    if (!isLoggedIn) {
      // ถ้าไม่มี session → ไปหน้า login
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};