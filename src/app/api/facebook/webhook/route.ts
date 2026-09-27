import { NextRequest, NextResponse } from "next/server";
import {
  processFacebookMessengerEvent,
  verifyFacebookChallenge,
  verifyFacebookWebhook,
} from "@/lib/facebook-messenger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const challenge = verifyFacebookChallenge(
      request.nextUrl.searchParams.get("hub.mode"),
      request.nextUrl.searchParams.get("hub.verify_token"),
      request.nextUrl.searchParams.get("hub.challenge"),
    );
    if (!challenge) return new NextResponse("Forbidden", { status: 403 });
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  } catch {
    return new NextResponse("Webhook is not configured", { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (rawBody.length > 1_000_000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });

  try {
    if (!verifyFacebookWebhook(rawBody, request.headers.get("x-hub-signature-256"))) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    const body = JSON.parse(rawBody) as {
      object?: string;
      entry?: Array<{ id?: string; messaging?: unknown[] }>;
    };
    if (body.object !== "page") return NextResponse.json({ success: true, ignored: true });

    const jobs = (body.entry || []).flatMap((entry) => {
      const pageId = typeof entry.id === "string" ? entry.id : "";
      return (Array.isArray(entry.messaging) ? entry.messaging : []).slice(0, 100).map((event) =>
        processFacebookMessengerEvent(pageId, event as Parameters<typeof processFacebookMessengerEvent>[1]),
      );
    });
    await Promise.allSettled(jobs);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Facebook webhook processing failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
