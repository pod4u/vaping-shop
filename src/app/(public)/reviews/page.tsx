import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, MessageCircleMore, ShieldCheck, Sparkles, Star } from "lucide-react";
import PublicReviewsList from "./PublicReviewsList";
import { getCanonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "รีวิวจากลูกค้า",
  description: "รีวิวจากคำสั่งซื้อจริงของสมาชิก Pod4U ทั้งสินค้า การจัดส่ง บริการ และการใช้งานระบบ",
  alternates: { canonical: getCanonical("/reviews") },
  openGraph: {
    title: "รีวิวจากลูกค้า Pod4U",
    description: "ทุกรีวิวเชื่อมกับออเดอร์ในระบบและผ่านการตรวจสอบก่อนเผยแพร่",
    url: getCanonical("/reviews"),
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function ReviewsPage() {
  return (
    <div className="relative isolate overflow-hidden pb-32 text-white sm:pb-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[42rem] bg-[radial-gradient(circle_at_78%_2%,rgba(59,130,246,0.22),transparent_36%),radial-gradient(circle_at_18%_22%,rgba(212,255,20,0.08),transparent_24%)]" />

      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-14">
        <header className="relative overflow-hidden rounded-[2rem] border border-sky-300/15 bg-[#09162d]/90 px-5 py-8 shadow-2xl shadow-black/25 sm:px-9 sm:py-11">
          <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full border border-sky-300/10 bg-sky-400/10 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-acid-lime/25 bg-acid-lime/[0.08] px-3 py-1.5 text-xs font-black text-acid-lime">
                <Sparkles className="h-4 w-4" /> เสียงจริงจากสมาชิก Pod4U
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">รีวิวจากลูกค้า</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                ประสบการณ์จากผู้ใช้งานที่มีคำสั่งซื้ออยู่ในระบบจริง เพื่อช่วยให้ลูกค้าคนต่อไปตัดสินใจได้ง่ายขึ้นค่ะ
              </p>
            </div>

            <div className="grid gap-2 text-xs font-bold text-slate-200 sm:grid-cols-2 lg:grid-cols-1">
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
                <BadgeCheck className="h-4 w-4 text-acid-lime" /> เชื่อมกับหมายเลขคำสั่งซื้อ
              </span>
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
                <ShieldCheck className="h-4 w-4 text-acid-lime" /> ซ่อนข้อมูลส่วนตัวก่อนเผยแพร่
              </span>
            </div>
          </div>
        </header>

        <PublicReviewsList />

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-acid-lime/25 bg-[linear-gradient(135deg,rgba(212,255,20,0.12),rgba(9,22,45,0.88)_45%)] p-6 sm:p-8">
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

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#071126]/90 p-3 backdrop-blur-xl sm:hidden">
        <Link href="/member#reviews" className="mx-auto flex max-w-lg items-center justify-center gap-2 rounded-2xl bg-acid-lime px-5 py-3.5 font-black text-navy-deep shadow-xl">
          <MessageCircleMore className="h-5 w-5" /> เขียนรีวิว รับส่วนลด ฿5
        </Link>
      </div>
    </div>
  );
}
