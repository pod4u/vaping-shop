import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { getDailyRevenueReport } from "@/lib/revenue-report-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const denied = await requireAdminApiPermission(request, "analytics.view");
  if (denied) return denied;

  try {
    return NextResponse.json(await getDailyRevenueReport(7), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Daily revenue report failed", {
      code: error && typeof error === "object" && "code" in error ? String(error.code) : "unknown",
    });
    return NextResponse.json({ error: "โหลดรายงานยอดรับไม่สำเร็จ" }, {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
