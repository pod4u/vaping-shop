import "server-only";

import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { getUncachedServerSupabase } from "@/lib/supabase";
import { isAdminRole, type AdminRole } from "@/lib/admin-permissions";

const DIGEST_PREFIX = "scrypt-v1";
const USERNAME_PATTERN = /^[a-z0-9._-]{3,50}$/u;

interface StoredAdminAccount {
  id: string;
  username: string;
  display_name: string;
  password_digest: string;
  role: AdminRole;
  active: boolean;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface AdminAccountSummary {
  id: string;
  username: string;
  displayName: string;
  role: AdminRole;
  active: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export class AdminAccountInputError extends Error {
  constructor(message: string, readonly code: "invalid_input" | "duplicate" | "not_found" | "last_owner") {
    super(message);
  }
}

function digestPassword(password: string): string {
  const salt = randomBytes(16);
  const digest = scryptSync(password, salt, 64);
  return `${DIGEST_PREFIX}:${salt.toString("base64")}:${digest.toString("base64")}`;
}

function verifyPassword(password: string, encoded: string): boolean {
  try {
    const [prefix, saltValue, digestValue, extra] = encoded.split(":");
    if (prefix !== DIGEST_PREFIX || !saltValue || !digestValue || extra) return false;
    const expected = Buffer.from(digestValue, "base64");
    const actual = scryptSync(password, Buffer.from(saltValue, "base64"), expected.length);
    return expected.length > 0 && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function validatePassword(password: string) {
  if (password.length < 12 || password.length > 200) {
    throw new AdminAccountInputError("รหัสผ่านต้องมี 12–200 ตัวอักษร", "invalid_input");
  }
}

function normalizeUsername(username: string): string {
  const normalized = username.trim().toLowerCase();
  if (!USERNAME_PATTERN.test(normalized)) {
    throw new AdminAccountInputError("ชื่อผู้ใช้ต้องมี 3–50 ตัว และใช้ได้เฉพาะ a-z, 0-9, จุด, ขีดกลาง หรือขีดล่าง", "invalid_input");
  }
  return normalized;
}

function normalizeDisplayName(displayName: string): string {
  const normalized = displayName.trim();
  if (normalized.length < 2 || normalized.length > 80) {
    throw new AdminAccountInputError("ชื่อที่แสดงต้องมี 2–80 ตัวอักษร", "invalid_input");
  }
  return normalized;
}

function summary(account: StoredAdminAccount): AdminAccountSummary {
  return {
    id: account.id,
    username: account.username,
    displayName: account.display_name,
    role: account.role,
    active: account.active,
    createdBy: account.created_by,
    updatedBy: account.updated_by,
    createdAt: account.created_at,
    updatedAt: account.updated_at,
    lastLoginAt: account.last_login_at,
  };
}

export async function authenticateStoredAdmin(username: string, password: string): Promise<{
  found: boolean;
  account: { accountId: string; role: AdminRole } | null;
}> {
  const normalizedUsername = username.trim().toLowerCase();
  if (!normalizedUsername) return { found: false, account: null };

  const client = getUncachedServerSupabase();
  const { data, error } = await client
    .from("admin_accounts")
    .select("id,username,password_digest,role,active")
    .eq("username", normalizedUsername)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { found: false, account: null };

  const stored = data as Pick<StoredAdminAccount, "id" | "username" | "password_digest" | "role" | "active">;
  if (!stored.active || !isAdminRole(stored.role) || !verifyPassword(password, stored.password_digest)) {
    return { found: true, account: null };
  }

  await client.from("admin_accounts").update({ last_login_at: new Date().toISOString() }).eq("id", stored.id);
  return { found: true, account: { accountId: stored.id, role: stored.role } };
}

export async function listAdminAccounts(): Promise<AdminAccountSummary[]> {
  const { data, error } = await getUncachedServerSupabase()
    .from("admin_accounts")
    .select("id,username,display_name,role,active,created_by,updated_by,created_at,updated_at,last_login_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as StoredAdminAccount[]).map(summary);
}

export async function createAdminAccount(input: {
  username: string;
  displayName: string;
  password: string;
  role: AdminRole;
  actor: string;
}): Promise<AdminAccountSummary> {
  const username = normalizeUsername(input.username);
  const displayName = normalizeDisplayName(input.displayName);
  validatePassword(input.password);
  if (!isAdminRole(input.role)) throw new AdminAccountInputError("สิทธิ์บัญชีไม่ถูกต้อง", "invalid_input");

  const now = new Date().toISOString();
  const { data, error } = await getUncachedServerSupabase().from("admin_accounts").insert({
    id: randomUUID(),
    username,
    display_name: displayName,
    password_digest: digestPassword(input.password),
    role: input.role,
    active: true,
    created_by: input.actor,
    updated_by: input.actor,
    created_at: now,
    updated_at: now,
  }).select("id,username,display_name,role,active,created_by,updated_by,created_at,updated_at,last_login_at").single();
  if (error?.code === "23505") throw new AdminAccountInputError("ชื่อผู้ใช้นี้มีอยู่แล้ว", "duplicate");
  if (error) throw error;
  return summary(data as StoredAdminAccount);
}

export async function updateAdminAccount(input: {
  id: string;
  displayName?: string;
  password?: string;
  role?: AdminRole;
  active?: boolean;
  actor: string;
}): Promise<AdminAccountSummary> {
  const client = getUncachedServerSupabase();
  const { data: existing, error: existingError } = await client
    .from("admin_accounts")
    .select("id,role,active")
    .eq("id", input.id)
    .maybeSingle();
  if (existingError) throw existingError;
  if (!existing) throw new AdminAccountInputError("ไม่พบบัญชีแอดมิน", "not_found");

  const role = input.role ?? (existing.role as AdminRole);
  const active = input.active ?? existing.active;
  if (!isAdminRole(role)) throw new AdminAccountInputError("สิทธิ์บัญชีไม่ถูกต้อง", "invalid_input");

  if (existing.role === "owner" && existing.active && (role !== "owner" || !active)) {
    const { count, error: countError } = await client
      .from("admin_accounts")
      .select("id", { count: "exact", head: true })
      .eq("role", "owner")
      .eq("active", true)
      .neq("id", input.id);
    if (countError) throw countError;
    if (!count) throw new AdminAccountInputError("ต้องมี Owner ที่เปิดใช้งานอย่างน้อย 1 บัญชี", "last_owner");
  }

  const changes: Record<string, unknown> = {
    role,
    active,
    updated_by: input.actor,
    updated_at: new Date().toISOString(),
  };
  if (input.displayName !== undefined) changes.display_name = normalizeDisplayName(input.displayName);
  if (input.password) {
    validatePassword(input.password);
    changes.password_digest = digestPassword(input.password);
  }

  const { data, error } = await client.from("admin_accounts").update(changes).eq("id", input.id)
    .select("id,username,display_name,role,active,created_by,updated_by,created_at,updated_at,last_login_at").single();
  if (error) throw error;
  return summary(data as StoredAdminAccount);
}
