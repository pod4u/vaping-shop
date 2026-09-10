import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { getAnalyticsDashboard } from "@/lib/website-analytics-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const denied = await requireAdminApiPermission(request, "analytics.view");
  if (denied) return denied;
  const days = request.nextUrl.searchParams.get("days") ?? "7";
  if (days !== "7" && days !== "28") return NextResponse.json({ error: "เลือกได้เฉพาะ 7 หรือ 28 วัน" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  const dashboard = await getAnalyticsDashboard(days === "7" ? 7 : 28);
  return NextResponse.json(dashboard, { headers: { "Cache-Control": "no-store" } });
}
