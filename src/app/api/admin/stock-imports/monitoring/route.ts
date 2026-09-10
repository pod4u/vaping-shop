import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiPermission } from "@/lib/admin-api";
import {
  getStockImportRuns,
  getLatestStockImportRun,
  getLatestSuccessfulStockImportRun,
  getLatestFailedStockImportRun,
  type StockImportRun,
} from "@/lib/stock-import-runs-service";
import { getNextScheduledRun } from "@/lib/bangkok-time";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface MonitoringSummary {
  latestRun: StockImportRun | null;
  lastSuccessfulRun: StockImportRun | null;
  lastFailedRun: StockImportRun | null;
  recentRuns: StockImportRun[];
  schedule: string;
  nextScheduledRun: string;
  autoApplyEnabled: boolean;
  integrationConfigured: boolean;
}

function isIntegrationConfigured(): boolean {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();
  const spreadsheetId = process.env.GOOGLE_STOCK_SPREADSHEET_ID?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();
  return Boolean(email && privateKey && spreadsheetId && cronSecret);
}

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminApiPermission(request, "stock.manage");
  if (unauthorized) return unauthorized;

  try {
    const [latestRun, lastSuccessfulRun, lastFailedRun, recentRuns] = await Promise.all([
      getLatestStockImportRun(),
      getLatestSuccessfulStockImportRun(),
      getLatestFailedStockImportRun(),
      getStockImportRuns(20),
    ]);

    const summary: MonitoringSummary = {
      latestRun,
      lastSuccessfulRun,
      lastFailedRun,
      recentRuns,
      schedule: "03:00 Asia/Bangkok",
      nextScheduledRun: getNextScheduledRun(),
      autoApplyEnabled: process.env.STOCK_IMPORT_AUTO_APPLY === "true",
      integrationConfigured: isIntegrationConfigured(),
    };

    return NextResponse.json(
      { success: true, ...summary },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    console.error("Failed to get stock import monitoring summary", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { success: false, error: "โหลดข้อมูล monitoring ไม่สำเร็จ" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}