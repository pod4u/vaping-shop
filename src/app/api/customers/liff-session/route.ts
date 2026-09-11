import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import {
  createMemberSessionToken,
  MEMBER_COOKIE_NAME,
  MEMBER_SESSION_TTL_SECONDS,
} from "@/lib/member-auth";
import { createLineRegistrationSession } from "@/lib/line-registration-service";
import { getConfiguredLineAccounts, getLineAccountByAlias } from "@/lib/line-account";
import { parseLineAccountAlias } from "@/lib/line-account-links";

export const dynamic = "force-dynamic";

const channelId = process.env.LINE_LOGIN_CHANNEL_ID?.trim();

async function verifyLineIdToken(idToken: string) {
  if (!channelId) throw new Error("LINE_LOGIN_CHANNEL_ID is not configured");
  const body = new URLSearchParams({ id_token: idToken, client_id: channelId });
  const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!response.ok) return null;
  const payload = await response.json() as { sub?: unknown; aud?: unknown; exp?: unknown };
  if (typeof payload.sub !== "string" || payload.aud !== channelId) return null;
  if (typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now() / 1000)) return null;
  return { providerUserId: payload.sub };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idToken = typeof body.id_token === "string" ? body.id_token.trim() : "";
    if (!idToken || idToken.length > 5000) {
      return NextResponse.json({ success: false, error: "ข้อมูลยืนยันตัวตนไม่ถูกต้อง" }, { status: 400 });
    }

    const verified = await verifyLineIdToken(idToken);
    if (!verified) {
      return NextResponse.json({ success: false, error: "ยืนยันตัวตน LINE ไม่สำเร็จ" }, { status: 401 });
    }

    const accountAlias = parseLineAccountAlias(body.account_alias);
    const botUserId = getLineAccountByAlias(accountAlias).botUserId;
    const client = getServerSupabase();
    let { data: identity, error } = await client
      .from("customer_identities")
      .select("customer_id")
      .eq("provider", "line")
      .eq("provider_account_id", botUserId)
      .eq("provider_user_id", verified.providerUserId)
      .eq("status", "verified")
      .maybeSingle();
    if (error) throw error;

    // LINE user IDs are stable across channels created under the same LINE
    // Developers provider. When a known customer opens the trusted backup OA,
    // create the second OA namespace link so they keep the same Member account.
    if (!identity && accountAlias === "secondary") {
      const trustedAccountIds = getConfiguredLineAccounts().map((account) => account.botUserId);
      const { data: existingIdentity, error: existingError } = await client
        .from("customer_identities")
        .select("customer_id")
        .eq("provider", "line")
        .eq("provider_user_id", verified.providerUserId)
        .eq("status", "verified")
        .in("provider_account_id", trustedAccountIds)
        .limit(1)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existingIdentity) {
        const { error: insertError } = await client.from("customer_identities").insert({
          customer_id: Number(existingIdentity.customer_id),
          provider: "line",
          provider_account_id: botUserId,
          provider_user_id: verified.providerUserId,
          status: "verified",
          verified_at: new Date().toISOString(),
          verified_by: "trusted-line-oa-alias",
        });
        if (insertError && insertError.code !== "23505") throw insertError;
        const linked = await client
          .from("customer_identities")
          .select("customer_id")
          .eq("provider", "line")
          .eq("provider_account_id", botUserId)
          .eq("provider_user_id", verified.providerUserId)
          .eq("status", "verified")
          .maybeSingle();
        if (linked.error) throw linked.error;
        identity = linked.data;
      }
    }

    if (!identity) {
      const registration = await createLineRegistrationSession({
        providerAccountId: botUserId,
        providerUserId: verified.providerUserId,
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 64) || null,
        userAgent: request.headers.get("user-agent")?.slice(0, 500) || null,
      });
      if (registration.status === "created") {
        return NextResponse.json(
          {
            success: false,
            registration_url: registration.registrationUrl,
            error: "ยังไม่พบสมาชิก ระบบกำลังเปิดหน้าสมัครครั้งแรก",
          },
          { status: 404, headers: { "Cache-Control": "no-store" } },
        );
      }
      return NextResponse.json({ success: false, error: "กรุณาเปิดหน้าสมาชิกจาก LINE อีกครั้ง" }, { status: 409 });
    }

    const response = NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(MEMBER_COOKIE_NAME, createMemberSessionToken(Number(identity.customer_id)), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: MEMBER_SESSION_TTL_SECONDS,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("LIFF member session failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ success: false, error: "ระบบสมาชิกขัดข้องชั่วคราว" }, { status: 500 });
  }
}
