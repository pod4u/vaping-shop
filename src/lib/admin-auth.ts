import {
  isAdminRole,
  permissionsForRole,
  type AdminRole,
} from "@/lib/admin-permissions";

const ADMIN_COOKIE_NAME = "admin_session";
const SESSION_VERSION = 1;
const SESSION_TTL_SECONDS = 24 * 60 * 60;

export interface AdminSession {
  accountId: string;
  role: AdminRole;
  issuedAt: number;
  expiresAt: number;
}

interface ConfiguredAdminAccount {
  id: string;
  username: string;
  password: string;
  role: AdminRole;
}

export { ADMIN_COOKIE_NAME };

function getSessionSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  return secret?.trim() || null;
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function decodeBase64Url(value: string): string | null {
  try {
    const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = atob(padded);
    return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
  } catch {
    return null;
  }
}

async function hmac(value: string, secret: string): Promise<string> {
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await globalThis.crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function getConfiguredAccounts(): ConfiguredAdminAccount[] {
  const raw = process.env.ADMIN_ACCOUNTS_JSON;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const accounts: ConfiguredAdminAccount[] = [];
    const usernames = new Set<string>();
    for (const candidate of parsed) {
      if (!candidate || typeof candidate !== "object") continue;
      const value = candidate as Record<string, unknown>;
      const id = typeof value.id === "string" ? value.id.trim() : "";
      const username = typeof value.username === "string" ? value.username.trim().toLowerCase() : "";
      const password = typeof value.password === "string" ? value.password : "";
      if (!id || !username || !password || !isAdminRole(value.role) || usernames.has(username)) continue;
      usernames.add(username);
      accounts.push({ id, username, password, role: value.role });
    }
    return accounts;
  } catch {
    return [];
  }
}

export async function authenticateAdmin(
  username: string,
  password: string,
): Promise<{ accountId: string; role: AdminRole } | null> {
  const normalizedUsername = username.trim().toLowerCase();
  const configured = getConfiguredAccounts().find((account) => account.username === normalizedUsername);
  if (configured && constantTimeEqual(password, configured.password)) {
    return { accountId: configured.id, role: configured.role };
  }

  const legacyPassword = process.env.ADMIN_PASSWORD;
  if ((!normalizedUsername || normalizedUsername === "owner") && legacyPassword) {
    if (constantTimeEqual(password, legacyPassword)) return { accountId: "owner", role: "owner" };
  }
  return null;
}

export async function createAdminSessionToken(
  accountId = "owner",
  role: AdminRole = "owner",
): Promise<string | null> {
  const secret = getSessionSecret();
  if (!secret) return null;

  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = encodeBase64Url(JSON.stringify({
    v: SESSION_VERSION,
    sub: accountId,
    role,
    iat: issuedAt,
    exp: issuedAt + SESSION_TTL_SECONDS,
  }));
  return `${payload}.${await hmac(payload, secret)}`;
}

export async function getAdminSession(cookieValue: string | undefined): Promise<AdminSession | null> {
  if (!cookieValue) return null;
  const secret = getSessionSecret();
  if (!secret) return null;
  const [payload, signature, extra] = cookieValue.split(".");
  if (!payload || !signature || extra || !constantTimeEqual(signature, await hmac(payload, secret))) return null;

  const decoded = decodeBase64Url(payload);
  if (!decoded) return null;
  try {
    const value = JSON.parse(decoded) as Record<string, unknown>;
    const now = Math.floor(Date.now() / 1000);
    if (
      value.v !== SESSION_VERSION
      || typeof value.sub !== "string"
      || !isAdminRole(value.role)
      || typeof value.iat !== "number"
      || typeof value.exp !== "number"
      || value.exp <= now
      || value.iat > now + 60
    ) return null;
    return { accountId: value.sub, role: value.role, issuedAt: value.iat, expiresAt: value.exp };
  } catch {
    return null;
  }
}

export function publicAdminSession(session: AdminSession) {
  return {
    accountId: session.accountId,
    role: session.role,
    permissions: permissionsForRole(session.role),
    expiresAt: session.expiresAt,
  };
}

export async function isValidAdminSession(cookieValue: string | undefined): Promise<boolean> {
  return (await getAdminSession(cookieValue)) !== null;
}
