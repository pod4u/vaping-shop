import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, getAdminSession } from '@/lib/admin-auth';
import { roleHasPermission, type AdminPermission } from '@/lib/admin-permissions';
import { getWarehouseSession, WAREHOUSE_COOKIE_NAME } from '@/lib/warehouse-auth';

const PAGE_PERMISSIONS: Array<[string, AdminPermission]> = [
  ['/admin/settings', 'settings.view'],
  ['/admin/customers', 'customers.view'],
  ['/admin/orders', 'orders.view'],
  ['/admin/stock/imports', 'stock.manage'],
  ['/admin/stock', 'stock.view'],
  ['/admin', 'dashboard.view'],
];

const REVIEW_DESIGN_COOKIE = 'pod4u_review_design_preview';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const reviewDesignMode = request.cookies.get(REVIEW_DESIGN_COOKIE)?.value === 'enabled';
  if (pathname === '/reviews' && reviewDesignMode) {
    const previewUrl = request.nextUrl.clone();
    previewUrl.pathname = '/reviews/design-preview-7q9m2';
    return NextResponse.rewrite(previewUrl);
  }
  if (pathname === '/reviews/design-preview-7q9m2' && !reviewDesignMode) {
    return NextResponse.redirect(new URL('/reviews', request.url));
  }

  const isWarehousePage = pathname.startsWith('/warehouse') && pathname !== '/warehouse/login';
  const isWarehouseApi = pathname.startsWith('/api/warehouse') && pathname !== '/api/warehouse/auth';
  if (isWarehousePage || isWarehouseApi) {
    const session = await getWarehouseSession(request.cookies.get(WAREHOUSE_COOKIE_NAME)?.value);
    if (!session) {
      if (isWarehouseApi) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/warehouse/login', request.url));
    }
  }

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
  matcher: ['/admin/:path*', '/api/admin/:path*', '/warehouse/:path*', '/api/warehouse/:path*', '/reviews/:path*', '/reviews'],
};
