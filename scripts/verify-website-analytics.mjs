import assert from "node:assert/strict";
import { createRequire, Module } from "node:module";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { generateKeyPairSync } from "node:crypto";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = resolve(dirname(new URL(import.meta.url).pathname), "..");
let fakeDatabase;
const modules = new Map();
function load(relative) {
  const filename = resolve(root, relative);
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = new Module(filename);
  module.filename = filename;
  module.paths = Module._nodeModulePaths(dirname(filename));
  module.require = (id) => {
    if (id === "server-only") return {};
    if (id === "@/lib/supabase") return { getUncachedServerSupabase: () => fakeDatabase };
    if (id.startsWith("@/")) return load(`src/${id.slice(2)}.ts`);
    return require(id);
  };
  modules.set(filename, module);
  module._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, filename);
  return module.exports;
}
const core = load("src/lib/website-analytics.ts");
const provider = load("src/lib/website-analytics-providers.ts");
const service = load("src/lib/website-analytics-service.ts");
const permissions = load("src/lib/admin-permissions.ts");
let passed = 0;
async function test(name, callback) { await callback(); passed++; console.log(`PASS ${name}`); }
const now = new Date("2026-09-10T12:00:00Z");
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const originalFetch = globalThis.fetch;
const envKeys = ["GSC_SERVICE_ACCOUNT_EMAIL", "GSC_SERVICE_ACCOUNT_PRIVATE_KEY", "GSC_PROPERTY", "ANALYTICS_VERCEL_TOKEN", "ANALYTICS_VERCEL_PROJECT_ID", "ANALYTICS_VERCEL_TEAM_ID", "CRON_SECRET"];
const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
for (const key of envKeys) delete process.env[key];

