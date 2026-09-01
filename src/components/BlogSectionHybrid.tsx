"use client";

import Link from "next/link";
import { blogPosts } from "../data/blog";

export default function BlogSectionHybrid() {
  return (
    <section className="py-20 px-4 relative">
      <div className="max-w-7xl mx-auto relative">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
          <div>
            <div className="text-hybrid-blue text-xs font-mono tracking-widest uppercase mb-2">STORIES &amp; TIPS</div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              บทความน่ารู้
            </h2>
          </div>
          <p className="text-white/50 text-sm mt-2 sm:mt-0 font-normal">ความรู้และข่าวสารล่าสุดเกี่ยวกับพอตไฟฟ้า</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {blogPosts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group block h-full">
              <div className="hybrid-card rounded-2xl overflow-hidden hover:border-hybrid-glow-bright/50 transition-all duration-300 h-full flex flex-col">
                <div className="aspect-video overflow-hidden bg-hybrid-deep relative">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://placehold.co/600x400/020617/3b82f6?text=Blog";
                    }}
                  />
                  <div className="absolute top-3 left-3 bg-hybrid-surface/90 backdrop-blur-md border border-hybrid-border text-hybrid-blue text-xs font-mono font-bold px-2.5 py-1 rounded-md uppercase">
                    {post.category}
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-white font-bold text-lg mb-2 group-hover:text-hybrid-blue transition-colors duration-200 line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-white/50 text-sm line-clamp-2 leading-relaxed mb-4">{post.excerpt}</p>
                  </div>
                  <div className="text-white/40 text-xs font-mono pt-4 border-t border-hybrid-border/60 flex items-center justify-between">
                    <span>{post.date}</span>
                    <span className="text-hybrid-blue group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
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