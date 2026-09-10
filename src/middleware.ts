import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, getAdminSession } from '@/lib/admin-auth';
import { roleHasPermission, type AdminPermission } from '@/lib/admin-permissions';

const PAGE_PERMISSIONS: Array<[string, AdminPermission]> = [
  ['/admin/settings', 'settings.view'],
  ['/admin/customers', 'customers.view'],
  ['/admin/orders', 'orders.view'],
  ['/admin/stock/imports', 'stock.manage'],
  ['/admin/stock', 'stock.view'],
  ['/admin', 'dashboard.view'],
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPage = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isAdminApi = pathname.startsWith('/api/admin') && pathname !== '/api/admin/auth';
  if (isAdminPage || isAdminApi) {
    const session = await getAdminSession(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
    if (!session) {
      if (isAdminApi) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    if (isAdminPage) {
      const permission = PAGE_PERMISSIONS.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1];
      if (permission && !roleHasPermission(session.role, permission)) {
        const destination = new URL('/admin', request.url);
        destination.searchParams.set('forbidden', '1');
        return NextResponse.redirect(destination);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