try {
  await test("UTC and Pacific reporting windows exclude incomplete days and compare equal periods", () => {
    assert.deepEqual(core.reportingRanges(7, "vercel", now).current, { start: "2026-09-03", end: "2026-09-09", timezone: "UTC" });
    const google = core.reportingRanges(7, "google", new Date("2026-09-10T01:00:00Z"));
    assert.equal(google.current.end, "2026-09-06");
    assert.equal(google.previous.end, core.shiftDate(google.current.start, -1));
    assert.equal(core.shiftDate("2024-03-01", -1), "2024-02-29");
    assert.equal(core.reportingRanges(28, "google", new Date("2026-03-10T08:00:00Z")).current.start, "2026-02-08");
  });
  await test("Zero baselines and missing data never fabricate growth", () => {
    assert.equal(core.percentChange(7, 0), null);
    assert.equal(core.percentChange(undefined, 10), null);
    assert.equal(core.percentChange(0, 10), -100);
    assert.equal(core.percentChange(15, 10), 50);
  });
  await test("Search totals use weighted rank and a recomputed CTR", () => {
    const totals = core.searchTotals([{ clicks: 2, impressions: 10, ctr: .2, position: 2 }, { clicks: 9, impressions: 90, ctr: .1, position: 10 }]);
    assert.equal(totals.ctr, .11);
    assert.equal(totals.position, 9.2);
    assert.equal(core.searchTotals([]).position, null);
  });
  await test("Provider schemas distinguish empty data from corrupt payloads", () => {
    assert.deepEqual(provider.parseSearchRows({}), []);
    assert.throws(() => provider.parseSearchRows({ rows: [{}] }));
    assert.deepEqual(provider.parseSearchDimensionRows({ rows: [{ keys: ["mbar"], clicks: 1, impressions: 10, ctr: .1, position: 7 }] }, "query")[0].label, "mbar");
    assert.equal(provider.parseSearchDimensionRows({ rows: [{ keys: ["https://www.pod4u.store/products/mbar-10k?source=google"], clicks: 1, impressions: 10, ctr: .1, position: 7 }] }, "page")[0].label, "/products/mbar-10k");
    assert.throws(() => provider.parseSearchDimensionRows({ rows: [{ keys: ["https://evil.example/"], clicks: 1, impressions: 1, ctr: 1, position: 1 }] }, "page"));
    assert.deepEqual(provider.parseTrafficRows({ data: [] }), []);
    assert.throws(() => provider.parseTrafficRows({}));
    assert.throws(() => provider.parseTrafficRows({ data: [{ visitors: 1, pageviews: Infinity }] }));
    assert.throws(() => provider.parseTrafficRows({ data: [{ visitors: 1, pageviews: -1 }] }));
  });
  await test("Only owner and manager have analytics permission", () => {
    for (const role of ["owner", "manager"]) assert.equal(permissions.roleHasPermission(role, "analytics.view"), true);
    for (const role of ["support", "stock_staff", "order_staff"]) assert.equal(permissions.roleHasPermission(role, "analytics.view"), false);
  });
  await test("Missing credentials remain explicitly unconfigured", () => {
    const source = service.buildSourceView("google", 7, [], []);
    assert.equal(source.status, "not_configured");
    assert.equal(source.data, null);
    assert(source.missing.includes("GSC_SERVICE_ACCOUNT_PRIVATE_KEY"));
  });
  await test("Missing migration gives an honest unavailable state, not invented zero metrics", async () => {
    fakeDatabase = { from: () => { throw new Error("Database secret which must not be leaked"); } };
    const report = await service.getAnalyticsDashboard(7);
    assert.equal(report.storageReady, false);
    assert.equal(report.vercel.data, null);
    assert(!JSON.stringify(report).includes("Database secret"));
  });
  process.env.ANALYTICS_VERCEL_TOKEN = "test-only-token";
  process.env.ANALYTICS_VERCEL_PROJECT_ID = "test-project";
  process.env.ANALYTICS_VERCEL_TEAM_ID = "test-team";
  let traffic;
  await test("Vercel totals are queried once per range, private routes filtered, visitors never summed", async () => {
    const queries = [];
    globalThis.fetch = async (input, init) => {
      const url = new URL(input);
      queries.push(url);
      assert.equal(url.origin, "https://api.vercel.com");
      assert.equal(init.headers.Authorization, "Bearer test-only-token");
      const by = url.searchParams.get("by");
      const filter = url.searchParams.get("filter");
      for (const path of ["/admin", "/warehouse", "/member", "/api", "/register"]) assert(filter.includes(path));
      const rows = by === "environment" ? [{ environment: "production", visitors: 8, pageviews: 30 }]
        : by === "day" ? [{ timestamp: "2026-09-03T00:00:00Z", visitors: 7, pageviews: 15 }, { timestamp: "2026-09-04T00:00:00Z", visitors: 7, pageviews: 15 }]
          : [{ [by]: by === "requestPath" ? "/blog?secret=do-not-store" : by === "referrerHostname" ? "" : "TH", visitors: 8, pageviews: 30 }];
      return reply({ data: rows });
    };
    traffic = await provider.fetchTrafficReport(7, now);
    assert.equal(traffic.totals.visitors, 8);
    assert.equal(traffic.daily.reduce((sum, row) => sum + row.visitors, 0), 14);
    assert.equal(traffic.pages[0].label, "/blog");
    assert.equal(traffic.referrers[0].label, "Direct / ไม่ระบุแหล่งที่มา");
    assert.equal(queries.length, 7);
    assert(!JSON.stringify(traffic).includes("secret"));
  });
  await test("Previous-period plan failure preserves current Vercel data", async () => {
    const originalMock = globalThis.fetch;
    globalThis.fetch = async (url, init) => new URL(url).searchParams.get("since").startsWith("2026-08") ? reply({ error: { message: "Invalid request: the hobby plan only grants access to the latest 31 days of data. private upstream" } }, 400) : originalMock(url, init);
    const report = await provider.fetchTrafficReport(7, now);
    assert.equal(report.totals.visitors, 8);
    assert.equal(report.previous, null);
    assert(report.comparisonError);
    assert(report.comparisonError.includes("31"));
    assert(!report.comparisonError.includes("private upstream"));
  });
  await test("HTTP errors and timeouts do not escape as successful empty reports or leak upstream bodies", async () => {
    for (const status of [401, 403, 429, 500]) {
      globalThis.fetch = async () => reply({ token: "DO_NOT_LEAK" }, status);
      await assert.rejects(() => provider.fetchTrafficReport(7, now), (error) => !provider.safeAnalyticsError(error).includes("DO_NOT_LEAK"));
    }
    globalThis.fetch = async () => { throw new Error("network path containing secret"); };
    await assert.rejects(() => provider.fetchTrafficReport(7, now), (error) => !provider.safeAnalyticsError(error).includes("secret"));
  });
  let search;
  await test("GSC uses read-only service account scope and final date-only property totals", async () => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
    process.env.GSC_SERVICE_ACCOUNT_EMAIL = "test@example.invalid";
    process.env.GSC_SERVICE_ACCOUNT_PRIVATE_KEY = privateKey;
    process.env.GSC_PROPERTY = "sc-domain:pod4u.store";
    const searchRequests = [];
    globalThis.fetch = async (url, init) => {
      if (String(url).includes("oauth2.googleapis.com")) {
        const assertion = new URLSearchParams(init.body).get("assertion");
        const claim = JSON.parse(Buffer.from(assertion.split(".")[1], "base64url").toString());
        assert.equal(claim.scope, "https://www.googleapis.com/auth/webmasters.readonly");
        return reply({ access_token: "test-google-token" });
      }
      const request = JSON.parse(init.body);
      searchRequests.push(request);
      assert.equal(request.dataState, "final");
      if (request.dimensions[0] === "date") {
        assert.equal(request.aggregationType, "byProperty");
        assert.equal(request.startDate, "2026-08-25");
        return reply({ rows: [{ keys: ["2026-09-03"], clicks: 3, impressions: 50, ctr: .06, position: 5 }, { keys: ["2026-08-26"], clicks: 1, impressions: 20, ctr: .05, position: 8 }] });
      }
      assert.equal(request.startDate, "2026-09-01");
      if (request.dimensions[0] === "query") return reply({ rows: [{ keys: ["mbar"], clicks: 2, impressions: 25, ctr: .08, position: 6 }] });
      assert.equal(request.aggregationType, "auto");
      return reply({ rows: [{ keys: ["https://www.pod4u.store/products/mbar-10k"], clicks: 2, impressions: 25, ctr: .08, position: 6 }] });
    };
    search = await provider.fetchSearchReport(7, now);
    assert.equal(search.totals.clicks, 3);
    assert.equal(search.previous.clicks, 1);
    assert.equal(search.dataThrough, "2026-09-03");
    assert.equal(search.queries[0].label, "mbar");
    assert.equal(search.pages[0].label, "/products/mbar-10k");
    assert.deepEqual(searchRequests.map((request) => request.dimensions[0]).sort(), ["date", "page", "query"]);
  });
  await test("GSC detail failure keeps trustworthy property totals", async () => {
    globalThis.fetch = async (url, init) => {
      if (String(url).includes("oauth2.googleapis.com")) return reply({ access_token: "test-google-token" });
      const request = JSON.parse(init.body);
      if (request.dimensions[0] === "date") return reply({ rows: [{ keys: ["2026-09-03"], clicks: 3, impressions: 50, ctr: .06, position: 5 }] });
      return reply({ private: "DO_NOT_LEAK" }, 403);
    };
    const report = await provider.fetchSearchReport(7, now);
    assert.equal(report.totals.impressions, 50);
    assert.deepEqual(report.queries, []);
    assert.deepEqual(report.pages, []);
    assert(report.detailsError);
    assert(!report.detailsError.includes("DO_NOT_LEAK"));
  });
  await test("A later failed sync retains last successful report and flags stale data", () => {
    const snapshot = { source: "vercel", scope_key: provider.providerConfig("vercel").scopeKey, period_days: 7, fetched_at: new Date(Date.now() - 48 * 3600_000).toISOString(), payload: traffic };
    const runs = [{ started_at: new Date().toISOString(), outcomes: [{ source: "vercel", scopeKey: provider.providerConfig("vercel").scopeKey, days: 7, status: "error", message: "API failed safely" }] }];
    const source = service.buildSourceView("vercel", 7, [snapshot], runs);
    assert.equal(source.status, "error");
    assert.equal(source.stale, true);
    assert.equal(source.data.totals.visitors, 8);
    process.env.ANALYTICS_VERCEL_PROJECT_ID = "other-project";
    assert.equal(service.buildSourceView("vercel", 7, [snapshot], []).data, null);
    assert.equal(service.buildSourceView("vercel", 7, [snapshot], runs).error, null);
    process.env.ANALYTICS_VERCEL_PROJECT_ID = "test-project";
  });
  await test("Successful zero activity remains an empty report with real zero totals", () => {
    const empty = { ...traffic, totals: { visitors: 0, pageviews: 0 } };
    const source = service.buildSourceView("vercel", 7, [{ source: "vercel", scope_key: provider.providerConfig("vercel").scopeKey, period_days: 7, fetched_at: new Date().toISOString(), payload: empty }], []);
    assert.equal(source.status, "empty");
    assert.equal(source.data.totals.visitors, 0);
  });
  await test("Fixed-target health checks record failure without accepting arbitrary URLs", async () => {
    delete process.env.ANALYTICS_VERCEL_TOKEN;
    const urls = [];
    globalThis.fetch = async (url) => { urls.push(String(url)); return reply({}, String(url).endsWith("sitemap.xml") ? 503 : 200); };
    const health = await provider.fetchHealthReport();
    assert.equal(health.checks.length, 4);
    assert(health.checks.some((row) => row.status === 503 && !row.ok));
    assert(urls.every((url) => url.startsWith("https://www.pod4u.store/")));
    assert.equal(health.deployments.length, 0);
  });
  await test("Overlapping sync is rejected before contacting providers", async () => {
    fakeDatabase = { rpc: async () => ({ data: null, error: null }) };
    globalThis.fetch = async () => { throw new Error("Must not contact a provider"); };
    await assert.rejects(service.syncWebsiteAnalytics, (error) => error.status === 429);
  });
  await test("Sync stores healthy sources, skips unconfigured ones and leaves failed snapshots untouched", async () => {
    for (const key of envKeys) delete process.env[key];
    process.env.ANALYTICS_VERCEL_TOKEN = "test-only-token";
    process.env.ANALYTICS_VERCEL_PROJECT_ID = "test-project";
    const saved = [];
    let finalized;
    fakeDatabase = {
      rpc: async () => ({ data: "test-run", error: null }),
      from: (table) => ({
        upsert: async (row) => { saved.push(row); return { error: null }; },
        update: (row) => ({ eq: async () => { finalized = row; return { error: null }; } }),
        delete: () => ({ neq: () => ({ lt: async () => ({ error: null }) }) }),
      }),
    };
    globalThis.fetch = async (url) => String(url).startsWith("https://api.vercel.com") ? reply({ private: "DO_NOT_LEAK" }, 403) : reply({});
    const run = await service.syncWebsiteAnalytics();
    assert.equal(run.status, "partial");
    assert.equal(saved.length, 1);
    assert.equal(saved[0].source, "health");
    assert.equal(finalized.outcomes.filter((row) => row.status === "skipped").length, 2);
    assert.equal(finalized.outcomes.filter((row) => row.status === "error").length, 2);
    assert(!JSON.stringify(finalized).includes("DO_NOT_LEAK"));
  });

  if (process.argv.includes("--write-fixture")) {
    const source = (data) => ({ status: "ready", configured: true, missing: [], lastSuccessAt: new Date().toISOString(), lastAttemptAt: new Date().toISOString(), error: null, stale: false, data });
    const fixture = {
      days: 7, generatedAt: new Date().toISOString(), storageReady: true, storageError: null, scheduleConfigured: true,
      google: source(search), vercel: source(traffic), health: source({ checkedAt: new Date().toISOString(), checks: [{ path: "/", ok: true, status: 200, durationMs: 160 }], deployments: [{ id: "test", createdAt: "2026-09-04T12:00:00Z", state: "READY", commit: "TEST123", url: null }], deploymentError: null }), runs: [],
    };
    const directory = resolve(root, "output/playwright");
    mkdirSync(directory, { recursive: true });
    writeFileSync(resolve(directory, "analytics-fixture.json"), JSON.stringify(fixture));
    console.log("Wrote explicitly synthetic browser-test fixture to ignored output/playwright/");
  }
  console.log(`${passed} analytics checks passed (mock providers/database, no production writes).`);
} finally {
  globalThis.fetch = originalFetch;
  for (const key of envKeys) {
    if (originalEnv[key] === undefined) delete process.env[key]; else process.env[key] = originalEnv[key];
  }
}
