import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, getAdminSession } from "@/lib/admin-auth";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { requireSameOrigin } from "@/lib/warehouse-api";
import { getWarehouseCredentialSummary, updateWarehouseCredentials } from "@/lib/warehouse-credentials";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminApiPermission(request, "settings.view");
  if (unauthorized) return unauthorized;
  try {
    const account = await getWarehouseCredentialSummary();
    return NextResponse.json({ success: true, account }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: "โหลดข้อมูลบัญชีคลังสินค้าไม่สำเร็จ" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const sameOriginError = requireSameOrigin(request);
  if (sameOriginError) return sameOriginError;
  const unauthorized = await requireAdminApiPermission(request, "settings.manage");
  if (unauthorized) return unauthorized;
  const session = await getAdminSession(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json() as Record<string, unknown>;
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!/^[a-z0-9._-]{3,50}$/u.test(username)) {
      return NextResponse.json({ success: false, error: "ชื่อผู้ใช้ต้องมี 3–50 ตัว และใช้ได้เฉพาะ a-z, 0-9, จุด ขีดกลาง หรือขีดล่าง" }, { status: 400 });
    }
    if (password.length < 8 || password.length > 200) {
      return NextResponse.json({ success: false, error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" }, { status: 400 });
    }
    const account = await updateWarehouseCredentials({
      username,
      password,
      updatedBy: `${session.accountId}:${session.role}`,
    });
    return NextResponse.json({
      success: true,
      account,
      message: "เปลี่ยนบัญชีคลังสินค้าเรียบร้อยแล้ว รหัสใหม่ใช้ได้ในการเข้าสู่ระบบครั้งถัดไป",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: "เปลี่ยนบัญชีคลังสินค้าไม่สำเร็จ" }, { status: 500 });
  }
}
