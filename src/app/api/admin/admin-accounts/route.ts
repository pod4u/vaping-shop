import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, getAdminSession, isReservedAdminUsername } from "@/lib/admin-auth";
import { isAdminRole } from "@/lib/admin-permissions";
import {
  AdminAccountInputError,
  createAdminAccount,
  listAdminAccounts,
  updateAdminAccount,
} from "@/lib/admin-account-service";

export const runtime = "nodejs";

async function requireOwner(request: NextRequest) {
  const session = await getAdminSession(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
  return session?.role === "owner" ? session : null;
}

function errorResponse(error: unknown) {
  if (error instanceof AdminAccountInputError) {
    const status = error.code === "not_found" ? 404 : error.code === "duplicate" ? 409 : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
  console.error("Admin account management failed", error);
  return NextResponse.json({ success: false, error: "จัดการบัญชีแอดมินไม่สำเร็จ" }, { status: 500 });
}

export async function GET(request: NextRequest) {
  const session = await requireOwner(request);
  if (!session) return NextResponse.json({ success: false, error: "เฉพาะ Owner เท่านั้น" }, { status: 403 });
  try {
    return NextResponse.json({ success: true, accounts: await listAdminAccounts() }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const session = await requireOwner(request);
  if (!session) return NextResponse.json({ success: false, error: "เฉพาะ Owner เท่านั้น" }, { status: 403 });
  try {
    const body = await request.json();
    if (!isAdminRole(body.role)) throw new AdminAccountInputError("สิทธิ์บัญชีไม่ถูกต้อง", "invalid_input");
    if (typeof body.username === "string" && isReservedAdminUsername(body.username)) {
      throw new AdminAccountInputError("ชื่อผู้ใช้นี้ซ้ำกับบัญชีแอดมินเดิม", "duplicate");
    }
    const account = await createAdminAccount({
      username: typeof body.username === "string" ? body.username : "",
      displayName: typeof body.displayName === "string" ? body.displayName : "",
      password: typeof body.password === "string" ? body.password : "",
      role: body.role,
      actor: `${session.accountId}:${session.role}`,
    });
    return NextResponse.json({ success: true, account, message: "เพิ่มบัญชีแอดมินแล้ว" }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  const session = await requireOwner(request);
  if (!session) return NextResponse.json({ success: false, error: "เฉพาะ Owner เท่านั้น" }, { status: 403 });
  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) throw new AdminAccountInputError("ไม่พบรหัสบัญชี", "invalid_input");
    if (id === session.accountId && (body.active === false || (body.role && body.role !== "owner"))) {
      throw new AdminAccountInputError("ไม่สามารถปิดหรือลดสิทธิ์บัญชีที่กำลังใช้งานอยู่", "invalid_input");
    }
    if (body.role !== undefined && !isAdminRole(body.role)) {
      throw new AdminAccountInputError("สิทธิ์บัญชีไม่ถูกต้อง", "invalid_input");
    }
    const account = await updateAdminAccount({
      id,
      displayName: typeof body.displayName === "string" ? body.displayName : undefined,
      password: typeof body.password === "string" ? body.password : undefined,
      role: body.role,
      active: typeof body.active === "boolean" ? body.active : undefined,
      actor: `${session.accountId}:${session.role}`,
    });
    return NextResponse.json({ success: true, account, message: "อัปเดตบัญชีแอดมินแล้ว" });
  } catch (error) {
    return errorResponse(error);
  }
}
