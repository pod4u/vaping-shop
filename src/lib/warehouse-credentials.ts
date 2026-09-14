import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getUncachedServerSupabase } from "@/lib/supabase";
import {
  authenticateConfiguredWarehouse,
  getConfiguredWarehouseAccounts,
  type WarehouseAccount,
} from "@/lib/warehouse-auth";

const ACCOUNT_ID = "warehouse";
const DIGEST_PREFIX = "scrypt-v1";

interface StoredWarehouseAccount {
  id: string;
  username: string;
  display_name: string;
  password_digest: string;
  updated_at: string;
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

async function getStoredAccount(): Promise<StoredWarehouseAccount | null> {
  const { data, error } = await getUncachedServerSupabase()
    .from("warehouse_accounts")
    .select("id,username,display_name,password_digest,updated_at")
    .eq("id", ACCOUNT_ID)
    .maybeSingle();
  if (error) throw error;
  return data as StoredWarehouseAccount | null;
}

export async function authenticateWarehouse(username: string, password: string): Promise<WarehouseAccount | null> {
  const stored = await getStoredAccount();
  if (stored) {
    if (stored.username !== username.trim().toLowerCase() || !verifyPassword(password, stored.password_digest)) return null;
    return { id: stored.id, username: stored.username, password: "", displayName: stored.display_name };
  }
  return authenticateConfiguredWarehouse(username, password);
}

export async function getWarehouseCredentialSummary() {
  const stored = await getStoredAccount();
  if (stored) {
    return { configured: true, username: stored.username, source: "admin" as const, updatedAt: stored.updated_at };
  }
  const fallback = getConfiguredWarehouseAccounts()[0];
  return {
    configured: Boolean(fallback),
    username: fallback?.username ?? "",
    source: "environment" as const,
    updatedAt: null,
  };
}

export async function updateWarehouseCredentials(input: {
  username: string;
  password: string;
  updatedBy: string;
}) {
  const username = input.username.trim().toLowerCase();
  const { error } = await getUncachedServerSupabase().from("warehouse_accounts").upsert({
    id: ACCOUNT_ID,
    username,
    display_name: "ทีมคลังสินค้า",
    password_digest: digestPassword(input.password),
    updated_by: input.updatedBy,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  if (error) throw error;
  return getWarehouseCredentialSummary();
}
