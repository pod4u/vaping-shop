import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { getCustomerDetail } from "@/lib/customer-service";
import { CustomerInputError, parsePositiveInteger } from "@/lib/customer-validation";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { customerId: string } },
) {
  const unauthorized = await requireAdminApiPermission(request, "customers.view");
  if (unauthorized) return unauthorized;

  try {
    const customerId = parsePositiveInteger(params.customerId, "รหัสลูกค้า");
    const detail = await getCustomerDetail(customerId);
    if (!detail) {
      return NextResponse.json(
        { success: false, error: "ไม่พบลูกค้า" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { success: true, ...detail },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    if (error instanceof CustomerInputError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("Admin customer detail failed");
    return NextResponse.json(
      { success: false, error: "โหลดข้อมูลลูกค้าไม่สำเร็จ" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
