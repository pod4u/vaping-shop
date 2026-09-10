import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, getAdminSession } from "@/lib/admin-auth";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { applyStockImport } from "@/lib/stock-import-service";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { batchId: string } },
) {
  const unauthorized = await requireAdminApiPermission(request, "stock.manage");
  if (unauthorized) return unauthorized;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(params.batchId)) {
    return NextResponse.json({ success: false, error: "รหัส batch ไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const session = await getAdminSession(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const result = await applyStockImport(params.batchId, `${session.accountId}:${session.role}`);
    return NextResponse.json(
      { success: true, ...result, message: "อัปเดตสต็อกและบันทึก ledger สำเร็จ" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    const databaseError = error && typeof error === "object" ? error as { code?: unknown; message?: unknown } : {};
    const code = typeof databaseError.code === "string" ? databaseError.code : "";
    if (code === "P0002") return NextResponse.json({ success: false, error: "ไม่พบ batch" }, { status: 404 });
    if (code === "40001") {
      return NextResponse.json(
        { success: false, error: "สต็อกเปลี่ยนหลังจากพรีวิว กรุณาอ่านชีทใหม่ก่อนยืนยัน" },
        { status: 409 },
      );
    }
    if (code === "55000") {
      return NextResponse.json({ success: false, error: "batch นี้ยังไม่พร้อมอัปเดต" }, { status: 409 });
    }
    console.error("Stock import apply failed", { code });
    return NextResponse.json({ success: false, error: "อัปเดตสต็อกไม่สำเร็จ" }, { status: 500 });
  }
}
