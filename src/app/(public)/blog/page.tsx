import type { Metadata } from "next";
import Link from "next/link";
import { blogPosts } from "@/data/blog";
import { APP_URL, getCanonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "บทความและความรู้เกี่ยวกับพอด",
  description: "รวมบทความ ความรู้ และเทคนิคเกี่ยวกับพอดไฟฟ้า จาก Pod4U",
  alternates: { canonical: getCanonical("/blog") },
  openGraph: { title: "บทความและความรู้", description: "รวมบทความเกี่ยวกับพอดไฟฟ้า", url: getCanonical("/blog"), siteName: "Pod4U", locale: "th_TH" },
};

export default function BlogPage() {
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
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">บทความและความรู้</h1>
          <p className="text-white/60 text-base">รวมความรู้ เทคนิค และข่าวสารเกี่ยวกับพอดไฟฟ้า</p>
        </header>

        {/* Posts */}
        <div className="space-y-6">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block navy-card rounded-2xl overflow-hidden border border-white/10 hover:border-acid-lime/30 transition-all"
            >
              <div className="flex flex-col sm:flex-row">
                <div className="sm:w-48 h-48 sm:h-auto flex-shrink-0 overflow-hidden bg-navy-deep/80">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded bg-acid-lime/10 text-acid-lime text-[10px] font-mono uppercase">{post.category}</span>
                    <span className="text-white/30 text-xs">{post.date}</span>
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
