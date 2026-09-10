import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, getAdminSession } from "@/lib/admin-auth";
import { roleHasPermission, type AdminPermission } from "@/lib/admin-permissions";

export async function requireAdminApiSession(
  request: NextRequest,
): Promise<NextResponse | null> {
  const session = await getAdminSession(
    request.cookies.get(ADMIN_COOKIE_NAME)?.value,
  );

  if (session) return null;

  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

export async function requireAdminApiPermission(
  request: NextRequest,
  permission: AdminPermission,
): Promise<NextResponse | null> {
  const session = await getAdminSession(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!roleHasPermission(session.role, permission)) {
    return NextResponse.json(
      { success: false, error: "คุณไม่มีสิทธิ์ทำรายการนี้" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  return null;
}
