import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { AnalyticsSyncError, syncWebsiteAnalytics } from "@/lib/website-analytics-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization") ?? "";
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (!secret || !timingSafeEqual(digest(authorization), digest(`Bearer ${secret}`))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const result = await syncWebsiteAnalytics();
    const hasFailure = result.outcomes.some((item) => item.status === "error");
    return NextResponse.json(result, { status: hasFailure ? 502 : 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof AnalyticsSyncError ? error.message : "Analytics sync failed" }, {
      status: error instanceof AnalyticsSyncError ? error.status : 503, headers: { "Cache-Control": "no-store" },
    });
  }
}
