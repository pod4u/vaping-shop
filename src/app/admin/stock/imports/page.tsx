"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, FileSpreadsheet, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatBangkokDateTime,
  shouldShowNoSuccessAfter0330Warning,
} from "@/lib/bangkok-time";

interface ImportBatch {
  id: string;
  source: string;
  status: "processing" | "ready" | "validation_failed" | "applied";
  row_count: number;
  valid_count: number;
  invalid_count: number;
  changed_count: number;
  created_at: string;
  applied_at: string | null;
}

interface StockImportRun {
  id: string;
  trigger_type: "cron" | "manual";
  status: "running" | "success" | "review_required" | "failed" | "skipped";
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
}

interface MonitoringSummary {
  latestRun: StockImportRun | null;
  lastSuccessfulRun: StockImportRun | null;
  lastFailedRun: StockImportRun | null;
  recentRuns: StockImportRun[];
  schedule: string;
  nextScheduledRun: string;
  autoApplyEnabled: boolean;
  integrationConfigured: boolean;
}

interface ImportRow {
  id: string;
  row_number: number;
  raw_sku: string | null;
  normalized_sku: string | null;
  requested_quantity: number | null;
  previous_quantity: number | null;
  quantity_delta: number | null;
  validation_status: "valid" | "error";
  error_message: string | null;
}

const STATUS_LABELS: Record<ImportBatch["status"], string> = {
  processing: "กำลังประมวลผล",
  ready: "พร้อมอัปเดต",
  validation_failed: "ต้องแก้ข้อมูล",
  applied: "อัปเดตแล้ว",
};

const RUN_STATUS_LABELS: Record<StockImportRun["status"], string> = {
  running: "กำลังทำงาน",
  success: "สำเร็จ",
  review_required: "ต้องตรวจสอบ",
  failed: "ล้มเหลว",
  skipped: "ข้ามแล้ว",
};

function getStatusColor(status: StockImportRun["status"]): string {
  switch (status) {
    case "success":
      return "bg-emerald-400/20 text-emerald-300 border-emerald-400/30";
    case "review_required":
      return "bg-amber-400/20 text-amber-300 border-amber-400/30";
    case "skipped":
      return "bg-slate-400/20 text-slate-300 border-slate-400/30";
    case "failed":
      return "bg-red-400/20 text-red-300 border-red-400/30";
    case "running":
      return "bg-sky-400/20 text-sky-300 border-sky-400/30";
    default:
      return "bg-white/10 text-white/50 border-white/10";
  }
}

function isRunStuck(run: StockImportRun | null): boolean {
  if (!run || run.status !== "running" || !run.started_at) return false;
  const started = new Date(run.started_at).getTime();
  const now = Date.now();
  return now - started > 15 * 60 * 1000;
}

