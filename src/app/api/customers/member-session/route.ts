import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import {
  createMemberSessionToken,
  MEMBER_COOKIE_NAME,
  MEMBER_SESSION_TTL_SECONDS,
  verifyLineMemberAccessToken,
  verifyMemberSessionToken,
} from "@/lib/member-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = verifyMemberSessionToken(request.cookies.get(MEMBER_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ isLoggedIn: false }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const client = getServerSupabase();
    const [customerResult, addressResult] = await Promise.all([
      client.from("customers").select("id, full_name, phone").eq("id", session.customerId).maybeSingle(),
      client.from("customer_addresses").select("id, recipient_name, phone, address, province, postal_code, is_default").eq("customer_id", session.customerId).order("is_default", { ascending: false }).limit(5),
    ]);

    if (!customerResult.data) {
      return NextResponse.json({ isLoggedIn: false }, { headers: { "Cache-Control": "no-store" } });
    }

    const defaultAddress = addressResult.data?.find((a) => a.is_default) || addressResult.data?.[0] || null;

    return NextResponse.json(
      {
        isLoggedIn: true,
        customer: {
          id: customerResult.data.id,
          fullName: customerResult.data.full_name,
          phone: customerResult.data.phone,
        },
        defaultAddress,
        addresses: addressResult.data || [],
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ isLoggedIn: false }, { headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const access = token ? verifyLineMemberAccessToken(token) : null;
    if (!access) {
      return NextResponse.json({ success: false, error: "ลิงก์เข้าระบบไม่ถูกต้องหรือหมดอายุ" }, { status: 401 });
    }

    const { data: identity, error } = await getServerSupabase()
      .from("customer_identities")
      .select("customer_id")
      .eq("provider", "line")
      .eq("provider_account_id", access.providerAccountId)
      .eq("provider_user_id", access.providerUserId)
      .eq("customer_id", access.customerId)
      .eq("status", "verified")
      .maybeSingle();
    if (error) throw error;
    if (!identity) {
      return NextResponse.json({ success: false, error: "ไม่พบสมาชิกที่เชื่อมกับ LINE นี้" }, { status: 401 });
    }

    const response = NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(MEMBER_COOKIE_NAME, createMemberSessionToken(access.customerId), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: MEMBER_SESSION_TTL_SECONDS,
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ success: false, error: "ไม่สามารถเข้าระบบสมาชิกได้ชั่วคราว" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(MEMBER_COOKIE_NAME, "", { httpOnly: true, maxAge: 0, path: "/" });
  return response;
}
