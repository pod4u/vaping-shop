import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { MEMBER_COOKIE_NAME, verifyMemberSessionToken } from "@/lib/member-auth";
import { getMemberDashboard } from "@/lib/member-service";
import MemberLogoutButton from "./MemberLogoutButton";
import MemberLoginForm from "./MemberLoginForm";
import MemberOrderActions from "./MemberOrderActions";
import MemberPasswordSettings from "./MemberPasswordSettings";
import MemberProfileEditor from "./MemberProfileEditor";
import MemberTrackingActions from "./MemberTrackingActions";
import MemberReviewForm from "./MemberReviewForm";
import OrderSlipUpload from "@/components/OrderSlipUpload";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ระบบสมาชิก VIP · Pod4U", robots: { index: false, follow: false } };

const statusLabels: Record<string, string> = {
  draft: "รอยืนยันรายการ",
  pending: "จองสินค้า / รอชำระเงิน",
  confirmed: "ชำระแล้ว / กำลังเตรียมสินค้า",
  shipped: "จัดส่งแล้ว",
  delivered: "ส่งถึงแล้ว",
  cancelled: "ยกเลิกแล้ว",
};

const statusStyles: Record<string, string> = {
  draft: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  pending: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  confirmed: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  shipped: "border-violet-400/30 bg-violet-400/10 text-violet-300",
};

