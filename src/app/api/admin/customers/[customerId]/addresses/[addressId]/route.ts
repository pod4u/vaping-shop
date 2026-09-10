import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { removeCustomerAddress, saveCustomerAddress } from "@/lib/customer-service";
import {
  CustomerInputError,
  parseCustomerAddressInput,
  parsePositiveInteger,
  parseUuid,
} from "@/lib/customer-validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: { customerId: string; addressId: string } };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const unauthorized = await requireAdminApiPermission(request, "customers.manage");
  if (unauthorized) return unauthorized;

  try {
    const customerId = parsePositiveInteger(params.customerId, "รหัสลูกค้า");
    const addressId = parseUuid(params.addressId, "รหัสที่อยู่");
    const input = parseCustomerAddressInput(await request.json());
    const savedId = await saveCustomerAddress(customerId, addressId, input);
    return NextResponse.json(
      { success: true, address_id: savedId },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    if (error instanceof CustomerInputError || error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: error instanceof CustomerInputError ? error.message : "รูปแบบข้อมูลไม่ถูกต้อง" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "unknown";
    if (code === "P0002") {
      return NextResponse.json(
        { success: false, error: "ไม่พบลูกค้าหรือที่อยู่" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("Admin address update failed", { code });
    return NextResponse.json(
      { success: false, error: "แก้ไขที่อยู่ไม่สำเร็จ" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const unauthorized = await requireAdminApiPermission(request, "customers.manage");
  if (unauthorized) return unauthorized;

  try {
    const customerId = parsePositiveInteger(params.customerId, "รหัสลูกค้า");
    const addressId = parseUuid(params.addressId, "รหัสที่อยู่");
    const deleted = await removeCustomerAddress(customerId, addressId);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "ไม่พบที่อยู่" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    if (error instanceof CustomerInputError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("Admin address delete failed");
    return NextResponse.json(
      { success: false, error: "ลบที่อยู่ไม่สำเร็จ" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
