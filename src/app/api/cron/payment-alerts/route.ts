import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { reconcileTelegramPaymentAlerts } from "@/lib/telegram-notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const masterKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const received = request.headers.get("authorization") ?? "";
  if (!masterKey) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  // A purpose-specific derived token lets Supabase Cron invoke this endpoint
  // without sending the database service-role key over the network.
  const token = createHmac("sha256", masterKey).update("pod4u:telegram-payment-alert-retry:v1").digest("hex");
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(digest(received), digest(`Bearer ${token}`))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await reconcileTelegramPaymentAlerts();
    return NextResponse.json({ success: result.failed === 0, ...result }, {
      status: result.failed > 0 ? 502 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    console.error("Payment alert reconciliation failed");
    return NextResponse.json({ success: false, error: "Reconciliation failed" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
