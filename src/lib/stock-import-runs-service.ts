import "server-only";

import { getServerSupabase } from "@/lib/supabase";

export type StockImportRunStatus =
  | "running"
  | "success"
  | "review_required"
  | "failed"
  | "skipped";

export interface StockImportRun {
  id: string;
  trigger_type: "cron" | "manual";
  status: StockImportRunStatus;
  batch_id: string | null;
  started_at: string;
  finished_at: string | null;
  rows_read: number;
  valid_count: number;
  invalid_count: number;
  changed_count: number;
  auto_apply_enabled: boolean;
  applied: boolean;
  error_code: string | null;
  safe_message: string | null;
  created_at: string;
}

export interface CreateRunInput {
  trigger_type: "cron" | "manual";
  auto_apply_enabled: boolean;
}

export interface FinalizeRunInput {
  runId: string;
  status: StockImportRunStatus;
  batch_id?: string | null;
  rows_read?: number;
  valid_count?: number;
  invalid_count?: number;
  changed_count?: number;
  applied?: boolean;
  error_code?: string | null;
  safe_message?: string | null;
}

const SANITIZED_ERROR_CODES: Record<string, string> = {
  unauthorized: "UNAUTHORIZED",
  forbidden: "FORBIDDEN",
  not_found: "NOT_FOUND",
  validation_error: "VALIDATION_ERROR",
  rate_limit: "RATE_LIMIT",
  timeout: "TIMEOUT",
  connection_error: "CONNECTION_ERROR",
  configuration_error: "CONFIGURATION_ERROR",
  checksum_mismatch: "CHECKSUM_MISMATCH",
  stale_data: "STALE_DATA",
  quota_exceeded: "QUOTA_EXCEEDED",
  internal_error: "INTERNAL_ERROR",
  auto_apply_disabled: "AUTO_APPLY_DISABLED",
  change_limit_exceeded: "CHANGE_LIMIT_EXCEEDED",
};

const MAX_SAFE_MESSAGE_LENGTH = 500;

export function sanitizeErrorCode(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    for (const [key, code] of Object.entries(SANITIZED_ERROR_CODES)) {
      if (message.includes(key)) return code;
    }
    if (message.includes("missing") || message.includes("not configured")) {
      return "CONFIGURATION_ERROR";
    }
    if (message.includes("timeout")) return "TIMEOUT";
    if (message.includes("network") || message.includes("fetch")) {
      return "CONNECTION_ERROR";
    }
  }
  return "INTERNAL_ERROR";
}

function sanitizeMessage(message: string | undefined | null): string | null {
  if (!message) return null;
  const trimmed = message.trim().slice(0, MAX_SAFE_MESSAGE_LENGTH);
  return trimmed || null;
}

export async function createStockImportRun(
  input: CreateRunInput,
): Promise<string> {
  const { data, error } = await getServerSupabase()
    .from("stock_import_runs")
    .insert({
      trigger_type: input.trigger_type,
      status: "running",
      auto_apply_enabled: input.auto_apply_enabled,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create stock import run", {
      code: error.code,
      message: "Database insert failed",
    });
    throw new Error("Failed to create stock import run");
  }

  if (!data) {
    throw new Error("Failed to create stock import run: no data returned");
  }

  return data.id;
}

export async function finalizeStockImportRun(
  input: FinalizeRunInput,
): Promise<void> {
  const updateData: Record<string, unknown> = {
    status: input.status,
    finished_at: new Date().toISOString(),
  };

  if (input.batch_id !== undefined) updateData.batch_id = input.batch_id;
  if (input.rows_read !== undefined) updateData.rows_read = input.rows_read;
  if (input.valid_count !== undefined) updateData.valid_count = input.valid_count;
  if (input.invalid_count !== undefined) updateData.invalid_count = input.invalid_count;
  if (input.changed_count !== undefined) updateData.changed_count = input.changed_count;
  if (input.applied !== undefined) updateData.applied = input.applied;
  if (input.error_code !== undefined) updateData.error_code = input.error_code;
  if (input.safe_message !== undefined) {
    updateData.safe_message = sanitizeMessage(input.safe_message);
  }

  const { error } = await getServerSupabase()
    .from("stock_import_runs")
    .update(updateData)
    .eq("id", input.runId);

  if (error) {
    console.error("Failed to finalize stock import run", {
      code: error.code,
      message: "Database update failed",
    });
    // Do not throw - monitoring failure must not cause stock to be applied twice
  }
}

export async function getStockImportRuns(limit = 20): Promise<StockImportRun[]> {
  const { data, error } = await getServerSupabase()
    .from("stock_import_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to get stock import runs", {
      code: error.code,
      message: "Database query failed",
    });
    throw new Error("Failed to get stock import runs");
  }

  return data ?? [];
}

export async function getLatestStockImportRun(): Promise<StockImportRun | null> {
  const { data, error } = await getServerSupabase()
    .from("stock_import_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to get latest stock import run", {
      code: error.code,
      message: "Database query failed",
    });
    throw new Error("Failed to get latest stock import run");
  }

  return data;
}

export async function getLatestSuccessfulStockImportRun(): Promise<StockImportRun | null> {
  const { data, error } = await getServerSupabase()
    .from("stock_import_runs")
    .select("*")
    .eq("status", "success")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to get latest successful stock import run", {
      code: error.code,
      message: "Database query failed",
    });
    throw new Error("Failed to get latest successful stock import run");
  }

  return data;
}

export async function getLatestFailedStockImportRun(): Promise<StockImportRun | null> {
  const { data, error } = await getServerSupabase()
    .from("stock_import_runs")
    .select("*")
    .eq("status", "failed")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to get latest failed stock import run", {
      code: error.code,
      message: "Database query failed",
    });
    throw new Error("Failed to get latest failed stock import run");
  }

  return data;
}