function OrderProgress({ status }: { status: string }) {
  const current = status === "draft" ? 0 : status === "pending" ? 1 : status === "confirmed" ? 2 : 3;
  const steps = [
    { label: "รับออเดอร์", icon: "📝" },
    { label: "รอชำระเงิน", icon: "💳" },
    { label: "เตรียมจัดส่ง", icon: "📦" },
    { label: "จัดส่งแล้ว", icon: "🚚" },
  ];

  return (
    <div className="mt-6 pt-5 border-t border-white/10" aria-label={`ขั้นตอนออเดอร์: ${steps[current]?.label}`}>
      <div className="grid grid-cols-4 relative">
        {/* Connecting progress line */}
        <div className="absolute top-4 left-[12.5%] right-[12.5%] h-1 bg-white/10 rounded-full -z-0">
          <div
            className="h-full bg-gradient-to-r from-acid-lime to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${(current / (steps.length - 1)) * 100}%` }}
          />
        </div>

        {steps.map((step, index) => {
          const isDone = index < current;
          const isCurrent = index === current;
          return (
            <div key={step.label} className="relative z-10 flex flex-col items-center text-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all shadow-lg ${
                  isDone
                    ? "bg-emerald-400 text-navy-deep ring-4 ring-emerald-400/20"
                    : isCurrent
                    ? "bg-acid-lime text-navy-deep ring-4 ring-acid-lime/30 scale-110 animate-pulse"
                    : "bg-navy-surface border border-white/20 text-white/40"
                }`}
              >
                {isDone ? "✓" : step.icon}
              </div>
              <p
                className={`mt-2 text-[11px] font-bold leading-tight ${
                  isCurrent ? "text-acid-lime drop-shadow-sm" : isDone ? "text-white/80" : "text-white/35"
                }`}
              >
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function MemberPage() {
  const session = verifyMemberSessionToken(cookies().get(MEMBER_COOKIE_NAME)?.value);
  const dashboard = session ? await getMemberDashboard(session.customerId) : null;

  if (!dashboard) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="bds-glass-card relative overflow-hidden rounded-3xl p-8">
          <div className="w-16 h-16 rounded-2xl bg-acid-lime/10 border border-acid-lime/30 text-3xl flex items-center justify-center mx-auto mb-4 text-acid-lime shadow-inner">
            👤
          </div>
          <h1 className="text-2xl font-black text-white">เข้าสู่ระบบสมาชิก</h1>
          <p className="mt-3 text-xs leading-6 text-white/60">
            ใช้เบอร์โทรศัพท์และรหัสผ่านเพื่อดูออเดอร์ ติดตามพัสดุ และตรวจสอบสิทธิประโยชน์ของคุณบน Pod4U
          </p>
          <MemberLoginForm />
          <p className="mt-6 border-t border-white/10 pt-4 text-[11px] leading-5 text-white/40">
            สมาชิกเดิมที่ยังไม่เคยตั้งรหัสผ่าน ให้เปิดหน้าสมาชิกจาก LINE เพียงครั้งเดียว แล้วตั้งรหัสผ่านในหัวข้อ “ข้อมูลของฉัน”
          </p>
        </div>
      </div>
    );
  }

  const defaultAddress = dashboard.addresses.find((address) => address.is_default) ?? dashboard.addresses[0];
  const activeOrders = dashboard.orders.filter((order) => order.status !== "cancelled" && order.status !== "delivered");
  const historyOrders = dashboard.orders.filter((order) => order.status === "cancelled" || order.status === "delivered");
  const reviewOrders = dashboard.orders.filter((order) => order.status !== "cancelled");
  const displayInitial = dashboard.customer.full_name.trim().charAt(0).toUpperCase() || "VIP";

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:pt-10 space-y-6">
      {/* 1. LUXURY VIP HERO CARD */}
      <header className="bds-glass-card relative overflow-hidden rounded-3xl p-6 sm:p-8 group">
        {/* Ambient holographic glows */}
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-acid-lime/15 rounded-full blur-3xl pointer-events-none group-hover:bg-acid-lime/25 transition-all duration-700" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Profile Header Bar */}
        <div className="relative flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex min-w-0 items-center gap-4">
            {/* Holographic Glowing Avatar */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-acid-lime to-[#bef264] p-0.5 shadow-lg shadow-acid-lime/30 flex items-center justify-center">
                <div className="w-full h-full rounded-[14px] bg-navy-deep flex items-center justify-center">
                  <span className="text-2xl font-black text-acid-lime drop-shadow">{displayInitial}</span>
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-navy-deep flex items-center justify-center text-[10px] text-navy-deep font-black shadow">
                ✓
              </div>
            </div>

            {/* Name & Badges */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-acid-lime/15 border border-acid-lime/35 text-[10px] font-black uppercase tracking-wider text-acid-lime">
                  ⭐ POD4U VIP MEMBER
                </span>
                <span className="text-white/40 text-xs font-mono">ID: #{dashboard.customer.id}</span>
              </div>
              <h1 className="mt-1.5 truncate text-2xl sm:text-3xl font-black text-white tracking-tight">
                {dashboard.customer.full_name}
              </h1>
              <p className="mt-0.5 text-xs text-white/50 flex items-center gap-1.5 font-mono">
                <span>📱</span> {dashboard.customer.phone}
              </p>
            </div>
          </div>

          <MemberLogoutButton />
        </div>

        {/* 2. REFINED MODERN QUICK NAVIGATION CARDS */}
        <nav aria-label="เมนูสมาชิก" className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Action 1: Shop Now (Primary Glowing CTA) */}
          <Link
            href="/stock?source=member"
            className="btn-liquid-acid group/btn relative flex min-h-[105px] flex-col justify-between overflow-hidden p-4 text-navy-deep font-black"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">🛍️</span>
              <span className="text-xs bg-navy-deep/15 px-2 py-0.5 rounded-full font-bold">สินค้าพร้อมส่ง</span>
            </div>
            <div>
              <span className="text-sm font-black block">สั่งซื้อสินค้าใหม่</span>
              <span className="text-[10px] text-navy-deep/70 font-medium block">คลิกดูสต็อกพร้อมส่ง →</span>
            </div>
          </Link>

          {/* Action 2: Orders */}
          <a
            href="#orders"
            className="btn-liquid-glass group/btn relative flex min-h-[105px] flex-col justify-between overflow-hidden p-4 text-white hover:border-sky-400/40"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">📦</span>
              {activeOrders.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-sky-400/20 border border-sky-400/40 text-[10px] font-black text-sky-300 animate-pulse">
                  {activeOrders.length} กำลังจัดส่ง
                </span>
              )}
            </div>
            <div>
              <span className="text-sm font-bold block">ออเดอร์ของฉัน</span>
              <span className="text-[10px] text-white/50 block">ติดตามพัสดุ / สลิป →</span>
            </div>
          </a>

          {/* Action 3: Reviews & Cash Credit */}
          <a
            href="#reviews"
            className="btn-liquid-glass group/btn relative flex min-h-[105px] flex-col justify-between overflow-hidden p-4 text-white hover:border-amber-400/40"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">⭐</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-[10px] font-black text-amber-300">
                ฿{dashboard.availableCredit.toFixed(0)} เครดิต
              </span>
            </div>
            <div>
              <span className="text-sm font-bold block">รีวิว & เครดิต</span>
              <span className="text-[10px] text-white/50 block">เขียนรีวิวรับส่วนลด →</span>
            </div>
          </a>

          {/* Action 4: Profile / Address */}
          <a
            href="#profile"
            className="btn-liquid-glass group/btn relative flex min-h-[105px] flex-col justify-between overflow-hidden p-4 text-white hover:border-white/30"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">📍</span>
              <span className="text-[10px] text-white/40 font-mono">แก้ไข</span>
            </div>
            <div>
              <span className="text-sm font-bold block">ข้อมูลจัดส่ง</span>
              <span className="text-[10px] text-white/50 block truncate">
                {defaultAddress?.province || "จัดการที่อยู่"} →
              </span>
            </div>
          </a>
        </nav>
      </header>

      {/* 3. VIP METRICS HUD (STATS CARDS) */}
      <section aria-label="สรุปสถิติบัญชี" className="grid grid-cols-3 gap-3">
        {/* Metric 1 */}
        <div className="bds-glass-card relative overflow-hidden rounded-2xl p-4 text-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-white/40 block">กำลังดำเนินการ</span>
          <div className="mt-1 flex items-baseline justify-center gap-1.5">
            <span className="text-2xl sm:text-3xl font-black font-mono text-sky-300 drop-shadow">
              {activeOrders.length}
            </span>
            <span className="text-xs text-white/50">รายการ</span>
          </div>
          {activeOrders.length > 0 && (
            <span className="inline-block w-2 h-2 rounded-full bg-sky-400 animate-ping mt-1" />
          )}
        </div>

        {/* Metric 2 */}
        <div className="bds-glass-card relative overflow-hidden rounded-2xl p-4 text-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-white/40 block">ออเดอร์ทั้งหมด</span>
          <div className="mt-1 flex items-baseline justify-center gap-1.5">
            <span className="text-2xl sm:text-3xl font-black font-mono text-white">
              {dashboard.orders.length}
            </span>
            <span className="text-xs text-white/50">ออเดอร์</span>
          </div>
          <span className="text-[10px] text-white/35 block mt-0.5">ประวัติสะสม</span>
        </div>

        {/* Metric 3 */}
        <div className="bds-glass-card relative overflow-hidden rounded-2xl border-acid-lime/20 p-4 text-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-acid-lime/70 block">ยอดสะสม VIP</span>
          <div className="mt-1 flex items-baseline justify-center gap-0.5 truncate">
            <span className="text-xs text-acid-lime font-bold">฿</span>
            <span className="text-2xl sm:text-3xl font-black font-mono text-acid-lime drop-shadow">
              {Number(dashboard.customer.total_spent ?? 0).toLocaleString("th-TH")}
            </span>
          </div>
          <span className="text-[10px] text-acid-lime/60 block mt-0.5">ส่วนลดอัตโนมัติ</span>
        </div>
      </section>

      {/* 4. REWARDS & CASH CREDIT SECTION */}
      <section id="reviews" className="scroll-mt-24 pt-4">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-acid-lime flex items-center gap-1">
              <span>🎁</span> สิทธิประโยชน์สมาชิก
            </p>
            <h2 className="mt-0.5 text-2xl font-black text-white tracking-tight">รีวิวและเครดิตส่วนลด</h2>
          </div>
          <Link href="/reviews" className="text-xs font-bold text-acid-lime hover:underline">
            ดูรีวิวทั้งหมด →
          </Link>
        </div>

        <div className="bds-glass-card overflow-hidden rounded-3xl border-acid-lime/30">
          <div className="p-6 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-white/60 block">
                  เครดิตส่วนลดเงินสดพร้อมใช้
                </span>
                <p className="mt-1 text-4xl sm:text-5xl font-black font-mono text-acid-lime drop-shadow-lg">
                  ฿{dashboard.availableCredit.toFixed(2)}
                </p>
                <p className="text-xs text-white/50 mt-1">
                  * ระบบจะนำไปหักลดให้อัตโนมัติเมื่อกดสั่งซื้อในตะกร้าทันที
                </p>
              </div>

              <div className="text-right">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-black shadow-lg ${
                  dashboard.availableCredit > 0
                    ? "bg-acid-lime text-navy-deep shadow-acid/40"
                    : "border border-white/20 bg-white/10 text-white/60"
                }`}>
                  {dashboard.availableCredit > 0 ? "✓ มีส่วนลดพร้อมใช้" : "สะสมเครดิตเพิ่มได้"}
                </span>
              </div>
            </div>

            {/* How to earn credit */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl bg-black/30 border border-white/10 p-3.5 flex items-center gap-3">
                <span className="text-2xl bg-white/5 p-2 rounded-xl">🛒</span>
                <div>
                  <p className="text-xs font-bold text-white">1. สั่งซื้อสินค้า</p>
                  <p className="text-[11px] text-white/50">จัดส่งฟรีเมื่อซื้อ 3 ชิ้นขึ้นไป</p>
                </div>
              </div>

              <div className="rounded-2xl bg-black/30 border border-white/10 p-3.5 flex items-center gap-3">
                <span className="text-2xl bg-white/5 p-2 rounded-xl">⭐</span>
                <div>
                  <p className="text-xs font-bold text-white">2. เขียนรีวิวสั้นๆ</p>
                  <p className="text-[11px] text-white/50">ให้ดาวและแชร์ความประทับใจ</p>
                </div>
              </div>

              <div className="rounded-2xl bg-black/30 border border-acid-lime/25 bg-acid-lime/[0.05] p-3.5 flex items-center gap-3">
                <span className="text-2xl bg-acid-lime/10 p-2 rounded-xl">🎁</span>
                <div>
                  <p className="text-xs font-bold text-acid-lime">3. รับเครดิต ฿5</p>
                  <p className="text-[11px] text-white/60">ลดอัตโนมัติในบิลถัดไปทันที</p>
                </div>
              </div>
            </div>
          </div>

          {/* Reviewable Orders Box */}
          <div className="border-t border-white/10 bg-black/40 p-6">
            {reviewOrders.length === 0 ? (
              <div className="text-center py-4">
                <p className="font-bold text-white text-sm">ยังไม่มีออเดอร์ที่สามารถเขียนรีวิวได้</p>
                <p className="mt-1 text-xs text-white/50">เมื่อสั่งซื้อสินค้าแล้ว รายการจะขึ้นให้เขียนรีวิวรับส่วนลดที่นี่ค่ะ</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-wider text-white/60 flex items-center gap-1.5">
                  <span>✍️</span> เขียนรีวิวออเดอร์เพื่อรับส่วนลด
                </p>
                {reviewOrders.map((order) => (
                  <article key={order.id} className="bds-glass-card rounded-2xl p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-white/10">
                      <div>
                        <p className="font-mono text-xs font-black text-white">{order.order_number}</p>
                        <p className="mt-0.5 text-[11px] text-white/40">
                          {new Date(order.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
                        </p>
                      </div>
                      <p className="text-sm font-black font-mono text-acid-lime">
                        ฿{Number(order.total).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <MemberReviewForm orderId={order.id} orderNumber={order.order_number} existingReview={order.review} />
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. ORDERS TRACKING SECTION (`#orders`) */}
      <section id="orders" className="scroll-mt-24 pt-4">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-acid-lime flex items-center gap-1">
              <span>🚚</span> สถานะคำสั่งซื้อ
            </p>
            <h2 className="mt-0.5 text-2xl font-black text-white tracking-tight">ออเดอร์ของฉัน</h2>
          </div>
          <Link
            href="/stock?source=member"
            className="btn-liquid-acid px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1 shadow-acid"
          >
            <span>+ สั่งซื้อเพิ่ม</span>
          </Link>
        </div>

        {dashboard.orders.length === 0 ? (
          <div className="bds-glass-card rounded-3xl p-10 text-center">
            <span className="text-5xl block mb-2" aria-hidden="true">🛍️</span>
            <p className="text-lg font-bold text-white">ยังไม่มีออเดอร์ในขณะนี้</p>
            <p className="mt-1 text-xs text-white/50 max-w-sm mx-auto">
              คุณสามารถเลือกดูพอตและหัวพอตพร้อมส่ง แล้วสั่งซื้อผ่านระบบสมาชิกได้ทันที
            </p>
            <Link
              href="/stock?source=member"
              className="btn-liquid-acid mt-5 inline-flex px-6 py-3 rounded-xl font-black text-sm shadow-acid"
            >
              เริ่มเลือกดูสินค้าพร้อมส่ง →
            </Link>
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="bds-glass-card rounded-2xl p-8 text-center text-xs text-white/60">
            ไม่มีออเดอร์ที่กำลังดำเนินการ (คุณสามารถตรวจสอบรายการที่ส่งแล้วได้ในประวัติออเดอร์ด้านล่าง)
          </div>
        ) : (
          <div className="space-y-5">
            {activeOrders.map((order) => {
              const isPending = order.status === "pending";
              const isConfirmed = order.status === "confirmed";
              return (
                <article
                  key={order.id}
                  className={`overflow-hidden rounded-3xl border p-5 sm:p-7 transition-all backdrop-blur-xl relative shadow-2xl ${
                    order.tracking_number
                      ? "border-acid-lime/40 bg-gradient-to-b from-acid-lime/[0.08] via-white/[0.02] to-slate-950/80 shadow-acid/10"
                      : isPending
                      ? "border-sky-400/40 bg-gradient-to-b from-sky-500/[0.08] via-white/[0.02] to-slate-950/80 shadow-sky-500/10"
                      : isConfirmed
                      ? "border-emerald-400/40 bg-gradient-to-b from-emerald-500/[0.08] via-white/[0.02] to-slate-950/80 shadow-emerald-500/10"
                      : "border-white/15 bg-white/[0.03]"
                  }`}
                >
                  {/* Order Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-white/10">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-white/40 block">เลขที่ออเดอร์</span>
                      <p className="mt-0.5 font-mono text-base sm:text-lg font-black text-white">{order.order_number}</p>
                      <p className="mt-0.5 text-xs text-white/40 font-mono">
                        {new Date(order.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
                      </p>
                    </div>

                    {isPending ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-500/20 px-3.5 py-1.5 text-xs font-black text-sky-300 shadow-md">
                        <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                        <span>จองสต็อกแล้ว · รอชำระเงิน</span>
                      </span>
                    ) : isConfirmed ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3.5 py-1.5 text-xs font-black text-emerald-300 shadow-md">
                        <span>✓ ชำระแล้ว · กำลังเตรียมสินค้า</span>
                      </span>
                    ) : (
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusStyles[order.status] ?? "border-white/10 bg-white/10 text-white"}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    )}
                  </div>

                  {/* Pricing and Shipping summary */}
                  <div className="mt-4 grid grid-cols-2 gap-3 pb-4 border-b border-white/10">
                    <div>
                      <span className="text-[11px] text-white/40 font-bold block">ยอดชำระสุทธิ</span>
                      <p className="mt-0.5 text-2xl sm:text-3xl font-black font-mono text-acid-lime drop-shadow">
                        ฿{Number(order.total).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-white/40 font-bold block">สถานะพัสดุ</span>
                      {order.tracking_number ? (
                        <p className="mt-0.5 text-sm font-black text-emerald-300">จัดส่งแล้ว มีเลขพัสดุ</p>
                      ) : isConfirmed ? (
                        <p className="mt-0.5 text-sm font-black text-sky-200">กำลังเตรียมจัดส่ง</p>
                      ) : (
                        <p className="mt-0.5 text-sm font-bold text-amber-200">รอโอนเงินเพื่อยืนยัน</p>
                      )}
                    </div>
                  </div>

                  {Number(order.discount_amount) > 0 && (
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-acid-lime/30 bg-acid-lime/[0.1] px-4 py-2 text-xs">
                      <span className="font-bold text-acid-lime">🎁 ใช้ส่วนลดจากรีวิวแล้ว</span>
                      <span className="font-black text-acid-lime font-mono text-sm">
                        −฿{Number(order.discount_amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  {/* Items snapshot & Delivery Address */}
                  {(order.status === "draft" || order.status === "pending") && (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-md">
                      <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-white/10">
                        <p className="text-xs font-black text-white flex items-center gap-1.5">
                          <span>📦</span> รายการสินค้าที่จองไว้
                        </p>
                        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-white/70">
                          {order.items.reduce((acc, it) => acc + it.quantity, 0)} ชิ้น
                        </span>
                      </div>

                      <div className="mt-3 space-y-2 border-b border-white/10 pb-3">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-white truncate">{item.brand_name} · {item.product_name}</p>
                              <p className="text-acid-lime text-[11px] font-medium">รส {item.flavor_name}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded-lg bg-white/10 font-mono font-bold text-white text-xs">
                              × {item.quantity}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 text-xs leading-5 text-white/70 space-y-0.5">
                        <div className="flex items-center gap-1 text-[11px] text-white/40 font-bold mb-1">
                          <span>📍</span> ข้อมูลผู้รับพัสดุ
                        </div>
                        <p className="font-bold text-white">
                          {order.shipping_name} <span className="font-mono text-white/60 font-normal">({order.shipping_phone})</span>
                        </p>
                        <p className="text-[11px] text-white/60 leading-relaxed">
                          {order.shipping_address} {order.shipping_province} {order.shipping_postal_code || ""}
                        </p>
                      </div>

                      {order.status === "draft" && (
                        <a href="#profile" className="mt-3 inline-flex rounded-lg border border-amber-200/30 px-3 py-1.5 text-xs font-bold text-amber-100 hover:bg-amber-300/10 transition-colors">
                          แก้ไขที่อยู่จัดส่ง →
                        </a>
                      )}
                    </div>
                  )}

                  {/* PENDING: LUXURY BANK CARD & THUNDER SLIP UPLOAD */}
                  {order.status === "pending" && (
                    <div className="mt-5">
                      <OrderSlipUpload
                        orderId={String(order.id)}
                        orderNumber={order.order_number}
                        total={Number(order.total)}
                      />
                    </div>
                  )}

                  {/* CONFIRMED: WAITING TRACKING */}
                  {order.status === "confirmed" && !order.tracking_number && (
                    <div className="mt-4 rounded-2xl border border-sky-400/30 bg-sky-500/10 p-4 text-xs">
                      <p className="font-black text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                        <span>คลังสินค้ากำลังเตรียมแพ็คพัสดุ</span>
                      </p>
                      <p className="mt-1 text-white/60 leading-relaxed">
                        ยอดชำระได้รับการยืนยันแล้ว เลขพัสดุจะอัปเดตในหน้านี้ทันทีที่จัดส่งออกค่ะ
                      </p>
                    </div>
                  )}

                  {/* SHIPPED: TRACKING CARD */}
                  {order.tracking_number && (
                    <div className="mt-4 rounded-2xl border border-acid-lime/30 bg-black/40 p-4 shadow-lg">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-white/50">{order.carrier || "บริษัทขนส่ง"}</p>
                        <span className="rounded-full bg-acid-lime px-2.5 py-1 text-[10px] font-black text-navy-deep">
                          มีเลขพัสดุแล้ว
                        </span>
                      </div>
                      <p className="mt-2 break-all font-mono text-2xl sm:text-3xl font-black tracking-wider text-white">
                        {order.tracking_number}
                      </p>
                      <MemberTrackingActions carrier={order.carrier} trackingNumber={order.tracking_number} />
                      {order.shipped_at && (
                        <p className="mt-3 text-[11px] text-white/40">
                          อัปเดตล่าสุด {new Date(order.shipped_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
                        </p>
                      )}
                    </div>
                  )}

                  {/* STEP PROGRESS TIMELINE */}
                  {!["cancelled", "delivered"].includes(order.status) && <OrderProgress status={order.status} />}

                  {/* CANCEL OR EDIT ACTIONS */}
                  {(order.status === "draft" || order.status === "pending") && (
                    <MemberOrderActions
                      orderId={String(order.id)}
                      orderNumber={order.order_number}
                      orderItems={order.items}
                      status={order.status}
                    />
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* ORDER HISTORY DRAWER / DETAILS */}
        {historyOrders.length > 0 && (
          <details className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md overflow-hidden group">
            <summary className="cursor-pointer px-5 py-4 text-xs font-bold text-white/70 hover:text-white flex items-center justify-between transition-colors">
              <span>ประวัติออเดอร์ก่อนหน้า ({historyOrders.length} รายการ)</span>
              <span className="text-white/40 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="space-y-3 border-t border-white/10 p-4">
              {historyOrders.map((order) => (
                <div key={order.id} className="rounded-xl bg-black/25 border border-white/5 p-3.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono font-bold text-white/80">{order.order_number}</p>
                      <p className="mt-0.5 text-[10px] text-white/40">
                        {new Date(order.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white/50">{statusLabels[order.status] || order.status}</p>
                      <p className="mt-0.5 font-bold font-mono text-white/70">
                        ฿{Number(order.total).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                      </p>
                      {Number(order.discount_amount) > 0 && (
                        <p className="text-[10px] font-bold text-acid-lime">
                          ส่วนลด −฿{Number(order.discount_amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  </div>
                  {order.status === "delivered" && (
                    <a href="#reviews" className="mt-2.5 inline-flex text-[11px] font-bold text-acid-lime hover:underline">
                      เขียนรีวิวรับส่วนลด ↑
                    </a>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}
      </section>

      {/* 6. PROFILE & SHIPPING ADDRESS (`#profile`) */}
      <section id="profile" className="scroll-mt-24 pt-4">
        <div className="mb-3">
          <p className="text-xs font-black uppercase tracking-wider text-acid-lime flex items-center gap-1">
            <span>👤</span> ข้อมูลส่วนตัว
          </p>
          <h2 className="mt-0.5 text-2xl font-black text-white tracking-tight">ข้อมูลของฉัน & ที่อยู่จัดส่ง</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Address Card */}
          <div className="bds-glass-card rounded-3xl p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl bg-white/5 p-2 rounded-xl" aria-hidden="true">📍</span>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-white text-sm">ที่อยู่จัดส่งหลัก</h3>
                {defaultAddress ? (
                  <div className="mt-3 space-y-1 text-xs leading-5 text-white/70">
                    <p className="font-bold text-white text-sm">{defaultAddress.recipient_name}</p>
                    <p>{defaultAddress.address}</p>
                    <p>{defaultAddress.province} {defaultAddress.postal_code || ""}</p>
                    <p className="font-mono text-white/50 pt-1">โทร: {defaultAddress.phone}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-amber-300">ยังไม่มีที่อยู่จัดส่ง กรุณาเพิ่มข้อมูลก่อนสั่งซื้อ</p>
                )}
              </div>
            </div>
            <MemberProfileEditor
              values={{
                fullName: dashboard.customer.full_name,
                phone: dashboard.customer.phone,
                addressId: defaultAddress?.id ?? null,
                recipientName: defaultAddress?.recipient_name ?? dashboard.customer.full_name,
                address: defaultAddress?.address ?? "",
                province: defaultAddress?.province ?? "",
                postalCode: defaultAddress?.postal_code ?? "",
              }}
            />
          </div>

          {/* Password Settings */}
          <MemberPasswordSettings hasPassword={dashboard.hasWebPassword} loginPhone={dashboard.customer.phone} />
        </div>
      </section>

      <p className="mt-10 text-center text-xs text-white/30">
        ระบบสมาชิก Pod4U · ปลอดภัย เข้ารหัสข้อมูลมาตรฐาน SSL · จำอุปกรณ์ 30 วัน
      </p>
    </div>
  );
}
