import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, MessageSquareText, Package, ShieldCheck, Star } from "lucide-react";
import PublicReviewsList from "./PublicReviewsList";
import { getCanonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "รีวิวจากลูกค้า",
  description: "อ่านรีวิวประสบการณ์สั่งซื้อ การใช้งานระบบ บริการ สินค้า และการจัดส่งจากสมาชิก Pod4U",
  alternates: { canonical: getCanonical("/reviews") },
  openGraph: {
    title: "รีวิวจากลูกค้า Pod4U",
    description: "รีวิวจากสมาชิกที่มีออเดอร์ในระบบและผ่านการตรวจสอบก่อนเผยแพร่",
    url: getCanonical("/reviews"),
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function ReviewsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:pt-12">
      <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/15 via-white/[0.05] to-acid-lime/10 px-5 py-10 text-center sm:px-10 sm:py-14">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-acid-lime/10 blur-3xl" aria-hidden="true" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-acid-lime/25 bg-acid-lime/[0.08] px-3 py-1.5 text-xs font-black text-acid-lime"><MessageSquareText className="h-4 w-4" />เสียงจากสมาชิก Pod4U</span>
          <h1 className="mt-5 text-3xl font-black text-white sm:text-5xl">รีวิวจากลูกค้า</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">ประสบการณ์สั่งซื้อ การใช้งานระบบ บริการ สินค้า และการจัดส่ง จากสมาชิกที่มีออเดอร์ในระบบ</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs font-bold">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-white/65"><BadgeCheck className="h-4 w-4 text-acid-lime" />ตรวจสอบก่อนเผยแพร่</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-white/65"><ShieldCheck className="h-4 w-4 text-acid-lime" />ไม่แสดงข้อมูลส่วนตัว</span>
          </div>
        </div>
      </header>

      <PublicReviewsList />

      <div className="mt-12 rounded-3xl border border-acid-lime/30 bg-gradient-to-br from-acid-lime/10 to-transparent p-6 text-center sm:p-8">
        <Star className="mx-auto h-9 w-9 fill-amber-400 text-amber-400" />
        <h2 className="mt-3 text-xl font-black text-white">มีออเดอร์แล้ว เขียนรีวิวรับส่วนลด ฿5</h2>
        <p className="mt-2 text-sm leading-6 text-white/60">ส่งรีวิวจากหน้า Member และรอแอดมินตรวจสอบ เมื่ออนุมัติแล้วระบบจะใช้ส่วนลดกับออเดอร์ถัดไปโดยอัตโนมัติค่ะ</p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/stock" className="inline-flex items-center justify-center gap-2 rounded-xl bg-acid-lime px-6 py-3 font-black text-navy-deep">
            <Package className="h-5 w-5" />
            ดูสินค้าพร้อมส่ง
          </Link>
          <Link href="/member" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-6 py-3 font-bold text-white hover:bg-white/5">
            ดูสถานะออเดอร์ของฉัน
          </Link>
        </div>
      </div>
    </div>
  );
}
