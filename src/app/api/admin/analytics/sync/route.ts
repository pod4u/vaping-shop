import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { AnalyticsSyncError, syncWebsiteAnalytics } from "@/lib/website-analytics-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const denied = await requireAdminApiPermission(request, "analytics.view");
  if (denied) return denied;
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "คำขอต้องมาจากหน้าแอดมินของเว็บไซต์นี้" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  try {
    return NextResponse.json(await syncWebsiteAnalytics(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof AnalyticsSyncError ? error.status : 503;
    return NextResponse.json({ error: error instanceof AnalyticsSyncError ? error.message : "ซิงก์ไม่สำเร็จ กรุณาตรวจการเชื่อมต่อฐานข้อมูล" }, {
      status, headers: { "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": "60" } : {}) },
    });
  }
}