export default function StockImportsPage() {
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [monitoring, setMonitoring] = useState<MonitoringSummary | null>(null);
  const [monitoringError, setMonitoringError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStaging, setIsStaging] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadImports = useCallback(async (batchId?: string | null) => {
    const query = batchId ? `?batch_id=${encodeURIComponent(batchId)}` : "";
    const response = await fetch(`/api/admin/stock-imports${query}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "โหลดประวัตินำเข้าไม่สำเร็จ");
    setBatches(result.batches ?? []);
    setRows(result.rows ?? []);
    setSelectedBatchId(result.selectedBatchId ?? null);
  }, []);

  const loadMonitoring = useCallback(async () => {
    setMonitoringError(null);
    const response = await fetch("/api/admin/stock-imports/monitoring", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) {
      setMonitoringError(result.error || "โหลดข้อมูล monitoring ไม่สำเร็จ");
      return;
    }
    setMonitoring(result);
  }, []);

  useEffect(() => {
    Promise.all([loadImports(), loadMonitoring()])
      .catch((error) => setMessage({ type: "error", text: error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ" }))
      .finally(() => setIsLoading(false));
  }, [loadImports, loadMonitoring]);

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === selectedBatchId) ?? null,
    [batches, selectedBatchId],
  );

  const warnings = useMemo(() => {
    const items: string[] = [];
    if (monitoringError) {
      items.push(monitoringError);
    }
    if (!monitoring && !monitoringError) {
      return items;
    }
    if (monitoring && !monitoring.integrationConfigured) {
      items.push("การตั้งค่า Google Sheet/Cron ไม่ครบ ระบบจะยังไม่ทำงาน");
    }
    if (monitoring?.latestRun?.status === "failed") {
      items.push("การนำเข้าล่าสุดล้มเหลว กรุณาตรวจสอบ");
    }
    if (isRunStuck(monitoring?.latestRun ?? null)) {
      items.push("การนำเข้ากำลังทำงานเกิน 15 นาที อาจติดขัด");
    }
    if (monitoring && !monitoring.lastSuccessfulRun) {
      items.push("ยังไม่มีการนำเข้าสำเร็จ");
    }
    if (monitoring?.lastSuccessfulRun && shouldShowNoSuccessAfter0330Warning(monitoring.lastSuccessfulRun)) {
      items.push("ยังไม่มีการนำเข้าสำเร็จวันนี้หลัง 03:30 น.");
    }
    return items;
  }, [monitoring, monitoringError]);

  async function readSheet() {
    setIsStaging(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/stock-imports", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "อ่าน Google Sheet ไม่สำเร็จ");
      setMessage({ type: Number(result.invalid_count) > 0 ? "error" : "success", text: result.message });
      await loadImports(String(result.batch_id));
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "อ่าน Google Sheet ไม่สำเร็จ" });
    } finally {
      setIsStaging(false);
    }
  }

  async function applyBatch() {
    if (!selectedBatch || !window.confirm(`ยืนยันอัปเดตสต็อก ${selectedBatch.changed_count} รายการ?`)) return;
    setIsApplying(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/stock-imports/${selectedBatch.id}/apply`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "อัปเดตสต็อกไม่สำเร็จ");
      setMessage({ type: "success", text: result.message });
      await loadImports(selectedBatch.id);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "อัปเดตสต็อกไม่สำเร็จ" });
    } finally {
      setIsApplying(false);
    }
  }

  if (isLoading) return <div className="p-8 text-white/60">กำลังโหลดประวัตินำเข้า...</div>;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">นำเข้าสต็อก</h1>
          <p className="mt-1 text-sm text-white/50">อ่าน Google Sheet ทุกวันเวลา 03:00 น. และตรวจสอบก่อนเปลี่ยนสต็อกจริง</p>
        </div>
        <button
          type="button"
          onClick={readSheet}
          disabled={isStaging}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-acid-lime px-5 py-3 font-bold text-navy-deep disabled:opacity-50"
        >
          {isStaging ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {isStaging ? "กำลังอ่านและตรวจ..." : "อ่าน Google Sheet ตอนนี้"}
        </button>
      </div>

      {message && (
        <div role="alert" className={`rounded-lg border p-4 ${message.type === "success" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100" : "border-red-400/30 bg-red-400/10 text-red-200"}`}>
          {message.text}
        </div>
      )}

      {warnings.length > 0 && (
        <div role="alert" className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <ul className="space-y-1 text-sm text-amber-100">
              {warnings.map((warning, index) => <li key={index}>{warning}</li>)}
            </ul>
          </div>
        </div>
      )}

      {monitoring && (
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Clock className="h-5 w-5" />
              การนำเข้าอัตโนมัติ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <p className="text-xs text-white/50">ตารางเวลา</p>
                <p className="font-bold text-white">ทุกวัน เวลา 03:00 น.</p>
                <p className="text-xs text-white/40">ครั้งถัดไป: {formatBangkokDateTime(monitoring.nextScheduledRun)}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-white/50">การทำงานล่าสุด</p>
                {monitoring.latestRun ? (
                  <>
                    <p className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-sm font-medium ${getStatusColor(monitoring.latestRun.status)}`}>
                      {monitoring.latestRun.status === "running" && <Loader2 className="h-3 w-3 animate-spin" />}
                      {monitoring.latestRun.status === "success" && <CheckCircle2 className="h-3 w-3" />}
                      {monitoring.latestRun.status === "failed" && <XCircle className="h-3 w-3" />}
                      {monitoring.latestRun.status === "review_required" && <AlertTriangle className="h-3 w-3" />}
                      {RUN_STATUS_LABELS[monitoring.latestRun.status]}
                    </p>
                    <p className="text-xs text-white/40">{formatBangkokDateTime(monitoring.latestRun.started_at)}</p>
                  </>
                ) : (
                  <p className="text-sm text-white/40">ยังไม่มีการทำงาน</p>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs text-white/50">สำเร็จล่าสุด</p>
                {monitoring.lastSuccessfulRun ? (
                  <p className="text-sm text-emerald-300">{formatBangkokDateTime(monitoring.lastSuccessfulRun.started_at)}</p>
                ) : (
                  <p className="text-sm text-white/40">ยังไม่มี</p>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs text-white/50">กำหนดค่า</p>
                <p className={`text-sm font-medium ${monitoring.integrationConfigured ? "text-emerald-300" : "text-amber-300"}`}>
                  {monitoring.integrationConfigured ? "พร้อมทำงาน" : "ยังไม่ครบ"}
                </p>
                <p className="text-xs text-white/40">
                  Auto Apply: {monitoring.autoApplyEnabled ? "เปิด" : "ปิด"}
                </p>
              </div>
            </div>

            {monitoring.latestRun && monitoring.latestRun.status !== "running" && (
              <div className="mt-4 grid gap-4 border-t border-white/10 pt-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-white/50">แถวที่อ่าน</p>
                  <p className="text-lg font-bold text-white">{monitoring.latestRun.rows_read}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50">เปลี่ยนแปลง</p>
                  <p className="text-lg font-bold text-white">{monitoring.latestRun.changed_count}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50">ไม่ถูกต้อง</p>
                  <p className={`text-lg font-bold ${monitoring.latestRun.invalid_count > 0 ? "text-red-300" : "text-white"}`}>
                    {monitoring.latestRun.invalid_count}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/50">นำเข้าแล้ว</p>
                  <p className={`text-lg font-bold ${monitoring.latestRun.applied ? "text-emerald-300" : "text-white/50"}`}>
                    {monitoring.latestRun.applied ? "ใช่" : "ไม่"}
                  </p>
                </div>
              </div>
            )}

            {monitoring.latestRun?.safe_message && (
              <p className="mt-3 text-xs text-white/50">
                หมายเหตุ: {monitoring.latestRun.safe_message}
              </p>
            )}

            <p className="mt-4 text-xs text-white/30">
              หมายเหตุ: ระบบไม่สามารถตรวจสอบความใหม่ของไฟล์ต้นทางได้ ต้องอาศัย supplier ส่งค่า stock_as_of ที่ยืนยันได้
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="border-white/10 bg-white/5">
          <CardHeader><CardTitle className="text-white">ประวัติ Batch</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {batches.length === 0 ? <p className="py-8 text-center text-white/40">ยังไม่มีการนำเข้า</p> : batches.map((batch) => (
              <button
                key={batch.id}
                type="button"
                onClick={() => loadImports(batch.id)}
                className={`w-full rounded-lg border p-3 text-left ${batch.id === selectedBatchId ? "border-acid-lime/50 bg-acid-lime/10" : "border-white/10 bg-black/10 hover:bg-white/5"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white">{STATUS_LABELS[batch.status]}</span>
                  <span className="text-xs text-white/40">{formatBangkokDateTime(batch.created_at)}</span>
                </div>
                <p className="mt-2 text-xs text-white/50">{batch.row_count} แถว · เปลี่ยน {batch.changed_count} · ผิด {batch.invalid_count}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-white"><FileSpreadsheet className="h-5 w-5" />ผลตรวจสอบ</CardTitle>
              {selectedBatch && <p className="mt-1 text-xs text-white/50">ผ่าน {selectedBatch.valid_count} · ผิด {selectedBatch.invalid_count} · เปลี่ยน {selectedBatch.changed_count}</p>}
            </div>
            {selectedBatch?.status === "ready" && (
              <button
                type="button"
                onClick={applyBatch}
                disabled={isApplying}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2 font-bold text-navy-deep disabled:opacity-50"
              >
                {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                ยืนยันอัปเดตสต็อก
              </button>
            )}
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {!selectedBatch ? <p className="p-8 text-center text-white/40">เลือก batch เพื่อดูผล</p> : (
              <table className="w-full text-sm">
                <thead className="border-y border-white/10 bg-white/5 text-left text-white/50">
                  <tr><th className="px-4 py-3">แถว</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3 text-right">เดิม</th><th className="px-4 py-3 text-right">จากชีท</th><th className="px-4 py-3 text-right">ต่าง</th><th className="px-4 py-3">ผลตรวจ</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map((row) => (
                    <tr key={row.id} className={row.validation_status === "error" ? "bg-red-400/5" : ""}>
                      <td className="px-4 py-3 text-white/40">{row.row_number}</td>
                      <td className="px-4 py-3 font-mono text-white">{row.normalized_sku || row.raw_sku || "—"}</td>
                      <td className="px-4 py-3 text-right text-white/60">{row.previous_quantity ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-white">{row.requested_quantity ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-white/70">{row.quantity_delta == null ? "—" : row.quantity_delta > 0 ? `+${row.quantity_delta}` : row.quantity_delta}</td>
                      <td className="px-4 py-3">
                        {row.validation_status === "valid" ? <span className="inline-flex items-center gap-1 text-emerald-300"><CheckCircle2 className="h-4 w-4" />ผ่าน</span> : <span className="inline-flex items-center gap-1 text-red-300"><AlertTriangle className="h-4 w-4" />{row.error_message}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}