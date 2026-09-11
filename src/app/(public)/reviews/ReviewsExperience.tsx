import Link from "next/link";
import {
  ArrowRight,
  Grid2X2,
  Heart,
  Home,
  Menu,
  MessageCircleMore,
  Search,
  ShoppingCart,
  Star,
  UserRound,
} from "lucide-react";
import PublicReviewsList, { type PublicReview, type ReviewSummary } from "./PublicReviewsList";
import { CartDrawer } from "@/components/CartDrawer";

export interface ReviewsPreviewData {
  reviews: PublicReview[];
  summary: ReviewSummary;
}

export function ReviewsExperience({ previewData, previewMode = false }: { previewData?: ReviewsPreviewData; previewMode?: boolean } = {}) {
  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#061328] pb-40 text-white sm:pb-28">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_68%_4%,rgba(37,99,235,0.25),transparent_28%),radial-gradient(circle_at_10%_36%,rgba(20,92,158,0.16),transparent_34%),linear-gradient(180deg,#071a37_0%,#041124_100%)]" />

      {previewMode && (
        <div className="flex items-center justify-center gap-3 border-b border-sky-300/10 bg-[#06152d] px-4 py-2 text-center text-[11px] font-bold tracking-wide text-slate-400">
          <span>ตัวอย่างดีไซน์ · ข้อมูลสมมติ</span>
          <Link href="/api/review-design-preview?off=1" className="text-sky-300 underline underline-offset-2">ปิดโหมด</Link>
        </div>
      )}

      <header className="border-b border-sky-300/10 bg-[#06152d]/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-7">
          <Link href="/" aria-label="Pod4U หน้าแรก" className="leading-none">
            <span className="block text-3xl font-black italic tracking-[-0.08em] text-white sm:text-4xl">Pod<span className="text-acid-lime">4U</span></span>
            <span className="mt-1 block text-[7px] font-bold tracking-[0.34em] text-slate-300 sm:text-[8px]">LIFESTYLE IN YOUR WAY</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/products" aria-label="ค้นหาสินค้า" className="rounded-xl p-2 text-white transition hover:bg-white/10"><Search className="h-7 w-7" /></Link>
            <div className="[&_button]:border-0 [&_button]:bg-transparent [&_button]:p-2 [&_button]:shadow-none"><CartDrawer /></div>
            <Link href="/products" aria-label="เมนูสินค้า" className="rounded-xl p-2 text-white transition hover:bg-white/10"><Menu className="h-8 w-8" /></Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 pt-10 sm:px-7 sm:pt-14">
        <header className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <h1 className="text-4xl font-black tracking-tight sm:text-6xl">รีวิวจากลูกค้า</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300 sm:text-xl">เสียงจริง จากผู้ใช้งานจริง ขอบคุณที่ให้เราเป็นส่วนหนึ่งในทุกวัน</p>
          </div>
          <div className="hidden pb-1 text-right text-sm font-bold leading-6 text-slate-300 sm:block">ของแท้&nbsp; จัดส่งไว<br />ดูแลต่อเนื่อง<div className="ml-auto mt-3 h-1 w-14 rounded-full bg-acid-lime" /></div>
        </header>

        <PublicReviewsList previewData={previewData} />

        <section className="mt-8 overflow-hidden rounded-[1.6rem] border border-acid-lime/25 bg-[linear-gradient(135deg,rgba(212,255,20,0.12),rgba(9,22,45,0.88)_45%)] p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-acid-lime">
                <Star className="h-5 w-5 fill-current" />
                <p className="text-xs font-black uppercase tracking-[0.16em]">สิทธิพิเศษสำหรับสมาชิก</p>
              </div>
              <h2 className="mt-3 text-2xl font-black">เขียนรีวิว รับส่วนลด ฿5</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                รีวิวสินค้า การจัดส่ง บริการ หรือการใช้งานระบบได้ตั้งแต่มีออเดอร์ เมื่อผ่านการตรวจสอบ เครดิตจะถูกใช้กับออเดอร์ถัดไปอัตโนมัติค่ะ
              </p>
            </div>
            <Link href="/member#reviews" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-acid-lime px-6 py-4 font-black text-navy-deep shadow-lg shadow-acid-lime/10 transition hover:brightness-110">
              ไปเขียนรีวิว <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-[4.85rem] z-40 border-t border-white/10 bg-[#071126]/90 p-3 backdrop-blur-xl sm:hidden">
        <Link href="/member#reviews" className="mx-auto flex max-w-lg items-center justify-center gap-2 rounded-2xl bg-acid-lime px-5 py-3.5 font-black text-navy-deep shadow-xl">
          <MessageCircleMore className="h-5 w-5" /> เขียนรีวิว รับส่วนลด ฿5
        </Link>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-sky-300/10 bg-[#06152d]/95 px-4 pb-[max(0.7rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl" aria-label="เมนูหลัก">
        <div className="mx-auto grid w-full max-w-3xl grid-cols-5">
          {[
            ["/", "หน้าหลัก", Home],
            ["/products", "หมวดหมู่", Grid2X2],
            ["/reviews", "รีวิวจากลูกค้า", MessageCircleMore],
            ["/products", "รายการโปรด", Heart],
            ["/member", "บัญชี", UserRound],
          ].map(([href, label, Icon]) => (
            <Link key={label as string} href={href as string} className={`flex flex-col items-center gap-1 text-xs font-bold ${href === "/reviews" ? "text-acid-lime" : "text-slate-400"}`}>
              <Icon className="h-6 w-6" /><span>{label as string}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
