const ADMIN_COOKIE_NAME = "admin_session";

export { ADMIN_COOKIE_NAME };

export async function createAdminSessionToken(): Promise<string | null> {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) return null;

  const bytes = new TextEncoder().encode(`vaping-shop-admin:${secret}`);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function isValidAdminSession(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  const expected = await createAdminSessionToken();
  return expected !== null && cookieValue === expected;
}
