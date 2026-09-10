import "server-only";

import { getServerSupabase } from "@/lib/supabase";
import type { CanonicalStockRow } from "@/lib/stock-import-parser";

function parseRpcResult(data: unknown, operation: string) {
  if (!data || typeof data !== "object" || !("batch_id" in data) || !("status" in data)) {
    throw new Error(`${operation} returned an invalid result`);
  }
  return data as Record<string, unknown>;
}

export async function stageStockImport(input: {
  source: "google_sheet" | "manual_upload";
  sourceReference: string;
  checksum: string;
  rows: CanonicalStockRow[];
  actor: string;
}) {
  const { data, error } = await getServerSupabase().rpc("stage_stock_import", {
    p_source: input.source,
    p_source_reference: input.sourceReference,
    p_source_checksum: input.checksum,
    p_rows: input.rows,
    p_created_by: input.actor,
  });
  if (error) throw error;
  return parseRpcResult(data, "Stock import staging");
}

export async function applyStockImport(batchId: string, actor: string) {
  const { data, error } = await getServerSupabase().rpc("apply_stock_import", {
    p_batch_id: batchId,
    p_applied_by: actor,
  });
  if (error) throw error;
  return parseRpcResult(data, "Stock import apply");
}

export async function listStockImports(selectedBatchId?: string | null) {
  const client = getServerSupabase();
  const { data: batches, error: batchesError } = await client
    .from("stock_import_batches")
    .select("id,source,source_reference,status,row_count,valid_count,invalid_count,changed_count,created_by,created_at,applied_by,applied_at")
    .order("created_at", { ascending: false })
    .limit(30);
  if (batchesError) throw batchesError;

  const batchId = selectedBatchId || batches?.[0]?.id || null;
  if (!batchId) return { batches: batches ?? [], selectedBatchId: null, rows: [] };
  const { data: rows, error: rowsError } = await client
    .from("stock_import_rows")
    .select("id,batch_id,row_number,raw_sku,normalized_sku,requested_quantity,previous_quantity,quantity_delta,validation_status,error_code,error_message")
    .eq("batch_id", batchId)
    .order("row_number", { ascending: true })
    .limit(5000);
  if (rowsError) throw rowsError;
  return { batches: batches ?? [], selectedBatchId: batchId, rows: rows ?? [] };
}
