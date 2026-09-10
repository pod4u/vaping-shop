"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, ArrowUpRight, CheckCircle2, Clock3, Cloud, Globe2, Lightbulb, RefreshCw, Search, ShieldCheck, TriangleAlert } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  analyticsNotices, percentChange, shiftDate,
  type AnalyticsDashboard, type DateRange, type PeriodDays, type SearchDimensionRow, type SearchReport, type SourceStatus, type SourceView, type TrafficRow,
} from "@/lib/website-analytics";

const panel = "rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6";
const numbers = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 1 });
const time = (value: string | null | undefined) => value ? new Date(value).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" }) : "ยังไม่มี";
const format = (value: number | null | undefined) => value == null ? "—" : numbers.format(value);
const statusText: Record<SourceStatus, string> = { not_configured: "รอเชื่อมต่อ", pending: "รอซิงก์", ready: "มีข้อมูล", empty: "ไม่พบกิจกรรมในช่วงนี้", error: "ซิงก์ไม่สำเร็จ" };

function Status({ source }: { source: SourceView<unknown> }) {
  const good = source.status === "ready" || source.status === "empty";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${source.stale || source.status === "error" ? "bg-amber-400/10 text-amber-300" : good ? "bg-emerald-400/10 text-emerald-300" : "bg-white/5 text-white/60"}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" />{source.stale ? "ข้อมูลเก่า" : statusText[source.status]}
  </span>;
}

function Metric({ label, value, previous, hint, suffix = "" }: { label: string; value: number | null | undefined; previous?: number | null; hint: string; suffix?: string }) {
  const change = percentChange(value, previous);
  return <div className={panel}>
    <p className="text-sm text-white/60">{label}</p>
    <p className="mt-3 text-3xl font-semibold tracking-tight text-white tabular-nums">{format(value)}{value == null ? "" : suffix}</p>
    <p className="mt-2 text-xs text-white/60">{change == null ? "ยังเทียบช่วงก่อนหน้าไม่ได้" : `${change > 0 ? "+" : ""}${format(change)}% จากช่วงก่อนหน้า`}</p>
    <p className="mt-3 text-xs leading-relaxed text-white/40">{hint}</p>
  </div>;
}

function RangeLabel({ range }: { range?: DateRange }) {
  return <p className="mt-1 text-xs text-white/45">{range ? `${range.start} – ${range.end} · ${range.timezone}` : "วันที่จะแสดงหลังซิงก์สำเร็จ"}</p>;
}

function Trend({ title, rows, valueKey, color, range, comparison, markers = [] }: {
  title: string; rows?: { date: string; clicks?: number; pageviews?: number }[];
  valueKey: "clicks" | "pageviews"; color: string; range?: DateRange; comparison?: DateRange; markers?: string[];
}) {
  // Preserve absent dates as gaps; absence is not evidence of zero activity.
  const points = range ? Array.from({ length: Math.round((Date.parse(range.end) - Date.parse(range.start)) / 86400_000) + 1 }, (_, index) => {
    const date = shiftDate(range.start, index);
    return { date, [valueKey]: rows?.find((row) => row.date === date)?.[valueKey] ?? null };
  }) : [];
  return <section className={`${panel} min-w-0`}>
    <h2 className="font-medium text-white">{title}</h2><RangeLabel range={range} />
    {comparison && <p className="mt-1 text-xs text-white/45">ช่วงก่อนหน้า: {comparison.start} – {comparison.end}</p>}
    {rows?.length ? <div className="mt-6 h-56 w-full min-w-0" role="img" aria-label={`${title}: ${rows.length} วันที่มีข้อมูล`}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={points} margin={{ top: 14, right: 16, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="#ffffff0c" vertical={false} />
          <XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5)} tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={28} />
          <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 12, color: "#fff" }} labelFormatter={(label) => String(label)} />
          {[...new Set(markers)].filter((date) => range && date >= range.start && date <= range.end).map((date) => <ReferenceLine key={date} x={date} stroke="#a78bfa" strokeDasharray="3 3" label={{ value: "deploy", fill: "#a78bfa", fontSize: 10, position: "insideTopRight" }} />)}
          <Line type="linear" dataKey={valueKey} name={title} stroke={color} strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div> : <div className="flex h-56 items-center justify-center text-sm text-white/40">ยังไม่มีข้อมูลสำหรับกราฟนี้</div>}
  </section>;
}

