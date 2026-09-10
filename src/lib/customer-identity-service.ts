import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { getServerSupabase } from "@/lib/supabase";

const LINE_PROVIDER = "line";
const LINK_CODE_TTL_MS = 10 * 60 * 1000;

export class IdentityLinkConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdentityLinkConfigurationError";
  }
}

interface LinkTokenRecord {
  id: string;
  customer_id: number;
  provider: string;
  provider_account_id: string;
  provider_user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  failed_attempts: number;
  locked_until: string | null;
  active: boolean;
}

export interface IdentityRecord {
  id: string;
  customer_id: number;
  provider: string;
  provider_account_id: string;
  provider_user_id: string;
  status: "pending" | "verified" | "revoked";
  verified_at: string | null;
  verified_by: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IdentityAuditRecord {
  id: number;
  event_type: string;
  customer_id: number | null;
  provider: string;
  provider_account_id: string;
  provider_user_id: string;
  token_record_id: string | null;
  requested_by: string | null;
  approved_by: string | null;
  failed_attempts: number;
  created_at: string;
}

function getLinkSecret(): string {
  const secret = process.env.CUSTOMER_LINK_TOKEN_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new IdentityLinkConfigurationError(
      "CUSTOMER_LINK_TOKEN_SECRET must contain at least 32 characters",
    );
  }
  return secret;
}

function digestLinkCode(input: {
  customerId: number;
  providerAccountId: string;
  providerUserId: string;
  code: string;
}): string {
  const payload = [
    input.customerId,
    LINE_PROVIDER,
    input.providerAccountId,
    input.providerUserId,
    input.code,
  ].join("\u001f");

  return createHmac("sha256", getLinkSecret()).update(payload).digest("hex");
}

function safeDigestMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function createLineIdentityLinkCode(input: {
  customerId: number;
  providerAccountId: string;
  providerUserId: string;
  createdBy: string;
  ipAddress: string | null;
  userAgent: string | null;
}) {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MS);
  const tokenHash = digestLinkCode({
    customerId: input.customerId,
    providerAccountId: input.providerAccountId,
    providerUserId: input.providerUserId,
    code,
  });

  const { data, error } = await getServerSupabase().rpc(
    "create_customer_identity_link_token",
    {
      p_customer_id: input.customerId,
      p_provider: LINE_PROVIDER,
      p_provider_account_id: input.providerAccountId,
      p_provider_user_id: input.providerUserId,
      p_token_hash: tokenHash,
      p_expires_at: expiresAt.toISOString(),
      p_created_by: input.createdBy,
      p_request_ip: input.ipAddress,
      p_user_agent: input.userAgent,
    },
  );

  if (error) throw error;
  if (typeof data !== "string") {
    throw new Error("Identity link token creation returned an invalid ID");
  }

  return {
    code,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function verifyLineIdentityLinkCode(input: {
  providerAccountId: string;
  providerUserId: string;
  code: string;
}): Promise<"verified" | "invalid"> {
  const client = getServerSupabase();
  const { data, error } = await client
    .from("customer_identity_link_tokens")
    .select(
      "id,customer_id,provider,provider_account_id,provider_user_id,token_hash,expires_at,used_at,failed_attempts,locked_until,active",
    )
    .eq("provider", LINE_PROVIDER)
    .eq("provider_account_id", input.providerAccountId)
    .eq("provider_user_id", input.providerUserId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return "invalid";

  const token = data as LinkTokenRecord;
  const candidateHash = digestLinkCode({
    customerId: token.customer_id,
    providerAccountId: token.provider_account_id,
    providerUserId: token.provider_user_id,
    code: input.code,
  });

  if (!safeDigestMatch(candidateHash, token.token_hash)) {
    const { error: failureError } = await client.rpc(
      "record_customer_identity_link_failure",
      { p_token_id: token.id },
    );
    if (failureError) throw failureError;
    return "invalid";
  }

  const { data: consumeResult, error: consumeError } = await client.rpc(
    "consume_customer_identity_link_token",
    {
      p_token_id: token.id,
      p_token_hash: token.token_hash,
    },
  );

  if (consumeError) throw consumeError;
  const status = consumeResult && typeof consumeResult === "object"
    && "status" in consumeResult
    ? String(consumeResult.status)
    : "invalid";
  return status === "verified" ? "verified" : "invalid";
}

export async function listCustomerIdentities(customerId: number) {
  const { data, error } = await getServerSupabase()
    .from("customer_identities")
    .select(
      "id,customer_id,provider,provider_account_id,provider_user_id,status,verified_at,verified_by,revoked_at,created_at,updated_at",
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as IdentityRecord[];
}

export async function listCustomerIdentityAudit(customerId: number) {
  const { data, error } = await getServerSupabase()
    .from("customer_identity_verification_audit_logs")
    .select(
      "id,event_type,customer_id,provider,provider_account_id,provider_user_id,token_record_id,requested_by,approved_by,failed_attempts,created_at",
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data ?? []) as IdentityAuditRecord[];
}
