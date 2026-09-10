import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { MEMBER_COOKIE_NAME, verifyMemberSessionToken } from "@/lib/member-auth";
import { getServerSupabase } from "@/lib/supabase";
import { createDraftOrder, reserveDraftOrder } from "@/lib/order-service";
import { getBankTransferDetails } from "@/lib/order-payment-service";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface OrderItemInput {
  product_flavor_id: string;
  quantity: number;
}

function validItems(value: unknown): value is OrderItemInput[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) return false;
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "object" || item === null) return false;
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.product_flavor_id !== "string" || !UUID_PATTERN.test(candidate.product_flavor_id)) return false;
    if (!Number.isInteger(candidate.quantity) || Number(candidate.quantity) < 1 || Number(candidate.quantity) > 99) return false;
    if (seen.has(candidate.product_flavor_id)) return false;
    seen.add(candidate.product_flavor_id);
  }
  return true;
}

export async function POST(request: NextRequest) {
  const session = verifyMemberSessionToken(request.cookies.get(MEMBER_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "กรุณาเข้าสู่ระบบสมาชิกก่อนสั่งซื้อ" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "ข้อมูลคำสั่งซื้อไม่ถูกต้อง" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const items = body?.items;
  if (!validItems(items)) {
    return NextResponse.json(
      { success: false, error: "รายการสินค้าไม่ถูกต้อง ต้องมีสินค้าอย่างน้อย 1 รายการ" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const client = getServerSupabase();

  // Determine address
  let addressId = typeof body?.address_id === "string" && UUID_PATTERN.test(body.address_id) ? body.address_id : null;
  if (!addressId) {
    const { data: defaultAddress } = await client
      .from("customer_addresses")
      .select("id")
      .eq("customer_id", session.customerId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!defaultAddress) {
      return NextResponse.json(
        { success: false, error: "ไม่พบที่อยู่จัดส่ง กรุณาเพิ่มที่อยู่จัดส่งในระบบสมาชิกก่อนทำรายการ", needAddress: true },
        { status: 422, headers: { "Cache-Control": "no-store" } }
      );
    }
    addressId = defaultAddress.id;
  }

  try {
    const { data: identity } = await client
      .from("customer_identities")
      .select("id")
      .eq("customer_id", session.customerId)
      .eq("status", "verified")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const idempotencyKey = `web-${session.customerId}-${randomUUID()}`;
    const draftResult = await createDraftOrder(
      {
        customerId: session.customerId,
        addressId,
        sourceCustomerIdentityId: identity?.id || null,
        orderSource: "admin_manual",
        idempotencyKey,
        items: items.map((it) => ({
          product_flavor_id: it.product_flavor_id,
          quantity: it.quantity,
        })),
        adminNote: body?.admin_note || "สั่งซื้อผ่านหน้าเว็บ (Web Member Checkout)",
      },
      "web-member-session"
    );

    // Reserve the draft order to lock stock
    const reservation = await reserveDraftOrder(draftResult.orderId, "web-member-session");

    // Fetch refreshed order details for confirmation
    const { data: orderDetails } = await client
      .from("orders")
      .select("id, order_number, status, subtotal, shipping_fee, discount_amount, total, shipping_name, shipping_phone, shipping_address, shipping_province, shipping_postal_code")
      .eq("id", draftResult.orderId)
      .maybeSingle();

    const bankTransfer = getBankTransferDetails();

    return NextResponse.json(
      {
        success: true,
        order: {
          id: draftResult.orderId,
          orderNumber: draftResult.orderNumber,
          status: reservation.status,
          expiresAt: reservation.reservationExpiresAt,
          total: orderDetails?.total || 0,
          shippingFee: orderDetails?.shipping_fee || 0,
          subtotal: orderDetails?.subtotal || 0,
          shippingName: orderDetails?.shipping_name,
          shippingAddress: `${orderDetails?.shipping_address} ${orderDetails?.shipping_province} ${orderDetails?.shipping_postal_code}`,
          bankTransfer: {
            bankName: bankTransfer.bankName,
            bankCode: bankTransfer.bankCode,
            bankShort: bankTransfer.bankShort,
            accountNumber: bankTransfer.accountNumber,
            accountNumberClean: bankTransfer.accountNumberClean,
            accountName: bankTransfer.accountName,
          },
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    console.error("Web order creation failed:", error);
    const message = error?.message || "";
    if (message.includes("unavailable") || message.includes("stock")) {
      return NextResponse.json(
        { success: false, error: "สินค้าบางรายการในสต็อกไม่เพียงพอ กรุณาตรวจสอบตะกร้าอีกครั้ง" },
        { status: 422, headers: { "Cache-Control": "no-store" } }
      );
    }
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ กรุณาลองใหม่อีกครั้ง" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