function Breakdown({ title, rows }: { title: string; rows?: TrafficRow[] }) {
  return <section className={`${panel} min-w-0`}>
    <h2 className="font-medium text-white">{title}</h2>
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead><tr className="border-b border-white/10 text-xs text-white/45"><th className="pb-3 font-normal">รายการ</th><th className="pb-3 pl-3 text-right font-normal whitespace-nowrap">เปิดหน้า</th><th className="pb-3 pl-3 text-right font-normal whitespace-nowrap">ผู้เข้าชม</th></tr></thead>
        <tbody>{rows?.map((row, index) => <tr key={`${row.label}-${index}`} className="border-b border-white/5 last:border-0"><td className="max-w-[260px] break-all py-3 pr-3 text-white/80">{row.label}</td><td className="py-3 pl-3 text-right text-white tabular-nums">{format(row.pageviews)}</td><td className="py-3 pl-3 text-right text-white/55 tabular-nums">{format(row.visitors)}</td></tr>)}</tbody>
      </table>
      {!rows?.length && <p className="py-8 text-center text-sm text-white/40">ยังไม่มีข้อมูล</p>}
    </div>
  </section>;
}

function SearchBreakdown({ title, rows, pageLinks = false }: { title: string; rows?: SearchDimensionRow[]; pageLinks?: boolean }) {
  return <section className={`${panel} min-w-0`}>
    <h2 className="font-medium text-white">{title}</h2>
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead><tr className="border-b border-white/10 text-xs text-white/45"><th className="pb-3 font-normal">รายการ</th><th className="pb-3 pl-3 text-right font-normal">คลิก</th><th className="pb-3 pl-3 text-right font-normal">แสดงผล</th><th className="pb-3 pl-3 text-right font-normal">CTR</th><th className="pb-3 pl-3 text-right font-normal">อันดับ</th></tr></thead>
        <tbody>{rows?.map((row, index) => <tr key={`${row.label}-${index}`} className="border-b border-white/5 last:border-0"><td className="max-w-[300px] break-words py-3 pr-3 text-white/80">{pageLinks ? <a href={row.label} target="_blank" rel="noreferrer" className="underline decoration-white/20 underline-offset-4 hover:text-acid-lime">{row.label}</a> : row.label}</td><td className="py-3 pl-3 text-right text-white tabular-nums">{format(row.clicks)}</td><td className="py-3 pl-3 text-right text-white/65 tabular-nums">{format(row.impressions)}</td><td className="py-3 pl-3 text-right text-white/55 tabular-nums">{format(row.ctr * 100)}%</td><td className="py-3 pl-3 text-right text-white/55 tabular-nums">{format(row.position)}</td></tr>)}</tbody>
      </table>
      {!rows?.length && <p className="py-8 text-center text-sm leading-6 text-white/40">ยังไม่มีรายการที่ Google เปิดเผยในช่วงนี้<br />คำค้นปริมาณน้อยอาจถูกซ่อนเพื่อความเป็นส่วนตัว</p>}
    </div>
  </section>;
}

