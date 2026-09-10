import "server-only";

import { createHmac, randomBytes } from "node:crypto";
import { getServerSupabase } from "@/lib/supabase";
import { createLineMemberAccessToken } from "@/lib/member-auth";
import type { RegistrationInput } from "@/lib/customer-validation";

const LINE_PROVIDER = "line";
const REGISTRATION_TTL_MS = 10 * 60 * 1000;
const DEFAULT_REGISTRATION_ORIGIN = "https://www.pod4u.store";

export class LineRegistrationError extends Error {
  readonly reason: "configuration" | "invalid" | "expired" | "already_linked";

  constructor(
    reason: "configuration" | "invalid" | "expired" | "already_linked",
    message: string,
  ) {
    super(message);
    this.name = "LineRegistrationError";
    this.reason = reason;
  }
}

function getRegistrationSecret(): string {
  const secret = process.env.CUSTOMER_LINK_TOKEN_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new LineRegistrationError(
      "configuration",
      "CUSTOMER_LINK_TOKEN_SECRET must contain at least 32 characters",
    );
  }
  return secret;
}

function digestRegistrationToken(token: string): string {
  return createHmac("sha256", getRegistrationSecret()).update(token).digest("hex");
}

function getRegistrationBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configured) {
    console.warn("LINE registration is using the canonical origin fallback", {
      reason: "missing_app_url",
    });
    return DEFAULT_REGISTRATION_ORIGIN;
  }

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    console.warn("LINE registration is using the canonical origin fallback", {
      reason: "invalid_app_url",
    });
    return DEFAULT_REGISTRATION_ORIGIN;
  }
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    console.warn("LINE registration is using the canonical origin fallback", {
      reason: "insecure_app_url",
    });
    return DEFAULT_REGISTRATION_ORIGIN;
  }
  return url.origin;
}

export async function createLineRegistrationSession(input: {
  providerAccountId: string;
  providerUserId: string;
  ipAddress: string | null;
  userAgent: string | null;
}): Promise<
  | { status: "already_linked"; memberAccessUrl: string }
  | { status: "created"; registrationUrl: string; expiresAt: string }
> {
  const client = getServerSupabase();
  const { data: identity, error: identityError } = await client
    .from("customer_identities")
    .select("id,customer_id")
    .eq("provider", LINE_PROVIDER)
    .eq("provider_account_id", input.providerAccountId)
    .eq("provider_user_id", input.providerUserId)
    .eq("status", "verified")
    .maybeSingle();

  if (identityError) throw identityError;
  if (identity) {
    const token = createLineMemberAccessToken({
      customerId: Number(identity.customer_id),
      providerAccountId: input.providerAccountId,
      providerUserId: input.providerUserId,
    });
    return {
      status: "already_linked",
      memberAccessUrl: `${getRegistrationBaseUrl()}/member/access#member_token=${encodeURIComponent(token)}`,
    };
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = digestRegistrationToken(token);
  const expiresAt = new Date(Date.now() + REGISTRATION_TTL_MS).toISOString();

  const { data: sessionId, error } = await client.rpc("create_line_registration_session", {
    p_provider: LINE_PROVIDER,
    p_provider_account_id: input.providerAccountId,
    p_provider_user_id: input.providerUserId,
    p_token_hash: tokenHash,
    p_expires_at: expiresAt,
    p_request_ip: input.ipAddress,
    p_user_agent: input.userAgent,
  });

  if (error) throw error;
  if (typeof sessionId !== "string") {
    throw new Error("LINE registration session returned an invalid ID");
  }

  const fragment = new URLSearchParams({
    line_session: sessionId,
    line_token: token,
  });
  return {
    status: "created",
    registrationUrl: `${getRegistrationBaseUrl()}/register#${fragment.toString()}`,
    expiresAt,
  };
}

export async function registerLineCustomerWithAddress(input: {
  sessionId: string;
  token: string;
  registration: RegistrationInput;
  ipAddress: string | null;
  userAgent: string | null;
}): Promise<{
  customerId: number;
  providerUserId: string;
}> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.sessionId)) {
    throw new LineRegistrationError("invalid", "ลิงก์สมัครสมาชิกไม่ถูกต้อง");
  }
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(input.token)) {
    throw new LineRegistrationError("invalid", "ลิงก์สมัครสมาชิกไม่ถูกต้อง");
  }

  const registration = input.registration;
  const { data, error } = await getServerSupabase().rpc(
    "register_line_customer_with_address",
    {
      p_registration_session_id: input.sessionId.toLowerCase(),
      p_token_hash: digestRegistrationToken(input.token),
      p_full_name: registration.fullName,
      p_phone: registration.phone,
      p_line_id: registration.lineId,
      p_email: registration.email,
      p_legacy_address: registration.legacyAddress,
      p_district: registration.district,
      p_sub_district: registration.subDistrict,
      p_province: registration.province,
      p_postal_code: registration.postalCode,
      p_shipping_address: registration.shippingAddress,
      p_accept_marketing: registration.acceptedMarketing,
      p_ip_address: input.ipAddress,
      p_user_agent: input.userAgent,
    },
  );

  if (error) throw error;
  const result = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const status = String(result.status ?? "invalid");
  if (status !== "verified") {
    const reason = status === "expired"
      ? "expired"
      : status === "already_linked"
        ? "already_linked"
        : "invalid";
    throw new LineRegistrationError(reason, `LINE registration ${status}`);
  }
  if (typeof result.customer_id !== "number" || typeof result.provider_user_id !== "string") {
    throw new Error("LINE registration returned an invalid result");
  }

  return {
    customerId: result.customer_id,
    providerUserId: result.provider_user_id,
  };
}

export async function getLineOrderStatus(input: {
  providerAccountId: string;
  providerUserId: string;
}) {
  const client = getServerSupabase();
  const { data: identity, error: identityError } = await client
    .from("customer_identities")
    .select("customer_id")
    .eq("provider", LINE_PROVIDER)
    .eq("provider_account_id", input.providerAccountId)
    .eq("provider_user_id", input.providerUserId)
    .eq("status", "verified")
    .maybeSingle();

  if (identityError) throw identityError;
  if (!identity) return { linked: false as const, orders: [] };

  const { data: orders, error: orderError } = await client
    .from("orders")
    .select("order_number,status,total,created_at,carrier,tracking_number")
    .eq("customer_id", identity.customer_id)
    .order("created_at", { ascending: false })
    .limit(3);
  if (orderError) throw orderError;

  return { linked: true as const, orders: orders ?? [] };
}

export async function getLineSalesContext(input: {
  providerAccountId: string;
  providerUserId: string;
}): Promise<{
  linked: boolean;
  hasDefaultAddress: boolean;
}> {
  const client = getServerSupabase();
  const { data: identity, error: identityError } = await client
    .from("customer_identities")
    .select("customer_id")
    .eq("provider", LINE_PROVIDER)
    .eq("provider_account_id", input.providerAccountId)
    .eq("provider_user_id", input.providerUserId)
    .eq("status", "verified")
    .maybeSingle();

  if (identityError) throw identityError;
  if (!identity) return { linked: false, hasDefaultAddress: false };

  const { data: address, error: addressError } = await client
    .from("customer_addresses")
    .select("id")
    .eq("customer_id", identity.customer_id)
    .eq("is_default", true)
    .limit(1)
    .maybeSingle();
  if (addressError) throw addressError;

  return { linked: true, hasDefaultAddress: Boolean(address) };
}
