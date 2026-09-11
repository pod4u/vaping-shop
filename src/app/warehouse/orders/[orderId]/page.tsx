"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, MapPin, PackageCheck, Phone, Play, Truck } from "lucide-react";
import { WarehouseHeader } from "@/components/warehouse/WarehouseHeader";

interface Job { status: "ready_to_pack" | "packing" | "packed" | "problem" | "shipped"; assigned_to: string | null; problem_code: string | null; problem_note: string | null }
interface Order { id: string; order_number: string; status: string; shipping_name: string; shipping_phone: string; shipping_address: string; shipping_province: string; shipping_postal_code: string | null; total: number | string; carrier: string | null; tracking_number: string | null; created_at: string }
interface Item { id: string; brand_name: string; product_name: string; flavor_name: string; variant_key: string; sku: string; quantity: number }
const CARRIERS = ["Flash Express", "ไปรษณีย์ไทย / EMS", "KEX Express", "J&T Express", "BEST Express", "Ninja Van"];
const PROBLEMS = [
  ["item_missing", "สินค้าไม่พบ"], ["quantity_mismatch", "จำนวนสินค้าไม่ตรง"], ["damaged", "สินค้าชำรุด"],
  ["address_unclear", "ที่อยู่ไม่ชัดเจน"], ["shipping_unavailable", "ไม่สามารถจัดส่งได้"], ["other", "อื่น ๆ"],
];

