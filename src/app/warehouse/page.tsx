"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Box, CheckCircle2, ChevronRight, Loader2, PackageCheck, Truck } from "lucide-react";
import { WarehouseHeader } from "@/components/warehouse/WarehouseHeader";

type Status = "ready_to_pack" | "packing" | "packed" | "problem" | "shipped";
interface Job { id: string; order_id: string; status: Status; assigned_to: string | null; problem_note: string | null; updated_at: string; order: { order_number: string; shipping_name: string; shipping_province: string; total: number | string; tracking_number: string | null; created_at: string } }
const TABS: Array<{ value: Status; label: string; icon: typeof Box }> = [
  { value: "ready_to_pack", label: "งานใหม่", icon: Box },
  { value: "packing", label: "กำลังแพ็ก", icon: PackageCheck },
  { value: "packed", label: "รอเลขพัสดุ", icon: CheckCircle2 },
  { value: "problem", label: "มีปัญหา", icon: AlertTriangle },
  { value: "shipped", label: "จัดส่งแล้ว", icon: Truck },
];

export default function WarehouseDashboard() {
  const [status, setStatus] = useState<Status>("ready_to_pack");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [counts, setCounts] = useState<Record<Status, number>>({ ready_to_pack: 0, packing: 0, packed: 0, problem: 0, shipped: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/warehouse/orders?status=${status}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "โหลดงานไม่สำเร็จ");
      setJobs(result.jobs ?? []);
      setCounts(result.counts ?? { ready_to_pack: 0, packing: 0, packed: 0, problem: 0, shipped: 0 });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "โหลดงานไม่สำเร็จ"); }
    finally { setLoading(false); }
  }, [status]);
  useEffect(() => { void load(); }, [load]);

  return <>
    <WarehouseHeader onRefresh={() => void load()} refreshing={loading} />
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6"><p className="text-sm font-black text-[#d4ff14]">งานจัดส่งวันนี้</p><h1 className="mt-1 text-3xl font-black">รายการแพ็กสินค้า</h1><p className="mt-2 text-sm text-white/55">แสดงเฉพาะออเดอร์ที่ตรวจสอบการชำระเงินแล้ว</p></div>
      <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {TABS.map(({ value, label, icon: Icon }) => <button key={value} type="button" onClick={() => setStatus(value)} className={`rounded-2xl border p-4 text-left transition ${status === value ? "border-[#d4ff14] bg-[#d4ff14] text-[#071126]" : "border-white/10 bg-white/[0.05] text-white hover:border-white/25"}`}><div className="flex items-center justify-between"><Icon className="h-5 w-5" /><strong className="text-2xl">{counts[value]}</strong></div><p className="mt-3 text-sm font-black">{label}</p></button>)}
      </div>
      {error && <p role="alert" className="mb-5 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">{error}</p>}
      {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#d4ff14]" /></div> : jobs.length === 0 ? <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] px-5 py-16 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-[#d4ff14]" /><p className="mt-4 text-xl font-black">ไม่มีงานในรายการนี้</p><p className="mt-2 text-sm text-white/50">กดรีเฟรชเพื่อตรวจสอบงานใหม่ได้ค่ะ</p></div> : <div className="space-y-3">{jobs.map((job) => <Link key={job.id} href={`/warehouse/orders/${job.order_id}`} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4 transition hover:border-[#d4ff14]/60 hover:bg-white/[0.08] sm:p-5"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="font-mono text-[#d4ff14]">{job.order.order_number}</strong>{job.status === "problem" && <span className="rounded-full bg-red-400/15 px-2 py-1 text-xs font-bold text-red-200">มีปัญหา</span>}</div><p className="mt-2 truncate font-bold">{job.order.shipping_name}</p><p className="mt-1 text-sm text-white/50">{job.order.shipping_province} · ฿{Number(job.order.total).toLocaleString("th-TH")}</p>{job.problem_note && <p className="mt-2 line-clamp-1 text-sm text-red-200">{job.problem_note}</p>}</div><ChevronRight className="h-6 w-6 shrink-0 text-white/35" /></Link>)}</div>}
    </main>
  </>;
}
