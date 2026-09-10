import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { listCustomers } from "@/lib/customer-service";

export const dynamic = "force-dynamic";

function boundedInteger(value: string | null, fallback: number, maximum: number): number {
  if (!value || !/^\d+$/.test(value)) return fallback;
  return Math.min(Math.max(Number(value), 1), maximum);
}

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminApiPermission(request, "customers.view");
  if (unauthorized) return unauthorized;

  try {
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    const page = boundedInteger(request.nextUrl.searchParams.get("page"), 1, 100000);
    const pageSize = boundedInteger(request.nextUrl.searchParams.get("page_size"), 25, 100);
    const result = await listCustomers({ query, page, pageSize });

    return NextResponse.json(
      {
        success: true,
        customers: result.customers,
        pagination: {
          page,
          page_size: pageSize,
          total: result.total,
          total_pages: Math.ceil(result.total / pageSize),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    const code = typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "unknown";
    console.error("Admin customer search failed", { code });
    return NextResponse.json(
      { success: false, customers: [], error: "โหลดข้อมูลลูกค้าไม่สำเร็จ" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
