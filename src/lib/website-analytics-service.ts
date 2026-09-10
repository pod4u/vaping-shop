import "server-only";
import { getServerSupabase } from "@/lib/supabase";
import { providerConfig, fetchHealthReport, fetchSearchReport, fetchTrafficReport, safeAnalyticsError } from "@/lib/website-analytics-providers";
import type {
  AnalyticsDashboard, AnalyticsSource, HealthReport, PeriodDays, SearchReport, SourceView, SyncOutcome, SyncRun, TrafficReport,
} from "@/lib/website-analytics";

interface Snapshot { source: AnalyticsSource; scope_key: string; period_days: number; fetched_at: string; payload: unknown }
const storageMessage = "ยังอ่านตารางสถิติไม่ได้ ให้ผู้ดูแลติดตั้ง migration ของ Dashboard และตรวจ SUPABASE_SERVICE_ROLE_KEY";

export function buildSourceView<T>(source: AnalyticsSource, days: number, snapshots: Snapshot[], runs: SyncRun[]): SourceView<T> {
  const config = providerConfig(source);
  const snapshot = snapshots.find((item) => item.source === source && item.period_days === days && item.scope_key === config.scopeKey);
  const matches = (outcome: SyncOutcome) => outcome.source === source && outcome.days === days && outcome.scopeKey === config.scopeKey;
  const run = runs.find((item) => item.outcomes.some(matches));
  const outcome = run?.outcomes.find(matches);
  const hasCurrentError = outcome?.status === "error" && (!snapshot || Date.parse(run!.started_at) > Date.parse(snapshot.fetched_at));
  const payload = snapshot?.payload as T | undefined;
  let empty = false;
  if (payload && source === "google") empty = (snapshot!.payload as SearchReport).totals.impressions === 0;
  if (payload && source === "vercel") empty = (snapshot!.payload as TrafficReport).totals.pageviews === 0;
  return {
    status: !config.configured ? "not_configured" : hasCurrentError ? "error" : snapshot ? empty ? "empty" : "ready" : "pending",
    configured: config.configured, missing: config.missing,
    lastSuccessAt: snapshot?.fetched_at ?? null, lastAttemptAt: run?.started_at ?? null,
    error: hasCurrentError ? outcome?.message ?? "ซิงก์ไม่สำเร็จ" : null,
    stale: Boolean(snapshot && Date.now() - Date.parse(snapshot.fetched_at) > 36 * 60 * 60 * 1000),
    data: payload ?? null,
  };
}

export async function getAnalyticsDashboard(days: PeriodDays): Promise<AnalyticsDashboard> {
  let snapshots: Snapshot[] = [];
  let runs: SyncRun[] = [];
  let storageError: string | null = null;
  try {
    const db = getServerSupabase();
    const [reports, history] = await Promise.all([
      db.from("website_analytics_snapshots").select("source,scope_key,period_days,fetched_at,payload").in("period_days", [0, days]),
      db.from("website_analytics_runs").select("id,started_at,finished_at,status,outcomes").order("started_at", { ascending: false }).limit(20),
    ]);
    if (reports.error || history.error) throw new Error("Storage unavailable");
    snapshots = reports.data as Snapshot[];
    runs = history.data as SyncRun[];
  } catch { storageError = storageMessage; }
  return {
    days, generatedAt: new Date().toISOString(), storageReady: !storageError, storageError,
    scheduleConfigured: Boolean(process.env.CRON_SECRET?.trim()),
    google: buildSourceView<SearchReport>("google", days, snapshots, runs),
    vercel: buildSourceView<TrafficReport>("vercel", days, snapshots, runs),
    health: buildSourceView<HealthReport>("health", 0, snapshots, runs), runs,
  };
}

export class AnalyticsSyncError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function syncWebsiteAnalytics() {
  const db = getServerSupabase();
  const { data: runId, error: acquireError } = await db.rpc("acquire_website_analytics_sync");
  if (acquireError) throw new AnalyticsSyncError(storageMessage, 503);
  if (!runId) throw new AnalyticsSyncError("มีงานกำลังซิงก์หรือเพิ่งซิงก์ไป กรุณารออย่างน้อย 60 วินาที", 429);
  const outcomes: SyncOutcome[] = [];
  const now = new Date();
  async function save(source: AnalyticsSource, days: number, fetcher: () => Promise<unknown>) {
    const config = providerConfig(source);
    if (!config.configured) {
      outcomes.push({ source, scopeKey: config.scopeKey, days, status: "skipped", message: "ยังไม่ได้ตั้งค่าการเชื่อมต่อ" });
      return;
    }
    try {
      const payload = await fetcher();
      const { error } = await db.from("website_analytics_snapshots").upsert({
        source, scope_key: config.scopeKey, period_days: days, fetched_at: new Date().toISOString(), payload,
      }, { onConflict: "source,scope_key,period_days" });
      if (error) throw new AnalyticsSyncError("อ่านข้อมูลได้ แต่บันทึกสถิติไม่สำเร็จ", 503);
      outcomes.push({ source, scopeKey: config.scopeKey, days, status: "success", message: null });
    } catch (error) {
      outcomes.push({ source, scopeKey: config.scopeKey, days, status: "error", message: error instanceof AnalyticsSyncError ? error.message : safeAnalyticsError(error) });
    }
  }
  // All operations have bounded timeouts. Keep the two date periods in separate waves.
  await Promise.all([
    save("health", 0, fetchHealthReport),
    save("google", 7, () => fetchSearchReport(7, now)),
    save("vercel", 7, () => fetchTrafficReport(7, now)),
  ]);
  await Promise.all([
    save("google", 28, () => fetchSearchReport(28, now)),
    save("vercel", 28, () => fetchTrafficReport(28, now)),
  ]);
  const status = outcomes.every((item) => item.status === "success") ? "success"
    : outcomes.some((item) => item.status === "success") ? "partial" : "error";
  const { error: finishError } = await db.from("website_analytics_runs").update({ status, finished_at: new Date().toISOString(), outcomes }).eq("id", runId);
  if (finishError) throw new AnalyticsSyncError("บันทึกประวัติซิงก์ไม่สำเร็จ กรุณาตรวจฐานข้อมูล", 503);
  const { error: pruneError } = await db.from("website_analytics_runs").delete().neq("status", "running").lt("started_at", new Date(Date.now() - 90 * 86400_000).toISOString());
  if (pruneError) console.warn("Analytics history retention cleanup failed");
  return { runId, status, outcomes };
}
