import { NextResponse } from "next/server";
import { getIndexNowKey } from "@/lib/indexnow";

export const dynamic = "force-dynamic";

export function GET() {
  const key = getIndexNowKey();
  if (!key) {
    return new NextResponse("Not configured", {
      status: 404,
      headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new NextResponse(key, {
    headers: { "Cache-Control": "public, max-age=300", "Content-Type": "text/plain; charset=utf-8" },
  });
}
