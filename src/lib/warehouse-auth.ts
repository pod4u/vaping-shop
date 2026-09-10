import "server-only";

const SESSION_VERSION = 1;
const SESSION_TTL_SECONDS = 12 * 60 * 60;
export const WAREHOUSE_COOKIE_NAME = "warehouse_session";

interface WarehouseAccount {
  id: string;
  username: string;
  password: string;
  displayName: string;
}

export interface WarehouseSession {
  accountId: string;
  displayName: string;
  issuedAt: number;
  expiresAt: number;
}

function constantTimeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
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

function sessionSecret(): string | null {
  const value = process.env.WAREHOUSE_SESSION_SECRET?.trim();
  return value && value.length >= 32 ? value : null;
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

function parseAccounts(): WarehouseAccount[] {
  const raw = process.env.WAREHOUSE_ACCOUNTS_JSON;
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const usernames = new Set<string>();
        return parsed.flatMap((candidate): WarehouseAccount[] => {
          if (!candidate || typeof candidate !== "object") return [];
          const value = candidate as Record<string, unknown>;
          const id = typeof value.id === "string" ? value.id.trim() : "";
          const username = typeof value.username === "string" ? value.username.trim().toLowerCase() : "";
          const password = typeof value.password === "string" ? value.password : "";
          const displayName = typeof value.displayName === "string" ? value.displayName.trim() : "";
          if (!/^[a-z0-9._-]{3,50}$/u.test(username) || !id || id.length > 100 || password.length < 8 || usernames.has(username)) return [];
          usernames.add(username);
          return [{ id, username, password, displayName: displayName || username }];
        });
      }
    } catch {
      return [];
    }
  }

  const username = process.env.WAREHOUSE_USERNAME?.trim().toLowerCase() ?? "";
  const password = process.env.WAREHOUSE_PASSWORD ?? "";
  if (!/^[a-z0-9._-]{3,50}$/u.test(username) || password.length < 8) return [];
  return [{ id: "warehouse", username, password, displayName: "ทีมคลังสินค้า" }];
}

export function isWarehouseConfigured(): boolean {
  return parseAccounts().length > 0 && sessionSecret() !== null;
}

export async function authenticateWarehouse(username: string, password: string): Promise<WarehouseAccount | null> {
  const normalized = username.trim().toLowerCase();
  const account = parseAccounts().find((candidate) => candidate.username === normalized);
  if (!account || !constantTimeEqual(password, account.password)) return null;
  return account;
}

export async function createWarehouseSessionToken(account: WarehouseAccount): Promise<string | null> {
  const secret = sessionSecret();
  if (!secret) return null;
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = encodeBase64Url(JSON.stringify({
    v: SESSION_VERSION,
    sub: account.id,
    name: account.displayName,
    iat: issuedAt,
    exp: issuedAt + SESSION_TTL_SECONDS,
  }));
  return `${payload}.${await hmac(payload, secret)}`;
}

export async function getWarehouseSession(cookieValue: string | undefined): Promise<WarehouseSession | null> {
  if (!cookieValue) return null;
  const secret = sessionSecret();
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
      || typeof value.name !== "string"
      || typeof value.iat !== "number"
      || typeof value.exp !== "number"
      || value.exp <= now
      || value.iat > now + 60
      || !parseAccounts().some((account) => account.id === value.sub)
    ) return null;
    return { accountId: value.sub, displayName: value.name, issuedAt: value.iat, expiresAt: value.exp };
  } catch {
    return null;
  }
}

export function publicWarehouseSession(session: WarehouseSession) {
  return { accountId: session.accountId, displayName: session.displayName, expiresAt: session.expiresAt };
}
