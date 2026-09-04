"use client";

import Link from "next/link";
import { blogPosts } from "../data/blog";

export default function BlogSectionNavy() {
  return (
    <section className="py-20 px-4 relative">
      <div className="max-w-7xl mx-auto relative">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
          <div>
            <div className="text-acid-lime text-xs font-mono tracking-widest uppercase mb-2">STORIES &amp; TIPS</div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              บทความน่ารู้
            </h2>
          </div>
          <p className="text-white/50 text-sm mt-2 sm:mt-0 font-normal">ความรู้และข่าวสารล่าสุดเกี่ยวกับพอดไฟฟ้า</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {blogPosts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group block h-full">
              <div className="navy-card rounded-2xl overflow-hidden hover:border-acid-lime/50 transition-all duration-300 h-full flex flex-col">
                <div className="aspect-video overflow-hidden bg-navy-deep relative">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://placehold.co/600x400/0f172a/3b82f6?text=Blog";
                    }}
                  />
                  <div className="absolute top-3 left-3 bg-navy-surface/90 backdrop-blur-md border border-navy-border text-acid-lime text-xs font-mono font-bold px-2.5 py-1 rounded-md uppercase">
                    {post.category}
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-white font-bold text-lg mb-2 group-hover:text-acid-lime transition-colors duration-200 line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-white/50 text-sm line-clamp-2 leading-relaxed mb-4">{post.excerpt}</p>
                  </div>
                  <div className="text-white/40 text-xs font-mono pt-4 border-t border-navy-border/60 flex items-center justify-between">
                    <span>{post.date}</span>
                    <span className="text-acid-lime group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      อ่านต่อ &rarr;
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}