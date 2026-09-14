import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, getAdminSession } from "@/lib/admin-auth";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { requireSameOrigin } from "@/lib/warehouse-api";
import {
  connectTelegramDestination,
  findTelegramDestinations,
  getTelegramAdminStatus,
  sendTelegramTestMessage,
} from "@/lib/telegram-notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminApiPermission(request, "settings.view");
  if (unauthorized) return unauthorized;
  try {
    const status = await getTelegramAdminStatus();
    const destinations = request.nextUrl.searchParams.get("discover") === "1"
      ? await findTelegramDestinations()
      : undefined;
    return NextResponse.json({ success: true, status, destinations }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "ตรวจสอบ Telegram ไม่สำเร็จ",
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: NextRequest) {
  const sameOriginError = requireSameOrigin(request);
  if (sameOriginError) return sameOriginError;
  const unauthorized = await requireAdminApiPermission(request, "settings.manage");
  if (unauthorized) return unauthorized;
  const session = await getAdminSession(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    if (body.action === "connect") {
      const chatId = typeof body.chatId === "string" ? body.chatId.trim() : "";
      if (!/^-?[0-9]{1,30}$/.test(chatId)) {
        return NextResponse.json({ success: false, error: "ห้อง Telegram ไม่ถูกต้อง" }, { status: 400 });
      }
      const destination = await connectTelegramDestination(chatId, `${session.accountId}:${session.role}`);
      await sendTelegramTestMessage();
      return NextResponse.json({ success: true, destination, message: "เชื่อมต่อและส่งข้อความทดสอบแล้ว" });
    }
    if (body.action === "test") {
      await sendTelegramTestMessage();
      return NextResponse.json({ success: true, message: "ส่งข้อความทดสอบแล้ว กรุณาตรวจใน Telegram" });
    }
    return NextResponse.json({ success: false, error: "คำสั่งไม่ถูกต้อง" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "เชื่อมต่อ Telegram ไม่สำเร็จ",
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
