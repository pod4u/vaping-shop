"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, CircleDollarSign, ClipboardCheck, ClipboardList, PackageCheck, Plus, RefreshCw, Truck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface OrderRow {
  id: string;
  order_number: string;
  order_source: "admin_manual" | "line";
  status: string;
  shipping_name: string;
  discount_amount: number | string;
  total: number | string;
  created_at: string;
  customer: { id: number; full_name: string; phone: string } | null;
  payment: { status: string; expires_at: string } | null;
}

type QueueFilter = "active" | "draft" | "pending" | "confirmed" | "shipped" | "history" | "all";

const STATUS_META: Record<string, { label: string; next: string; className: string }> = {
  draft: { label: "รอตรวจออเดอร์", next: "ตรวจสินค้า ราคา และที่อยู่ แล้วส่งยอดชำระ", className: "border-amber-300/30 bg-amber-300/10 text-amber-100" },
  pending: { label: "รอลูกค้าชำระ", next: "ไม่ต้องทำอะไร ระบบกำลังรอสลิปจากลูกค้า", className: "border-sky-300/30 bg-sky-300/10 text-sky-100" },
  confirmed: { label: "ชำระแล้ว · เตรียมส่ง", next: "แพ็กสินค้าและกรอกเลขพัสดุ", className: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" },
  shipped: { label: "จัดส่งแล้ว", next: "รอสินค้าถึงลูกค้า", className: "border-violet-300/30 bg-violet-300/10 text-violet-100" },
  delivered: { label: "สำเร็จ", next: "ปิดงานแล้ว", className: "border-emerald-300/20 bg-emerald-300/5 text-emerald-200" },
  cancelled: { label: "ยกเลิก", next: "ไม่ต้องดำเนินการ", className: "border-white/10 bg-white/5 text-white/50" },
};

const FILTERS: { value: QueueFilter; label: string }[] = [
  { value: "active", label: "งานที่กำลังดำเนินการ" },
  { value: "draft", label: "รอตรวจ" },
  { value: "pending", label: "รอลูกค้าชำระ" },
  { value: "confirmed", label: "เตรียมจัดส่ง" },
  { value: "shipped", label: "จัดส่งแล้ว" },
  { value: "history", label: "ประวัติเสร็จ/ยกเลิก" },
  { value: "all", label: "ทั้งหมด" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(value));
}

function maskPhone(phone: string | undefined) {
  if (!phone) return "ไม่ระบุเบอร์";
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 4 ? `เบอร์ลงท้าย ${digits.slice(-4)}` : phone;
}

function QueueCard({ icon: Icon, label, count, active, onClick }: { icon: typeof ClipboardList; label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`bds-glass-card rounded-2xl p-4 text-left ${active ? "border-acid-lime bg-acid-lime/10" : "hover:border-white/20"}`}>
      <div className="flex items-center justify-between gap-3">
        <Icon className={`h-5 w-5 ${active ? "text-acid-lime" : "text-white/50"}`} />
        <span className="text-2xl font-black text-white">{count}</span>
      </div>
      <p className={`mt-3 text-sm font-bold ${active ? "text-acid-lime" : "text-white/70"}`}>{label}</p>
    </button>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [filter, setFilter] = useState<QueueFilter>("active");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/orders?page_size=100", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "โหลดออเดอร์ไม่สำเร็จ");
      setOrders(result.orders ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "โหลดออเดอร์ไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const counts = useMemo(() => ({
    active: orders.filter((order) => ["draft", "pending", "confirmed", "shipped"].includes(order.status)).length,
    draft: orders.filter((order) => order.status === "draft").length,
    pending: orders.filter((order) => order.status === "pending").length,
    confirmed: orders.filter((order) => order.status === "confirmed").length,
    shipped: orders.filter((order) => order.status === "shipped").length,
    history: orders.filter((order) => ["delivered", "cancelled"].includes(order.status)).length,
    all: orders.length,
  }), [orders]);

  const visibleOrders = useMemo(() => orders.filter((order) => {
    if (filter === "active") return ["draft", "pending", "confirmed", "shipped"].includes(order.status);
    if (filter === "history") return ["delivered", "cancelled"].includes(order.status);
    if (filter === "all") return true;
    return order.status === filter;
  }), [filter, orders]);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold text-white">คิวจัดการออเดอร์</h1>
          <p className="mt-1 text-white/50">เปิดหน้านี้แล้วดูได้ทันทีว่าออเดอร์ไหนต้องทำอะไรต่อ</p>
        </div>
        <div className="flex gap-2">
          <button type="button" aria-label="โหลดออเดอร์ใหม่" onClick={loadOrders} className="rounded-lg border border-white/10 p-2.5 text-white/60 hover:bg-white/5 hover:text-white"><RefreshCw className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} /></button>
          <Link href="/admin/orders/new" className="inline-flex items-center justify-center gap-2 rounded-lg bg-acid-lime px-4 py-2.5 text-sm font-bold text-navy-deep hover:brightness-110"><Plus className="h-4 w-4" /> รับรายการใหม่</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <QueueCard icon={ClipboardCheck} label="รอตรวจออเดอร์" count={counts.draft} active={filter === "draft"} onClick={() => setFilter("draft")} />
        <QueueCard icon={CircleDollarSign} label="รอลูกค้าชำระ" count={counts.pending} active={filter === "pending"} onClick={() => setFilter("pending")} />
        <QueueCard icon={PackageCheck} label="เตรียมจัดส่ง" count={counts.confirmed} active={filter === "confirmed"} onClick={() => setFilter("confirmed")} />
        <QueueCard icon={Truck} label="จัดส่งแล้ว" count={counts.shipped} active={filter === "shipped"} onClick={() => setFilter("shipped")} />
      </div>

      <Card className="border-sky-300/20 bg-sky-300/10">
        <CardContent className="py-4 text-sm text-sky-100">
          <strong>ขั้นตอนทำงาน:</strong> ตรวจออเดอร์และส่งยอดครั้งเดียว → รอลูกค้าส่งสลิป → ระบบยืนยันการชำระ → แพ็กและใส่เลขพัสดุ<br />
          <span className="text-white/60">ถ้าลูกค้าไม่ส่งสลิปภายในเวลาที่แจ้ง ระบบจะยกเลิกออเดอร์อัตโนมัติ โดยไม่ส่งข้อความเตือนซ้ำ</span>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2" aria-label="กรองออเดอร์">
        {FILTERS.map((item) => (
          <button key={item.value} type="button" onClick={() => setFilter(item.value)} className={`rounded-full border px-3 py-2 text-sm ${filter === item.value ? "btn-liquid-acid border-acid-lime text-navy-deep" : "btn-liquid-glass text-white/60"}`}>
            {item.label} <span className="ml-1 opacity-70">{counts[item.value]}</span>
          </button>
        ))}
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>}

      {isLoading ? (
        <Card className="border-white/10 bg-white/5"><CardContent className="py-12 text-center text-white/50">กำลังโหลดออเดอร์...</CardContent></Card>
      ) : visibleOrders.length === 0 ? (
        <Card className="border-white/10 bg-white/5"><CardContent className="flex flex-col items-center py-14 text-center"><CheckCircle2 className="h-12 w-12 text-emerald-300/60" /><p className="mt-3 font-bold text-white">ไม่มีออเดอร์ในคิวนี้</p><p className="mt-1 text-sm text-white/50">ตอนนี้ยังไม่มีรายการที่ต้องดำเนินการ</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {visibleOrders.map((order) => {
            const meta = STATUS_META[order.status] ?? { label: order.status, next: "เปิดดูรายละเอียด", className: "border-white/10 bg-white/5 text-white/70" };
            const paymentExpired = now > 0 && order.payment?.status === "awaiting_slip" && new Date(order.payment.expires_at).getTime() <= now;
            return (
              <article key={order.id} className="bds-glass-card rounded-2xl p-4 hover:border-white/20">
                <div className="grid gap-4 lg:grid-cols-[1fr_1fr_180px_auto] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${meta.className}`}>{meta.label}</span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-xs text-white/60">{order.order_source === "line" ? "LINE OA Pod4U · สมาชิกเชื่อมแล้ว" : "แอดมินบันทึก"}</span>
                    </div>
                    <Link href={`/admin/orders/${order.id}`} className="mt-3 block break-all font-mono text-sm font-black text-acid-lime hover:underline sm:text-base">{order.order_number}</Link>
                    <p className="mt-1 text-xs text-white/40">รับรายการ {formatDate(order.created_at)}</p>
                  </div>
                  <div>
                    <p className="font-bold text-white">{order.customer?.full_name || order.shipping_name}</p>
                    <p className="mt-1 text-sm text-white/45">{maskPhone(order.customer?.phone)}</p>
                    <p className="mt-2 text-sm text-white/70">{paymentExpired ? "หมดเวลาชำระแล้ว · ระบบกำลังยกเลิก" : meta.next}</p>
                    {order.status === "pending" && order.payment?.status === "awaiting_slip" && !paymentExpired && <p className="mt-1 text-xs text-sky-200">รอถึง {formatDate(order.payment.expires_at)}</p>}
                  </div>
                  <div className="lg:text-right"><p className="text-xs text-white/40">ยอดออเดอร์</p><p className="mt-1 text-xl font-black text-white">฿{Number(order.total).toLocaleString("th-TH")}</p>{Number(order.discount_amount) > 0 && <p className="mt-1 text-xs font-bold text-acid-lime">ใช้เครดิตรีวิว −฿{Number(order.discount_amount).toLocaleString("th-TH")}</p>}</div>
                  <Link href={`/admin/orders/${order.id}`} className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold ${order.status === "draft" ? "btn-liquid-acid text-navy-deep" : "btn-liquid-glass text-white/80"}`}>{order.status === "draft" ? "ตรวจออเดอร์" : "เปิดรายละเอียด"}<ChevronRight className="h-4 w-4" /></Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
