import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, getAdminSession } from "@/lib/admin-auth";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { fetchGoogleStockSheet } from "@/lib/google-sheets-stock-source";
import { listStockImports, stageStockImport } from "@/lib/stock-import-service";
import { StockSheetFormatError } from "@/lib/stock-import-parser";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseBatchId(value: string | null): string | null {
  if (!value) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)) {
    throw new StockSheetFormatError("รหัส batch ไม่ถูกต้อง");
  }
  return value;
}

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminApiPermission(request, "stock.manage");
  if (unauthorized) return unauthorized;
  try {
    const result = await listStockImports(parseBatchId(request.nextUrl.searchParams.get("batch_id")));
    return NextResponse.json({ success: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) {
    if (error instanceof StockSheetFormatError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error("Stock import list failed");
    return NextResponse.json({ success: false, error: "โหลดประวัตินำเข้าสต็อกไม่สำเร็จ" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminApiPermission(request, "stock.manage");
  if (unauthorized) return unauthorized;
  try {
    const session = await getAdminSession(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const sheet = await fetchGoogleStockSheet();
    const result = await stageStockImport({
      source: "google_sheet",
      sourceReference: sheet.sourceReference,
      checksum: sheet.checksum,
      rows: sheet.rows,
      actor: `${session.accountId}:${session.role}`,
    });
    return NextResponse.json(
      {
        success: true,
        ...result,
        message: Number(result.invalid_count) > 0
          ? "อ่านชีทแล้ว แต่พบรายการที่ต้องแก้ ระบบยังไม่เปลี่ยนสต็อก"
          : "อ่านชีทและตรวจสอบสำเร็จ พร้อมให้ยืนยันอัปเดตสต็อก",
      },
      { status: result.idempotent_replay === true ? 200 : 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    if (error instanceof StockSheetFormatError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "";
    const configurationError = message.startsWith("Missing GOOGLE_");
    console.error("Google stock sheet staging failed", { configurationError });
    return NextResponse.json(
      { success: false, error: configurationError ? "ยังตั้งค่าการเชื่อม Google Sheet ไม่ครบ" : "อ่านหรือตรวจสอบ Google Sheet ไม่สำเร็จ" },
      { status: configurationError ? 503 : 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