export default function WarehouseOrderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [problemCode, setProblemCode] = useState("item_missing");
  const [problemNote, setProblemNote] = useState("");
  const [showProblem, setShowProblem] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/warehouse/orders/${orderId}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "โหลดงานไม่สำเร็จ");
      setJob(result.job); setOrder(result.order); setItems(result.items ?? []);
      setCarrier(result.order.carrier ?? ""); setTrackingNumber(result.order.tracking_number ?? "");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "โหลดงานไม่สำเร็จ"); }
    finally { setLoading(false); }
  }, [orderId]);
  useEffect(() => { void load(); }, [load]);

  const totalUnits = useMemo(() => items.reduce((sum, item) => sum + Number(item.quantity), 0), [items]);

  async function action(name: "start" | "pack" | "problem" | "resume") {
    setSaving(true); setError(""); setSuccess("");
    try {
      const response = await fetch(`/api/warehouse/orders/${orderId}/action`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: name, problemCode, problemNote }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "อัปเดตงานไม่สำเร็จ");
      setJob((current) => current ? { ...current, status: result.status } : current);
      setSuccess(result.message); setShowProblem(false); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "อัปเดตงานไม่สำเร็จ"); }
    finally { setSaving(false); }
  }

  async function ship() {
    if (!carrier || !trackingNumber.trim()) { setError("กรุณาเลือกขนส่งและกรอกเลขพัสดุ"); return; }
    if (!window.confirm(`ยืนยันจัดส่งด้วย ${carrier}\nเลขพัสดุ ${trackingNumber.trim().toUpperCase()}\n\nระบบจะอัปเดตหน้าสมาชิกและแจ้งลูกค้าทาง LINE`)) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const response = await fetch(`/api/warehouse/orders/${orderId}/shipment`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ carrier, trackingNumber }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "บันทึกเลขพัสดุไม่สำเร็จ");
      setSuccess(result.lineNotificationSent === false ? "บันทึกเลขพัสดุแล้ว แต่แจ้ง LINE ไม่สำเร็จ กรุณาแจ้งร้าน" : "ยืนยันจัดส่งและแจ้งลูกค้าแล้ว");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "บันทึกเลขพัสดุไม่สำเร็จ"); }
    finally { setSaving(false); }
  }

  return <>
    <WarehouseHeader onRefresh={() => void load()} refreshing={loading} />
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/warehouse" className="mb-5 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"><ArrowLeft className="h-4 w-4" />กลับหน้ารายการ</Link>
      {error && <p role="alert" className="mb-4 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">{error}</p>}
      {success && <p role="status" className="mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-100">{success}</p>}
      {loading && !order ? <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-[#d4ff14]" /></div> : order && job && <div className="space-y-5">
        <section className="bds-glass-card rounded-3xl p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d4ff14]">เลขออเดอร์</p><h1 className="mt-2 break-all font-mono text-2xl font-black sm:text-3xl">{order.order_number}</h1><p className="mt-2 text-sm text-white/50">{new Date(order.created_at).toLocaleString("th-TH")} · รวม {totalUnits} ชิ้น</p>
        </section>
        <section className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 sm:p-6"><h2 className="text-xl font-black">รายการสินค้า</h2><div className="mt-4 divide-y divide-white/10">{items.map((item, index) => <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#d4ff14] font-black text-[#071126]">{index + 1}</span><div className="min-w-0 flex-1"><p className="font-black">{item.brand_name} · {item.product_name}</p><p className="mt-1 text-white/65">{item.flavor_name}</p><p className="mt-1 break-all font-mono text-xs text-white/40">SKU {item.sku}</p></div><strong className="shrink-0 text-xl text-[#d4ff14]">× {item.quantity}</strong></div>)}</div></section>
        <section className="rounded-3xl border border-sky-400/20 bg-sky-400/[0.07] p-5 sm:p-6"><h2 className="text-xl font-black">ข้อมูลจัดส่ง</h2><div className="mt-4 space-y-3 text-white/80"><p className="font-black text-white">{order.shipping_name}</p><p className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />{order.shipping_phone}</p><p className="flex gap-2 leading-6"><MapPin className="mt-1 h-4 w-4 shrink-0 text-sky-300" /><span>{order.shipping_address} {order.shipping_province} {order.shipping_postal_code}</span></p></div></section>
        <section className="rounded-3xl border border-[#d4ff14]/25 bg-[#d4ff14]/[0.06] p-5 sm:p-6">
          {job.status === "ready_to_pack" && <><h2 className="text-xl font-black">พร้อมเริ่มแพ็ก</h2><p className="mt-2 text-sm text-white/60">ตรวจรายการและที่อยู่ก่อนรับงานค่ะ</p><button disabled={saving} onClick={() => void action("start")} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#d4ff14] px-5 py-4 font-black text-[#071126]"><Play className="h-5 w-5" />รับงานและเริ่มแพ็ก</button></>}
          {job.status === "packing" && <><h2 className="text-xl font-black">กำลังแพ็กสินค้า</h2><p className="mt-2 text-sm text-white/60">เช็กสินค้าและจำนวนให้ครบก่อนกดแพ็กเสร็จค่ะ</p><button disabled={saving} onClick={() => void action("pack")} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#d4ff14] px-5 py-4 font-black text-[#071126]"><PackageCheck className="h-5 w-5" />แพ็กสินค้าเสร็จแล้ว</button></>}
          {job.status === "packed" && <><h2 className="text-xl font-black">ใส่เลขพัสดุ</h2><p className="mt-2 text-sm text-white/60">ตรวจเลขให้ถูกต้อง ระบบจะแจ้งลูกค้าเพียงครั้งเดียวค่ะ</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">บริษัทขนส่ง<select value={carrier} onChange={(event) => setCarrier(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/15 bg-[#071126] px-4 py-3.5"><option value="">เลือกบริษัทขนส่ง</option>{CARRIERS.map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-sm font-bold">เลขพัสดุ<input value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} autoCapitalize="characters" maxLength={50} placeholder="เช่น TH0123456789" className="mt-2 w-full rounded-2xl border border-white/15 bg-[#071126] px-4 py-3.5 font-mono uppercase" /></label></div><button disabled={saving || !carrier || !trackingNumber.trim()} onClick={() => void ship()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#d4ff14] px-5 py-4 font-black text-[#071126] disabled:opacity-40"><Truck className="h-5 w-5" />ตรวจและยืนยันจัดส่ง</button></>}
          {job.status === "problem" && <><div className="flex gap-3"><AlertTriangle className="h-6 w-6 text-red-300" /><div><h2 className="text-xl font-black">งานนี้มีปัญหา</h2><p className="mt-2 text-sm text-red-100">{job.problem_note}</p></div></div><button disabled={saving} onClick={() => void action("resume")} className="mt-5 w-full rounded-2xl border border-[#d4ff14]/50 px-5 py-3.5 font-black text-[#d4ff14]">แก้ไขแล้ว · นำกลับเข้าคิว</button></>}
          {job.status === "shipped" && <div className="flex gap-3"><CheckCircle2 className="h-7 w-7 text-[#d4ff14]" /><div><h2 className="text-xl font-black">จัดส่งแล้ว</h2><p className="mt-2 text-white/65">{order.carrier} · <span className="font-mono text-white">{order.tracking_number}</span></p></div></div>}
        </section>
        {!(["problem", "shipped"] as string[]).includes(job.status) && <section className="rounded-3xl border border-red-400/20 bg-red-400/[0.05] p-5"><button type="button" onClick={() => setShowProblem((value) => !value)} className="flex items-center gap-2 font-black text-red-200"><AlertTriangle className="h-5 w-5" />แจ้งปัญหา</button>{showProblem && <div className="mt-4 space-y-3"><select value={problemCode} onChange={(event) => setProblemCode(event.target.value)} className="w-full rounded-xl border border-white/15 bg-[#071126] px-4 py-3">{PROBLEMS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><textarea value={problemNote} onChange={(event) => setProblemNote(event.target.value)} maxLength={500} rows={3} placeholder="ระบุรายละเอียดให้ร้านตรวจสอบ" className="w-full rounded-xl border border-white/15 bg-[#071126] px-4 py-3" /><button disabled={saving || !problemNote.trim()} onClick={() => void action("problem")} className="w-full rounded-xl bg-red-300 px-4 py-3 font-black text-[#071126] disabled:opacity-40">ยืนยันแจ้งปัญหา</button></div>}</section>}
      </div>}
    </main>
  </>;
}
