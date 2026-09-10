// Shared, serializable analytics model. No credentials or provider clients here.
export type AnalyticsSource = "google" | "vercel" | "health";
export type PeriodDays = 7 | 28;
export type SourceStatus = "not_configured" | "pending" | "ready" | "empty" | "error";
export interface DateRange { start: string; end: string; timezone: string }
export interface TrafficTotals { pageviews: number; visitors: number }
export interface SearchTotals { clicks: number; impressions: number; ctr: number; position: number | null }
export interface TrafficRow extends TrafficTotals { label: string }
export interface SearchRow extends SearchTotals { date: string }
export interface TrafficReport {
  range: DateRange;
  previousRange: DateRange;
  totals: TrafficTotals;
  previous: TrafficTotals | null;
  comparisonError: string | null;
  daily: (TrafficTotals & { date: string })[];
  pages: TrafficRow[];
  referrers: TrafficRow[];
  devices: TrafficRow[];
  countries: TrafficRow[];
}
export interface SearchReport {
  range: DateRange;
  previousRange: DateRange;
  totals: SearchTotals;
  previous: SearchTotals;
  daily: SearchRow[];
  dataThrough: string | null;
}
export interface HealthCheck {
  path: string;
  status: number | null;
  durationMs: number;
  ok: boolean;
}
export interface Deployment {
  id: string;
  createdAt: string;
  state: string;
  url: string | null;
  commit: string | null;
}
export interface HealthReport {
  checkedAt: string;
  checks: HealthCheck[];
  deployments: Deployment[];
  deploymentError: string | null;
}
export interface SourceView<T> {
  status: SourceStatus;
  configured: boolean;
  missing: string[];
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  error: string | null;
  stale: boolean;
  data: T | null;
}
export interface SyncOutcome { source: AnalyticsSource; scopeKey?: string; days: number; status: "success" | "error" | "skipped"; message: string | null }
export interface SyncRun { id: string; started_at: string; finished_at: string | null; status: string; outcomes: SyncOutcome[] }
export interface AnalyticsDashboard {
  days: PeriodDays;
  generatedAt: string;
  storageReady: boolean;
  storageError: string | null;
  scheduleConfigured: boolean;
  google: SourceView<SearchReport>;
  vercel: SourceView<TrafficReport>;
  health: SourceView<HealthReport>;
  runs: SyncRun[];
}

export function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function dateInZone(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map((type) => parts.find((part) => part.type === type)!.value).join("-");
}

export function reportingRanges(days: PeriodDays, source: "google" | "vercel", now = new Date()) {
  const timezone = source === "google" ? "America/Los_Angeles" : "UTC";
  // GSC final data trails today; Vercel excludes the incomplete current UTC day.
  const end = shiftDate(dateInZone(now, timezone), source === "google" ? -3 : -1);
  const start = shiftDate(end, 1 - days);
  return {
    current: { start, end, timezone },
    previous: { start: shiftDate(start, -days), end: shiftDate(start, -1), timezone },
  };
}

export function percentChange(current: number | null | undefined, previous: number | null | undefined): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function searchTotals(rows: SearchRow[]): SearchTotals {
  const clicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  return {
    clicks, impressions, ctr: impressions ? clicks / impressions : 0,
    position: impressions ? rows.reduce((sum, row) => sum + (row.position ?? 0) * row.impressions, 0) / impressions : null,
  };
}

export interface AnalyticsNotice { level: "info" | "warning"; title: string; detail: string }
export function analyticsNotices(dashboard: AnalyticsDashboard): AnalyticsNotice[] {
  const notices: AnalyticsNotice[] = [];
  if (!dashboard.storageReady) notices.push({ level: "warning", title: "ยังอ่านที่เก็บสถิติไม่ได้", detail: dashboard.storageError ?? "ตรวจการเชื่อมต่อฐานข้อมูล" });
  for (const [name, source] of [["Google Search Console", dashboard.google], ["Vercel Analytics", dashboard.vercel], ["สถานะเว็บไซต์", dashboard.health]] as const) {
    if (!source.configured) notices.push({ level: "info", title: `${name} ยังไม่เชื่อมต่อ`, detail: "เปิดส่วนการเชื่อมต่อด้านล่างเพื่อดูขั้นตอนตั้งค่า" });
    else if (source.error) notices.push({ level: "warning", title: `${name} ซิงก์ล่าสุดไม่สำเร็จ`, detail: source.error });
    else if (source.stale) notices.push({ level: "warning", title: `${name} ข้อมูลเกิน 36 ชั่วโมง`, detail: "ตรวจงานซิงก์และกดซิงก์ใหม่ ข้อมูลที่เห็นเป็นผลครั้งก่อน" });
    else if (source.status === "pending") notices.push({ level: "info", title: `${name} รอซิงก์ครั้งแรก`, detail: "กดซิงก์ข้อมูลเพื่อเริ่มตรวจการเชื่อมต่อ" });
  }
  const failed = dashboard.health.data?.checks.filter((check) => !check.ok) ?? [];
  if (failed.length) notices.push({ level: "warning", title: "พบหน้าที่ตอบสนองผิดปกติในการตรวจล่าสุด", detail: failed.map((check) => `${check.path}: ${check.status ?? "ไม่ตอบสนอง"}`).join(" · ") + " — ตรวจซ้ำและดู logs ก่อนสรุปว่าเว็บล่ม" });
  if (dashboard.health.data?.deploymentError) notices.push({ level: "warning", title: "อ่านสถานะ deployment ไม่สำเร็จ", detail: dashboard.health.data.deploymentError });
  if (dashboard.health.data?.deployments[0]?.state === "ERROR") notices.push({ level: "warning", title: "Deployment ล่าสุด build ไม่ผ่าน", detail: "ตรวจ build logs ใน Vercel; deployment ที่ล้มเหลวไม่ได้ยืนยันว่าเว็บปัจจุบันล่ม" });
  if (!dashboard.scheduleConfigured) notices.push({ level: "info", title: "ยังไม่ได้ตั้งค่าซิงก์อัตโนมัติ", detail: "ตั้ง CRON_SECRET และ deploy ตาราง cron; ตอนนี้ใช้ปุ่มซิงก์ได้" });
  if (dashboard.vercel.data?.comparisonError) notices.push({ level: "info", title: "ยังเทียบช่วงก่อนหน้าของ Vercel ไม่ได้", detail: dashboard.vercel.data.comparisonError });
  if (dashboard.google.data && dashboard.google.data.totals.impressions < 100) notices.push({ level: "info", title: "ข้อมูล Google ยังน้อย", detail: "ยังไม่ควรสรุปแนวโน้มจากเปอร์เซ็นต์ที่เปลี่ยนมากในช่วงข้อมูลน้อย" });
  return notices;
}
