import "server-only";
import { createHash, createSign } from "node:crypto";
import {
  reportingRanges, searchTotals,
  type AnalyticsSource, type DateRange, type PeriodDays, type SearchDimensionRow, type SearchReport, type SearchRow,
  type TrafficReport, type TrafficRow, type TrafficTotals, type HealthReport,
} from "@/lib/website-analytics";

const SITE = "https://www.pod4u.store";
export class AnalyticsProviderError extends Error {}

export function providerConfig(source: AnalyticsSource) {
  const required = source === "google"
    ? ["GSC_SERVICE_ACCOUNT_EMAIL", "GSC_SERVICE_ACCOUNT_PRIVATE_KEY", "GSC_PROPERTY"]
    : source === "vercel" ? ["ANALYTICS_VERCEL_TOKEN", "ANALYTICS_VERCEL_PROJECT_ID"] : [];
  const missing = required.filter((name) => !process.env[name]?.trim());
  const identity = source === "google" ? process.env.GSC_PROPERTY ?? ""
    : source === "vercel" ? `${process.env.ANALYTICS_VERCEL_TEAM_ID ?? ""}:${process.env.ANALYTICS_VERCEL_PROJECT_ID ?? ""}`
      : `${SITE}:${process.env.ANALYTICS_VERCEL_PROJECT_ID ?? ""}`;
  return { configured: missing.length === 0, missing, scopeKey: createHash("sha256").update(identity).digest("hex") };
}

export function safeAnalyticsError(error: unknown): string {
  if (error instanceof AnalyticsProviderError) return error.message;
  return "เชื่อมต่อไม่สำเร็จหรือรูปแบบข้อมูลไม่ตรงกับ API กรุณาตรวจการตั้งค่าแล้วลองใหม่";
}

async function fetchJson(url: string | URL, init: RequestInit = {}): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(12_000) });
  } catch { throw new AnalyticsProviderError("API ไม่ตอบสนองภายในเวลาที่กำหนด ลองซิงก์ใหม่ภายหลัง"); }
  if (!response.ok) {
    if (response.status === 400 && new URL(url).hostname === "api.vercel.com") {
      const body = await response.json().catch(() => null);
      const upstreamMessage = typeof body?.error?.message === "string" ? body.error.message : "";
      const days = /plan only grants access to the latest (\d{1,4}) days/.exec(upstreamMessage)?.[1];
      if (days) throw new AnalyticsProviderError(`แพ็กเกจ Vercel อ่านย้อนหลังได้ ${Number(days)} วัน ช่วงที่ขออยู่นอกข้อมูลที่อนุญาต`);
    }
    const messages: Record<number, string> = {
      400: "API ไม่ยอมรับคำขอ ตรวจ property, ช่วงวันที่ และการตั้งค่าบัญชี",
      401: "สิทธิ์ API หมดอายุหรือคีย์ไม่ถูกต้อง กรุณาตรวจคีย์ฝั่งเซิร์ฟเวอร์",
      402: "แพ็กเกจปัจจุบันไม่รองรับคำขอนี้ ตรวจสิทธิ์และช่วงข้อมูลย้อนหลัง",
      403: "บัญชีไม่มีสิทธิ์อ่านข้อมูลนี้ ตรวจสิทธิ์ property / project และการเปิด API",
      404: "ไม่พบ API หรือโปรเจกต์ที่ระบุ ตรวจ project ID และบริการที่เปิดใช้งาน",
      429: "เกินโควตา API กรุณารอสักครู่แล้วลองใหม่",
    };
    // Never persist upstream bodies: they can contain credentials or account data.
    throw new AnalyticsProviderError(messages[response.status] ?? `บริการต้นทางตอบ HTTP ${response.status}`);
  }
  const result: unknown = await response.json();
  if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("Invalid response");
  return result as Record<string, unknown>;
}

function metric(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error("Invalid metric");
  return value;
}

