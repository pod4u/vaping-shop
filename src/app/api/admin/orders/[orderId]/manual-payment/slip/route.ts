import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiPermission } from "@/lib/admin-api";
import { OrderInputError, parseOrderId } from "@/lib/order-validation";
import { getUncachedServerSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { orderId: string } }) {
  const unauthorized = await requireAdminApiPermission(request, "orders.view");
  if (unauthorized) return unauthorized;
  try {
    const orderId = parseOrderId(params.orderId);
    const client = getUncachedServerSupabase();
    const { data, error } = await client.from("order_payment_requests")
      .select("manual_slip_path,verification_method,status")
      .eq("order_id", orderId).maybeSingle();
    if (error) throw error;
    if (!data?.manual_slip_path || data.verification_method !== "manual_bank" || data.status !== "verified") {
      return NextResponse.json({ error: "ไม่พบสลิปที่แนบ" }, { status: 404 });
    }
    const { data: file, error: downloadError } = await client.storage.from("manual-payment-slips")
      .download(data.manual_slip_path);
    if (downloadError || !file) throw downloadError ?? new Error("Slip missing");
    const mime = data.manual_slip_path.endsWith(".png") ? "image/png"
      : data.manual_slip_path.endsWith(".webp") ? "image/webp" : "image/jpeg";
    return new NextResponse(file, {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof OrderInputError) {
      return NextResponse.json({ error: "ออเดอร์ไม่ถูกต้อง" }, { status: 400 });
    }
    console.error("Manual payment slip read failed");
    return NextResponse.json({ error: "เปิดสลิปไม่สำเร็จ" }, { status: 500 });
  }
}
