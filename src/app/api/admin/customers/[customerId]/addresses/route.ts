import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { getCustomerDetail, saveCustomerAddress } from "@/lib/customer-service";
import {
  CustomerInputError,
  parseCustomerAddressInput,
  parsePositiveInteger,
} from "@/lib/customer-validation";

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
      { success: true, addresses: detail.addresses },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    if (error instanceof CustomerInputError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("Admin address list failed");
    return NextResponse.json(
      { success: false, error: "โหลดที่อยู่ไม่สำเร็จ" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { customerId: string } },
) {
  const unauthorized = await requireAdminApiPermission(request, "customers.manage");
  if (unauthorized) return unauthorized;

  try {
    const customerId = parsePositiveInteger(params.customerId, "รหัสลูกค้า");
    const input = parseCustomerAddressInput(await request.json());
    const addressId = await saveCustomerAddress(customerId, null, input);
    return NextResponse.json(
      { success: true, address_id: addressId },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    if (error instanceof CustomerInputError || error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: error instanceof CustomerInputError ? error.message : "รูปแบบข้อมูลไม่ถูกต้อง" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "unknown";
    if (code === "P0002" || code === "23503") {
      return NextResponse.json(
        { success: false, error: "ไม่พบลูกค้า" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("Admin address create failed", { code });
    return NextResponse.json(
      { success: false, error: "บันทึกที่อยู่ไม่สำเร็จ" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
