import { isAdminRole, type AdminRole } from "@/lib/admin-permissions";

interface ConfiguredAdminAccount {
  id: string;
  username: string;
  password: string;
  role: AdminRole;
}

export {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  getAdminSession,
  isValidAdminSession,
  publicAdminSession,
} from "@/lib/admin-session";
export type { AdminSession } from "@/lib/admin-session";

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

export function isReservedAdminUsername(username: string): boolean {
  const normalizedUsername = username.trim().toLowerCase();
  if (!normalizedUsername) return false;
  if (process.env.ADMIN_PASSWORD && normalizedUsername === "owner") return true;
  return getConfiguredAccounts().some((account) => account.username === normalizedUsername);
}

export async function authenticateAdmin(
  username: string,
  password: string,
): Promise<{ accountId: string; role: AdminRole } | null> {
  const normalizedUsername = username.trim().toLowerCase();

  try {
    const { authenticateStoredAdmin } = await import("@/lib/admin-account-service");
    const stored = await authenticateStoredAdmin(normalizedUsername, password);
    if (stored.found) return stored.account;
  } catch (error) {
    console.error("Stored admin authentication is unavailable", error);
  }

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