function seoActions(search?: SearchReport | null) {
  if (!search) return [];
  const queries = search.queries ?? [];
  if (!queries.length) return search.totals.impressions > 0 ? [{ title: "รอให้ข้อมูลคำค้นมากขึ้น", detail: "Google แสดงยอดรวมแล้ว แต่ยังไม่เปิดเผยคำค้นรายคำ อย่าเดาว่าคนค้นคำใดจากยอดรวมนี้" }] : [];
  const actions: { title: string; detail: string }[] = [];
  const nearPageOne = [...queries].filter((row) => row.position != null && row.position > 3 && row.position <= 20).sort((a, b) => b.impressions - a.impressions)[0];
  if (nearPageOne) actions.push({ title: `ขยับคำว่า “${nearPageOne.label}”`, detail: `มี ${format(nearPageOne.impressions)} impressions อันดับเฉลี่ย ${format(nearPageOne.position)} — ตรวจ title, H1 และเนื้อหาของหน้าที่ตรงกับคำนี้ก่อนเพิ่มบทความใหม่` });
  const lowCtr = [...queries].filter((row) => row.impressions >= 5 && row.ctr < 0.03).sort((a, b) => b.impressions - a.impressions)[0];
  if (lowCtr && lowCtr.label !== nearPageOne?.label) actions.push({ title: `ปรับข้อความค้นหาสำหรับ “${lowCtr.label}”`, detail: `มี ${format(lowCtr.impressions)} impressions แต่ CTR ${format(lowCtr.ctr * 100)}% — ตรวจว่า title และ description ตอบสิ่งที่คนค้นจริง` });
  if (!actions.length) actions.push({ title: "ติดตามต่อก่อนเปลี่ยนเนื้อหา", detail: "ยังไม่มีคำค้นที่มีข้อมูลพอให้ชี้จุดแก้ชัดเจน ดูแนวโน้มอย่างน้อย 2–4 สัปดาห์และอย่าตัดสินจากคลิกจำนวนน้อย" });
  return actions.slice(0, 3);
}

