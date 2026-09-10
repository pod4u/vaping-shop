import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { fetchGoogleStockSheet } from "@/lib/google-sheets-stock-source";
import { applyStockImport, stageStockImport } from "@/lib/stock-import-service";
import {
  createStockImportRun,
  finalizeStockImportRun,
  sanitizeErrorCode,
} from "@/lib/stock-import-runs-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const received = request.headers.get("authorization");
  if (!secret || !received) return false;
  const expectedDigest = createHash("sha256").update(`Bearer ${secret}`).digest();
  const receivedDigest = createHash("sha256").update(received).digest();
  return timingSafeEqual(expectedDigest, receivedDigest);
}

export async function GET(request: NextRequest) {
  // Authentication checked BEFORE creating a run record
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const autoApply = process.env.STOCK_IMPORT_AUTO_APPLY === "true";
  let runId: string | null = null;

  try {
    runId = await createStockImportRun({
      trigger_type: "cron",
      auto_apply_enabled: autoApply,
    });
  } catch {
    console.error("Failed to create stock import run record");
    // Continue without runId - monitoring failure must not affect stock workflow
  }

  try {
    const sheet = await fetchGoogleStockSheet();
    const staged = await stageStockImport({
      source: "google_sheet",
      sourceReference: sheet.sourceReference,
      checksum: sheet.checksum,
      rows: sheet.rows,
      actor: "vercel-cron",
    });

    const idempotentReplay = staged.idempotent_replay === true;
    const rowsRead = Number(staged.row_count) ?? 0;
    const validCount = Number(staged.valid_count) ?? 0;
    const invalidCount = Number(staged.invalid_count) ?? 0;
    const changedCount = Number(staged.changed_count) ?? 0;
    const batchId = typeof staged.batch_id === "string" ? staged.batch_id : null;

    // Case 1: Idempotent checksum - skipped
    // Business logic: return skipped response regardless of monitoring
    if (idempotentReplay) {
      if (runId) {
        await finalizeStockImportRun({
          runId,
          status: "skipped",
          batch_id: batchId,
          rows_read: rowsRead,
          valid_count: validCount,
          invalid_count: invalidCount,
          changed_count: changedCount,
          safe_message: "Same source checksum already processed",
        });
      }
      return NextResponse.json({ success: true, staged, applied: null, skipped: true });
    }

    // Case 2: Validation errors - review_required with VALIDATION_ERROR
    // Business logic: return validation_failed response regardless of monitoring
    if (staged.status === "validation_failed") {
      if (runId) {
        await finalizeStockImportRun({
          runId,
          status: "review_required",
          batch_id: batchId,
          rows_read: rowsRead,
          valid_count: validCount,
          invalid_count: invalidCount,
          changed_count: changedCount,
          error_code: "VALIDATION_ERROR",
          safe_message: `${invalidCount} rows failed validation`,
        });
      }
      return NextResponse.json({
        success: true,
        staged,
        applied: null,
        requiresReview: true,
        reason: "validation_failed",
      });
    }

    const maxChangedRows = Math.min(
      Math.max(Number(process.env.STOCK_IMPORT_MAX_CHANGED_ROWS) || 500, 1),
      5_000,
    );

    // Case 3: Auto-apply enabled and within limits - success with applied=true
    // Business logic: apply stock regardless of monitoring
    if (autoApply && staged.status === "ready" && invalidCount === 0 && changedCount <= maxChangedRows) {
      const applied = await applyStockImport(String(batchId), "vercel-cron");
      if (runId) {
        await finalizeStockImportRun({
          runId,
          status: "success",
          batch_id: batchId,
          rows_read: rowsRead,
          valid_count: validCount,
          invalid_count: invalidCount,
          changed_count: changedCount,
          applied: true,
        });
      }
      return NextResponse.json({ success: true, staged, applied });
    }

    // Case 4: Change limit exceeded - review_required with CHANGE_LIMIT_EXCEEDED
    // Business logic: return review response regardless of monitoring
    if (changedCount > maxChangedRows) {
      if (runId) {
        await finalizeStockImportRun({
          runId,
          status: "review_required",
          batch_id: batchId,
          rows_read: rowsRead,
          valid_count: validCount,
          invalid_count: invalidCount,
          changed_count: changedCount,
          applied: false,
          error_code: "CHANGE_LIMIT_EXCEEDED",
          safe_message: `${changedCount} changes exceed limit of ${maxChangedRows}`,
        });
      }
      return NextResponse.json({
        success: true,
        staged,
        applied: null,
        requiresReview: true,
        reason: "change_limit_exceeded",
      });
    }

    // Case 5: Auto-apply disabled - review_required with AUTO_APPLY_DISABLED
    // Business logic: return review response regardless of monitoring
    if (!autoApply && staged.status === "ready" && invalidCount === 0) {
      if (runId) {
        await finalizeStockImportRun({
          runId,
          status: "review_required",
          batch_id: batchId,
          rows_read: rowsRead,
          valid_count: validCount,
          invalid_count: invalidCount,
          changed_count: changedCount,
          applied: false,
          error_code: "AUTO_APPLY_DISABLED",
          safe_message: "Staged successfully, awaiting manual apply",
        });
      }
      return NextResponse.json({
        success: true,
        staged,
        applied: null,
        requiresReview: true,
        reason: "auto_apply_disabled",
      });
    }

    // Fallback: Unknown state - review_required
    // Business logic: return review response regardless of monitoring
    if (runId) {
      await finalizeStockImportRun({
        runId,
        status: "review_required",
        batch_id: batchId,
        rows_read: rowsRead,
        valid_count: validCount,
        invalid_count: invalidCount,
        changed_count: changedCount,
        applied: false,
        error_code: "INTERNAL_ERROR",
        safe_message: "Import completed with unknown state",
      });
    }

    return NextResponse.json({
      success: true,
      staged,
      applied: null,
      requiresReview: true,
      reason: "unknown_state",
    });
  } catch (error: unknown) {
    const errorCode = sanitizeErrorCode(error);
    const safeMessage = error instanceof Error && error.message.includes("Missing GOOGLE_")
      ? "Google Sheets integration not configured"
      : "Import failed unexpectedly";
    // Business logic: return error response regardless of monitoring
    if (runId) {
      await finalizeStockImportRun({
        runId,
        status: "failed",
        error_code: errorCode,
        safe_message: safeMessage,
      });
    }
    console.error("Nightly stock import failed", {
      code: errorCode,
    });
    return NextResponse.json({ success: false, error: "Nightly stock import failed" }, { status: 500 });
  }
}