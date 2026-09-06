import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { blogPosts } from "@/data/blog";
import { getCanonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "บทความและคู่มือเลือกสินค้า",
  description: "อ่านคู่มือเกี่ยวกับ Pod การดูแลอุปกรณ์ รสชาติ MARBO และ M BAR พร้อมข้อมูลสินค้าล่าสุดจาก Pod4U",
  alternates: { canonical: getCanonical("/blog") },
  openGraph: { title: "บทความและคู่มือจาก Pod4U", description: "คู่มือที่อ่านง่าย พร้อมข้อมูลสินค้าและรสชาติที่อัปเดตจากแคตตาล็อก", url: getCanonical("/blog"), siteName: "Pod4U", locale: "th_TH" },
};

function formatArticleDate(date: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date(`${date}T00:00:00+07:00`));
}

export default function BlogPage() {
  const sortedPosts = [...blogPosts].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  return (
    <div className="pt-28 pb-16 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-mono text-white/50 mb-6">
          <Link href="/" className="hover:text-acid-lime transition-colors">หน้าแรก</Link>
          <span>/</span>
          <span className="text-acid-lime font-bold">บทความ</span>
        </nav>

        {/* Header */}
        <header className="mb-10">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-acid-lime">Pod4U Guides</p>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">บทความและคู่มือเลือกสินค้า</h1>
          <p className="text-white/60 text-base max-w-3xl leading-relaxed">คำอธิบายที่อ่านง่ายสำหรับคนที่กำลังเปรียบเทียบรุ่น ดูรสชาติ หรือหาวิธีดูแลอุปกรณ์ พร้อมลิงก์ไปยังข้อมูลสินค้าล่าสุด</p>
        </header>

        {/* Posts */}
        <div className="space-y-6">
          {sortedPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block navy-card rounded-2xl overflow-hidden border border-white/10 hover:border-acid-lime/30 transition-all"
            >
              <div className="flex flex-col sm:flex-row">
                <div className="relative h-48 flex-shrink-0 overflow-hidden bg-navy-deep/80 sm:h-auto sm:w-48">
                  <Image
                    src={post.image}
                    alt={post.imageAlt}
                    fill
                    sizes="(max-width: 640px) 100vw, 192px"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded bg-acid-lime/10 text-acid-lime text-[10px] font-mono uppercase">{post.category}</span>
                    <time dateTime={post.updatedAt || post.date} className="text-white/30 text-xs">อัปเดต {formatArticleDate(post.updatedAt || post.date)}</time>
                  </div>
                  <h2 className="text-white font-bold text-lg group-hover:text-acid-lime transition-colors mb-1">{post.title}</h2>
                  <p className="text-white/50 text-sm line-clamp-2">{post.excerpt}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