export function WebsiteAnalyticsDashboard() {
  const [days, setDays] = useState<PeriodDays>(7);
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const sequence = useRef(0);

  const load = useCallback(async () => {
    const id = ++sequence.current;
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/admin/analytics?days=${days}`, { cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 401 ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" : response.status === 403 ? "บัญชีนี้ไม่มีสิทธิ์ดูสถิติ" : "โหลดสถิติไม่สำเร็จ กรุณาลองใหม่");
      const result = await response.json() as AnalyticsDashboard;
      if (id === sequence.current) setData(result);
    } catch (err) {
      if (id === sequence.current) setError(err instanceof Error ? err.message : "โหลดสถิติไม่สำเร็จ");
    } finally { if (id === sequence.current) setLoading(false); }
  }, [days]);

  useEffect(() => { setData(null); void load(); return () => { sequence.current++; }; }, [load]);
  async function sync() {
    setSyncing(true); setError(null); setMessage(null);
    let failure: string | null = null;
    try {
      const response = await fetch("/api/admin/analytics/sync", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "ซิงก์ไม่สำเร็จ");
      setMessage(result.status === "success" ? "ซิงก์ข้อมูลครบแล้ว" : "ซิงก์เสร็จบางส่วน ดูสถานะของแต่ละแหล่งด้านล่าง");
    } catch (err) { failure = err instanceof Error ? err.message : "ซิงก์ไม่สำเร็จ"; }
    await load();
    if (failure) setError(failure);
    setSyncing(false);
  }

  const notices = data ? analyticsNotices(data) : [];
  const traffic = data?.vercel.data;
  const search = data?.google.data;
  const health = data?.health.data;
  const actions = seoActions(search);
  return <div className="mx-auto max-w-[1500px] space-y-6 p-4 text-white sm:p-8">
    <header className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
      <div><p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-acid-lime"><Activity size={15} /> Website overview</p><h1 className="mt-3 text-2xl font-semibold sm:text-3xl">สถิติและสถานะเว็บไซต์</h1><p className="mt-2 text-sm text-white/55">ภาพรวมการเข้าใช้งาน ข้อมูลจาก Google และผลตรวจเว็บไซต์</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-white/10 p-1" aria-label="ช่วงเวลา">{([7, 28] as const).map((value) => <button key={value} onClick={() => setDays(value)} disabled={syncing} aria-pressed={days === value} className={`rounded-lg px-3 py-2 text-sm disabled:opacity-50 ${days === value ? "bg-white/10 text-white" : "text-white/50"}`}>{value} วัน</button>)}</div>
        <button onClick={() => void load()} disabled={loading || syncing} className="rounded-xl border border-white/10 px-3 py-3 text-sm text-white/65 disabled:opacity-40">โหลดใหม่</button>
        <button onClick={() => void sync()} disabled={syncing || loading || !data?.storageReady} className="flex items-center gap-2 rounded-xl bg-acid-lime px-4 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"><RefreshCw size={16} className={syncing ? "animate-spin" : ""} />{syncing ? "กำลังซิงก์…" : "ซิงก์ข้อมูล"}</button>
      </div>
    </header>

    {error && <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}
    {message && <div role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">{message}</div>}
    {loading && !data && <div className={`${panel} animate-pulse py-16 text-center text-white/50`} role="status">กำลังโหลดสถานะการเชื่อมต่อและสถิติ…</div>}
    {data && <>
      {(!data.storageReady || !data.google.configured || !data.vercel.configured) && <div className="flex flex-col justify-between gap-3 rounded-xl border border-sky-400/20 bg-sky-400/5 p-4 sm:flex-row sm:items-center"><div><p className="text-sm font-medium text-sky-100">Dashboard พร้อมสำหรับการตั้งค่า</p><p className="mt-1 text-xs leading-6 text-white/60">{!data.storageReady ? "ติดตั้งตารางสถิติก่อน แล้วเชื่อมบัญชีเพื่อเริ่มซิงก์ข้อมูลจริง" : "ยังมีแหล่งข้อมูลที่รอเชื่อมต่อ ดูขั้นตอนและตัวแปรที่ต้องตั้งค่าได้ด้านล่าง"}</p></div><a href="#connections" className="shrink-0 text-sm text-sky-300 underline underline-offset-4">ดูวิธีเชื่อมต่อ</a></div>}
      <section className="grid gap-3 lg:grid-cols-3">
        {([{ title: "Google Search Console", source: data.google, icon: Search }, { title: "Vercel Web Analytics", source: data.vercel, icon: Cloud }, { title: "ผลตรวจเว็บไซต์", source: data.health, icon: ShieldCheck }]).map(({ title, source, icon: Icon }) => <div key={title} className={panel}><div className="flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-2 text-sm font-medium"><Icon size={16} className="text-white/50" />{title}</span><Status source={source} /></div><p className="mt-4 text-xs leading-6 text-white/45">ซิงก์สำเร็จล่าสุด: {time(source.lastSuccessAt)}<br />ลองซิงก์ล่าสุด: {time(source.lastAttemptAt)}</p>{source.error && <p className="mt-2 text-xs text-amber-200">{source.error}</p>}</div>)}
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="ผู้เข้าชมเว็บไซต์" value={traffic?.totals.visitors} previous={traffic?.previous?.visitors} hint="ค่าผู้เข้าชมรวมจาก Vercel ในช่วงที่เลือก" />
        <Metric label="จำนวนเปิดหน้า" value={traffic?.totals.pageviews} previous={traffic?.previous?.pageviews} hint="คนเดียวเปิดหลายหน้าหรือเปิดซ้ำได้" />
        <Metric label="คลิกจาก Google" value={search?.totals.clicks} previous={search?.previous.clicks} hint="เฉพาะการค้นหาเว็บใน Google Search" />
        <Metric label="การแสดงผลบน Google" value={search?.totals.impressions} previous={search?.previous.impressions} hint="จำนวนครั้งที่มีการแสดงผล ไม่ใช่จำนวนคนเข้าเว็บ" />
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Trend title="จำนวนเปิดหน้ารายวัน" rows={traffic?.daily} range={traffic?.range} comparison={traffic?.previousRange} valueKey="pageviews" color="#c8ff31" markers={health?.deployments.filter((item) => item.state === "READY").map((item) => item.createdAt.slice(0, 10))} />
        <Trend title="คลิกจาก Google รายวัน" rows={search?.daily} range={search?.range} comparison={search?.previousRange} valueKey="clicks" color="#a78bfa" />
      </div>
      <p className="text-xs leading-6 text-white/45">Google ใช้ข้อมูล final และเว้น 3 วันล่าสุด ส่วน Vercel ใช้วันเต็มตาม UTC จึงอาจมีช่วงวันที่ต่างกัน · ช่องว่างในกราฟหมายถึงไม่มีแถวข้อมูล · เส้น deploy แสดงวันที่สร้าง deployment ที่มีสถานะ Ready ตาม UTC ไม่ใช่เวลาที่ผู้ใช้ทุกคนเริ่มเห็นเวอร์ชันนั้น</p>
      {search && <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-white/65"><span>CTR: {format(search.totals.ctr * 100)}%</span><span>อันดับเฉลี่ย: {format(search.totals.position)}</span><span>วันที่ล่าสุดที่ Google ส่งแถวข้อมูล: {search.dataThrough ?? "ยังไม่มี"}</span></div>}

      <div><h2 className="flex items-center gap-2 text-lg font-medium"><Search size={19} />คนค้นหาอะไรใน Google</h2><RangeLabel range={search?.range} /><p className="mt-2 text-xs leading-6 text-white/45">ตารางคำค้นและหน้าปลายทางเป็นข้อมูลที่ Google เปิดเผย ไม่จำเป็นต้องรวมเท่ากับยอดด้านบน เพราะ Google ซ่อนคำค้นบางส่วนเพื่อความเป็นส่วนตัว</p></div>
      <div className="grid gap-5 xl:grid-cols-2"><SearchBreakdown title="คำค้นที่พาให้เว็บไซต์ปรากฏ" rows={search?.queries} /><SearchBreakdown title="หน้าที่ปรากฏใน Google" rows={search?.pages} pageLinks /></div>

      <section className={panel}>
        <h2 className="flex items-center gap-2 text-lg font-medium"><Lightbulb size={19} className="text-acid-lime" />ควรทำอะไรต่อ</h2>
        {actions.length ? <div className="mt-4 grid gap-3 lg:grid-cols-2">{actions.map((action, index) => <div key={index} className="rounded-xl border border-acid-lime/10 bg-acid-lime/[0.035] p-4"><p className="text-sm font-medium">{action.title}</p><p className="mt-2 text-xs leading-6 text-white/55">{action.detail}</p></div>)}</div> : <p className="mt-4 text-sm text-white/60">ยังไม่มีข้อมูล Google มากพอสำหรับจัดลำดับงาน</p>}
      </section>

      <section className={panel}>
        <h2 className="flex items-center gap-2 text-lg font-medium"><TriangleAlert size={19} className="text-amber-300" />สิ่งที่ต้องตรวจต่อ</h2>
        {notices.length ? <div className="mt-4 grid gap-3 lg:grid-cols-2">{notices.map((notice, index) => <div key={index} className={`rounded-xl border p-4 ${notice.level === "warning" ? "border-amber-400/15 bg-amber-400/5" : "border-white/5 bg-white/[0.02]"}`}><p className="text-sm font-medium">{notice.title}</p><p className="mt-2 text-xs leading-6 text-white/55">{notice.detail}</p></div>)}</div> : <p className="mt-4 text-sm text-white/60">ยังไม่พบข้อเตือนจากข้อมูลที่มี ผลนี้ครอบคลุมเฉพาะรายการที่ตรวจและเวลาซิงก์ล่าสุด</p>}
      </section>

      <div><h2 className="flex items-center gap-2 text-lg font-medium"><Globe2 size={19} />การเข้าใช้งานเว็บไซต์</h2><RangeLabel range={traffic?.range} /><p className="mt-2 text-xs leading-6 text-white/45">ข้อมูลรวมไม่ระบุตัวตน · ผู้เข้าชมในแต่ละแถวอาจซ้ำกัน ห้ามนำมาบวกเป็นยอดรวม · Direct อาจรวมแอปที่ไม่ส่ง referrer จึงระบุว่าเป็น LINE ทั้งหมดไม่ได้</p></div>
      <div className="grid gap-5 xl:grid-cols-2"><Breakdown title="หน้าที่มีการเปิด" rows={traffic?.pages} /><Breakdown title="แหล่งที่มา" rows={traffic?.referrers} /><Breakdown title="อุปกรณ์" rows={traffic?.devices} /><Breakdown title="ประเทศ" rows={traffic?.countries} /></div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className={panel}><h2 className="font-medium">ผลตรวจ HTTP</h2><p className="mt-2 text-xs leading-6 text-white/45">ตรวจเมื่อซิงก์: {time(health?.checkedAt)}<br />เวลาในตารางคือเวลารอ HTTP จากเซิร์ฟเวอร์ ไม่ใช่ Core Web Vitals หรือเวลาที่หน้าแสดงครบในมือถือ</p>
          <div className="mt-4 divide-y divide-white/5">{health?.checks.map((check) => <div key={check.path} className="flex items-center justify-between gap-3 py-3 text-sm"><span className="flex items-center gap-2">{check.ok ? <CheckCircle2 size={16} className="text-emerald-300" /> : <TriangleAlert size={16} className="text-amber-300" />}{check.path}</span><span className="text-white/55">{check.status ?? "Timeout"} · {format(check.durationMs)} ms</span></div>)}{!health && <p className="py-8 text-center text-sm text-white/40">ยังไม่ได้ตรวจเว็บไซต์</p>}</div>
          <p className="mt-4 text-xs leading-6 text-white/40">เป็นผลตรวจเป็นครั้ง ๆ ยังไม่มี uptime monitoring ต่อเนื่องหรือการรวบรวม runtime error logs</p>
        </section>
        <section className={panel}><h2 className="font-medium">Production deployments ล่าสุด</h2><div className="mt-4 divide-y divide-white/5">{health?.deployments.map((deployment) => <div key={deployment.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><div><p>{deployment.state} <span className="font-mono text-xs text-white/45">{deployment.commit ?? "ไม่ระบุ commit"}</span></p><p className="mt-1 text-xs text-white/45">{time(deployment.createdAt)}</p></div>{deployment.url && <a href={deployment.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-acid-lime">เปิด deployment <ArrowUpRight size={14} /></a>}</div>)}{!health?.deployments.length && <p className="py-8 text-center text-sm text-white/40">ยังไม่มีข้อมูล deployment</p>}</div></section>
      </div>

      <section className={panel}><h2 className="flex items-center gap-2 font-medium"><Clock3 size={17} />ประวัติซิงก์</h2><p className="mt-2 text-xs text-white/45">ตารางอัตโนมัติวันละครั้งช่วง 05:00 น. กรุงเทพฯ หลังตั้งค่าและ deploy; เวลาจริงขึ้นกับแพ็กเกจ Vercel</p>
        <div className="mt-4 space-y-2">{data.runs.slice(0, 6).map((run) => <details key={run.id} className="rounded-xl bg-white/[0.025] p-3"><summary className="cursor-pointer text-sm text-white/70">{time(run.started_at)} · {({ success: "สำเร็จ", partial: "สำเร็จบางส่วน", running: "กำลังซิงก์ / รอสรุปผล", error: "ไม่สำเร็จ" } as Record<string, string>)[run.status] ?? run.status}</summary><ul className="mt-3 space-y-2 text-xs text-white/50">{run.outcomes.map((outcome, index) => <li key={index}>{outcome.source} {outcome.days ? `${outcome.days} วัน` : ""} · {outcome.status === "success" ? "สำเร็จ" : outcome.message ?? "ไม่สำเร็จ"}</li>)}</ul></details>)}{!data.runs.length && <p className="py-5 text-sm text-white/40">ยังไม่มีประวัติซิงก์</p>}</div>
      </section>

      <details className={panel} id="connections" open={!data.storageReady || !data.google.configured || !data.vercel.configured}><summary className="cursor-pointer text-lg font-medium">การเชื่อมต่อและตั้งค่า <span className="ml-2 text-sm font-normal text-emerald-300">{data.storageReady && data.google.configured && data.vercel.configured && data.scheduleConfigured ? "พร้อมใช้งาน" : "ต้องตรวจเพิ่ม"}</span></summary><p className="mt-3 text-sm leading-6 text-white/55">ตั้งค่าใน Vercel → Project → Settings → Environment Variables แล้ว deploy เวอร์ชันที่มีค่านั้น จากนั้นกลับมากดซิงก์ข้อมูล</p>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-white/10 p-4"><h3 className="font-medium">Google Search Console</h3><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-white/60"><li>เปิด Search Console API ใน Google Cloud และสร้าง service account</li><li>เพิ่มอีเมล service account ในสิทธิ์ผู้ใช้ของ property ที่ยืนยันแล้ว ให้สิทธิ์อ่านรายงาน</li><li>ตั้งค่าตัวแปรด้านล่าง โดย private key เก็บเป็น Secret ฝั่งเซิร์ฟเวอร์</li></ol><div className="mt-3 space-y-1 break-all font-mono text-xs text-white/50"><p>GSC_PROPERTY=sc-domain:pod4u.store</p><p>GSC_SERVICE_ACCOUNT_EMAIL</p><p>GSC_SERVICE_ACCOUNT_PRIVATE_KEY</p></div><a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="mt-4 inline-block text-xs text-acid-lime">เปิด Search Console ↗</a></div>
          <div className="rounded-xl border border-white/10 p-4"><h3 className="font-medium">Vercel Web Analytics</h3><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-white/60"><li>เปิด Web Analytics ในโปรเจกต์ และสร้าง access token ที่มีสิทธิ์อ่านโปรเจกต์นี้</li><li>คัดลอก Project ID และ Team ID จาก Settings</li><li>ตรวจแพ็กเกจที่รองรับช่วงข้อมูลย้อนหลัง หากอ่านช่วงก่อนหน้าไม่ได้ ระบบจะแสดงเหตุผล</li></ol><div className="mt-3 space-y-1 break-all font-mono text-xs text-white/50"><p>ANALYTICS_VERCEL_TOKEN</p><p>ANALYTICS_VERCEL_PROJECT_ID</p><p>ANALYTICS_VERCEL_TEAM_ID</p></div><a href="https://vercel.com/docs/analytics/web-analytics-api" target="_blank" rel="noreferrer" className="mt-4 inline-block text-xs text-acid-lime">คู่มือ API ของ Vercel ↗</a></div>
        </div>
        <p className="mt-5 text-xs leading-6 text-white/50">ฐานข้อมูล: {data.storageReady ? "พร้อมใช้งาน" : "รอติดตั้ง migration / ตรวจการเชื่อมต่อ"} · CRON_SECRET: {data.scheduleConfigured ? "ตั้งค่าแล้ว (ตรวจการทำงานจากประวัติซิงก์)" : "ยังไม่ได้ตั้งค่า"}<br />คู่มือติดตั้งสำหรับผู้พัฒนาอยู่ใน docs/website-analytics-setup.md · ห้ามตั้งชื่อคีย์ลับด้วย NEXT_PUBLIC_</p>
      </details>
      <p className="pb-3 text-xs leading-6 text-white/35">อัปเดตหน้าจอ: {time(data.generatedAt)} · สถิตินี้ไม่ระบุชื่อ อีเมล หรือบัญชีของผู้เข้าชม และไม่เชื่อมกับข้อมูลสมาชิก</p>
    </>}
  </div>;
}