export function parseSearchRows(result: Record<string, unknown>): SearchRow[] {
  if (result.rows === undefined) return []; // GSC omits rows when there is no data.
  if (!Array.isArray(result.rows)) throw new Error("Invalid rows");
  return result.rows.map((row) => {
    if (!row || !Array.isArray(row.keys) || !/^\d{4}-\d{2}-\d{2}$/.test(row.keys[0])) throw new Error("Invalid date");
    const impressions = metric(row.impressions);
    return { date: row.keys[0], clicks: metric(row.clicks), impressions, ctr: metric(row.ctr), position: impressions ? metric(row.position) : null };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export function parseSearchDimensionRows(result: Record<string, unknown>, dimension: "query" | "page"): SearchDimensionRow[] {
  if (result.rows === undefined) return [];
  if (!Array.isArray(result.rows)) throw new Error("Invalid rows");
  return result.rows.map((row) => {
    if (!row || !Array.isArray(row.keys) || typeof row.keys[0] !== "string" || !row.keys[0].trim()) throw new Error("Invalid dimension");
    const impressions = metric(row.impressions);
    let label = row.keys[0].trim().slice(0, 240);
    if (dimension === "page") {
      const url = new URL(label);
      if (!["pod4u.store", "www.pod4u.store"].includes(url.hostname)) throw new Error("Unexpected page host");
      label = url.pathname.slice(0, 240);
    }
    return { label, clicks: metric(row.clicks), impressions, ctr: metric(row.ctr), position: impressions ? metric(row.position) : null };
  });
}

async function googleToken(): Promise<string> {
  const issued = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: process.env.GSC_SERVICE_ACCOUNT_EMAIL?.trim(),
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token", iat: issued, exp: issued + 3600,
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).end().sign(process.env.GSC_SERVICE_ACCOUNT_PRIVATE_KEY!.replaceAll("\\n", "\n"), "base64url");
  const result = await fetchJson("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
  });
  if (typeof result.access_token !== "string") throw new Error("Token missing");
  return result.access_token;
}

export async function fetchSearchReport(days: PeriodDays, now = new Date()): Promise<SearchReport> {
  const ranges = reportingRanges(days, "google", now);
  const property = process.env.GSC_PROPERTY!.trim();
  if (!["sc-domain:pod4u.store", `${SITE}/`, SITE, "https://pod4u.store/"].includes(property)) {
    throw new AnalyticsProviderError("GSC_PROPERTY ต้องเป็น property ของ pod4u.store ที่ยืนยันสิทธิ์แล้ว");
  }
  const token = await googleToken();
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`;
  const query = (body: Record<string, unknown>) => fetchJson(endpoint, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "web", dataState: "final", rowLimit: 100, ...body }),
  });
  // Keep property totals separate: top query/page rows are truncated and must never be summed into totals.
  const detail = async (body: Record<string, unknown>) => {
    try { return { result: await query(body), error: null }; }
    catch (error) { return { result: {}, error: safeAnalyticsError(error) }; }
  };
  const [dateResult, queryDetail, pageDetail] = await Promise.all([
    query({ startDate: ranges.previous.start, endDate: ranges.current.end, dimensions: ["date"], aggregationType: "byProperty" }),
    detail({ startDate: ranges.current.start, endDate: ranges.current.end, dimensions: ["query"], aggregationType: "byProperty", rowLimit: 25 }),
    detail({ startDate: ranges.current.start, endDate: ranges.current.end, dimensions: ["page"], aggregationType: "auto", rowLimit: 25 }),
  ]);
  const rows = parseSearchRows(dateResult);
  const daily = rows.filter((row) => row.date >= ranges.current.start && row.date <= ranges.current.end);
  const previous = rows.filter((row) => row.date >= ranges.previous.start && row.date <= ranges.previous.end);
  return {
    range: ranges.current, previousRange: ranges.previous, totals: searchTotals(daily), previous: searchTotals(previous), daily,
    queries: parseSearchDimensionRows(queryDetail.result, "query"), pages: parseSearchDimensionRows(pageDetail.result, "page"),
    detailsError: [queryDetail.error, pageDetail.error].filter(Boolean).join(" · ") || null,
    dataThrough: daily.at(-1)?.date ?? null,
  };
}

function vercelUrl(path: string) {
  const url = new URL(path, "https://api.vercel.com");
  const team = process.env.ANALYTICS_VERCEL_TEAM_ID?.trim();
  if (team) url.searchParams.set("teamId", team);
  return url;
}
function vercelHeaders() { return { Authorization: `Bearer ${process.env.ANALYTICS_VERCEL_TOKEN}` }; }

export function parseTrafficRows(result: Record<string, unknown>): Record<string, unknown>[] {
  if (!Array.isArray(result.data)) throw new Error("Invalid traffic rows");
  return result.data.map((row) => {
    if (!row || typeof row !== "object") throw new Error("Invalid traffic row");
    metric(row.pageviews); metric(row.visitors);
    return row;
  });
}
function trafficTotals(rows: Record<string, unknown>[]): TrafficTotals {
  // Production-only environment grouping gives one total; never sum daily visitors.
  if (rows.length > 1) throw new Error("Unexpected grouped totals");
  return { pageviews: rows.length ? metric(rows[0].pageviews) : 0, visitors: rows.length ? metric(rows[0].visitors) : 0 };
}
function cleanLabel(value: unknown, dimension: string): string {
  if (value == null || value === "") return dimension === "referrerHostname" ? "Direct / ไม่ระบุแหล่งที่มา" : "ไม่ระบุ";
  if (typeof value !== "string") throw new Error("Invalid dimension");
  // Only store aggregate public paths, never query strings or member/order identifiers.
  return (dimension === "requestPath" ? value.split(/[?#]/)[0] : value).slice(0, 240);
}

export async function fetchTrafficReport(days: PeriodDays, now = new Date()): Promise<TrafficReport> {
  const ranges = reportingRanges(days, "vercel", now);
  const query = async (range: DateRange, by: string) => {
    const url = vercelUrl("/v1/query/web-analytics/visits/aggregate");
    url.searchParams.set("projectId", process.env.ANALYTICS_VERCEL_PROJECT_ID!.trim());
    url.searchParams.set("since", `${range.start}T00:00:00.000Z`);
    url.searchParams.set("until", `${range.end}T23:59:59.999Z`);
    url.searchParams.set("by", by);
    url.searchParams.set("limit", by === "day" ? "60" : "10");
    url.searchParams.set("filter", "environment eq 'production' and not startswith(requestPath, '/admin') and not startswith(requestPath, '/warehouse') and not startswith(requestPath, '/member') and not startswith(requestPath, '/api') and not startswith(requestPath, '/register')");
    return parseTrafficRows(await fetchJson(url, { headers: vercelHeaders() }));
  };
  const [total, daily, pages, referrers, devices, countries, previous] = await Promise.all([
    query(ranges.current, "environment"), query(ranges.current, "day"), query(ranges.current, "requestPath"),
    query(ranges.current, "referrerHostname"), query(ranges.current, "deviceType"), query(ranges.current, "country"),
    query(ranges.previous, "environment").then((rows) => ({ value: trafficTotals(rows), error: null })).catch((error) => ({ value: null, error: safeAnalyticsError(error) })),
  ]);
  const breakdown = (rows: Record<string, unknown>[], key: string): TrafficRow[] => rows.map((row) => ({ label: cleanLabel(row[key], key), pageviews: metric(row.pageviews), visitors: metric(row.visitors) }));
  return {
    range: ranges.current, previousRange: ranges.previous, totals: trafficTotals(total), previous: previous.value, comparisonError: previous.error,
    daily: daily.map((row) => {
      if (typeof row.timestamp !== "string" || !Number.isFinite(Date.parse(row.timestamp))) throw new Error("Invalid traffic date");
      return { date: row.timestamp.slice(0, 10), pageviews: metric(row.pageviews), visitors: metric(row.visitors) };
    }).sort((a, b) => a.date.localeCompare(b.date)),
    pages: breakdown(pages, "requestPath"), referrers: breakdown(referrers, "referrerHostname"), devices: breakdown(devices, "deviceType"), countries: breakdown(countries, "country"),
  };
}

export async function fetchHealthReport(): Promise<HealthReport> {
  const checksPromise = Promise.all(["/", "/blog", "/robots.txt", "/sitemap.xml"].map(async (path) => {
    const start = Date.now();
    try {
      const response = await fetch(`${SITE}${path}`, { method: "GET", cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(10_000), headers: { "User-Agent": "Pod4U-HealthCheck/1.0" } });
      await response.body?.cancel();
      return { path, status: response.status, durationMs: Date.now() - start, ok: response.ok };
    } catch { return { path, status: null, durationMs: Date.now() - start, ok: false }; }
  }));
  let deploymentError: string | null = null;
  let deployments: HealthReport["deployments"] = [];
  if (providerConfig("vercel").configured) {
    try {
      const url = vercelUrl("/v6/deployments");
      url.searchParams.set("projectId", process.env.ANALYTICS_VERCEL_PROJECT_ID!.trim());
      url.searchParams.set("target", "production");
      url.searchParams.set("limit", "10");
      const result = await fetchJson(url, { headers: vercelHeaders() });
      if (!Array.isArray(result.deployments)) throw new Error("Invalid deployments");
      deployments = result.deployments.map((item) => ({
        id: String(item.uid), createdAt: new Date(item.createdAt ?? item.created).toISOString(), state: String(item.state ?? item.readyState),
        url: typeof item.url === "string" && /^[a-zA-Z0-9.-]+\.vercel\.app$/.test(item.url) ? `https://${item.url}` : null,
        commit: typeof item.meta?.githubCommitSha === "string" ? item.meta.githubCommitSha.slice(0, 7) : null,
      }));
    } catch (error) { deploymentError = safeAnalyticsError(error); }
  }
  return { checkedAt: new Date().toISOString(), checks: await checksPromise, deployments, deploymentError };
}
