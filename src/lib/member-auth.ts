import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export const MEMBER_COOKIE_NAME = "pod4u_member_session";
export const MEMBER_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const ACCESS_TOKEN_TTL_SECONDS = 10 * 60;
const TOKEN_VERSION = 1;

type MemberAccess = {
  customerId: number;
  providerAccountId: string;
  providerUserId: string;
};

function getSecret(): string {
  const value = process.env.CUSTOMER_LINK_TOKEN_SECRET?.trim();
  if (!value || value.length < 32) throw new Error("CUSTOMER_LINK_TOKEN_SECRET is not configured");
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function encode(value: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(token: string): Record<string, unknown> | null {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra || !safeEqual(signature, sign(payload))) return null;
  try {
    const value: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return value && typeof value === "object" ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function createLineMemberAccessToken(input: MemberAccess): string {
  const now = Math.floor(Date.now() / 1000);
  return encode({
    v: TOKEN_VERSION,
    purpose: "line_member_access",
    customerId: input.customerId,
    providerAccountId: input.providerAccountId,
    providerUserId: input.providerUserId,
    iat: now,
    exp: now + ACCESS_TOKEN_TTL_SECONDS,
  });
}

export function verifyLineMemberAccessToken(token: string): MemberAccess | null {
  const value = decode(token);
  const now = Math.floor(Date.now() / 1000);
  if (
    !value
    || value.v !== TOKEN_VERSION
    || value.purpose !== "line_member_access"
    || typeof value.customerId !== "number"
    || !Number.isInteger(value.customerId)
    || value.customerId <= 0
    || typeof value.providerAccountId !== "string"
    || typeof value.providerUserId !== "string"
    || typeof value.iat !== "number"
    || typeof value.exp !== "number"
    || value.exp <= now
    || value.iat > now + 60
  ) return null;
  return {
    customerId: value.customerId,
    providerAccountId: value.providerAccountId,
    providerUserId: value.providerUserId,
  };
}

export function createMemberSessionToken(customerId: number): string {
  const now = Math.floor(Date.now() / 1000);
  return encode({
    v: TOKEN_VERSION,
    purpose: "member_session",
    customerId,
    iat: now,
    exp: now + MEMBER_SESSION_TTL_SECONDS,
  });
}

export function verifyMemberSessionToken(token: string | undefined): { customerId: number; expiresAt: number } | null {
  if (!token) return null;
  const value = decode(token);
  const now = Math.floor(Date.now() / 1000);
  if (
    !value
    || value.v !== TOKEN_VERSION
    || value.purpose !== "member_session"
    || typeof value.customerId !== "number"
    || !Number.isInteger(value.customerId)
    || value.customerId <= 0
    || typeof value.iat !== "number"
    || typeof value.exp !== "number"
    || value.exp <= now
    || value.iat > now + 60
  ) return null;
  return { customerId: value.customerId, expiresAt: value.exp };
}
