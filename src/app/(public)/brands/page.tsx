"use client";

import Link from "next/link";
import { brands } from "@/lib/brands";

export default function BrandsPage() {
  return (
    <div className="min-h-screen bg-brand-void">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-brand-void/80 backdrop-blur-xl border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-vapor-violet/20 border border-vapor-violet/50 flex items-center justify-center group-hover:border-acid-lime transition-all">
                <span className="text-xl">💨</span>
              </div>
              <span className="text-xl font-black text-white">
                VAPING <span className="text-acid-lime">SHOP</span>
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-16 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-vapor-violet/20 rounded-full blur-[150px]"></div>
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-acid-lime/10 rounded-full blur-[120px]"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-surface border border-brand-border mb-6">
            <span className="text-acid-lime text-xs font-mono tracking-wider uppercase">
              ALL BRANDS
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white mb-4">
            เลือก <span className="text-acid-lime">แบรนด์</span> ที่คุณชอบ
          </h1>
          <p className="text-lg text-white/50 max-w-2xl mx-auto">
            รวมแบรนด์พอตใช้แล้วทิ้งคุณภาพดี หลากหลายราคา หลากหลายระบบ
          </p>
        </div>
      </section>

      {/* Brands Grid */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {brands.map((brand, index) => (
              <Link
                key={brand.id}
                href={`/brand/${brand.slug}`}
                className="group block animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="vapor-card rounded-2xl overflow-hidden h-full card-tilt relative">
                  {/* Brand color accent */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: brand.color }}
                  ></div>

                  {/* Background glow on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: `radial-gradient(circle at center, ${brand.color}15 0%, transparent 70%)` }}
                  ></div>

                  <div className="p-6">
                    {/* Brand Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-black text-white group-hover:text-acid-lime transition-colors">
                          {brand.name}
                        </h2>
                        <p className="text-white/60 text-sm">{brand.nameTh}</p>
                      </div>
                      
                      {brand.puffCount > 0 && (
                        <div
                          className="px-3 py-1 rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: `${brand.color}30` }}
                        >
                          {brand.puffCount >= 1000 ? `${brand.puffCount / 1000}K` : brand.puffCount} Puffs
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-white/50 text-sm mb-4 line-clamp-2">
                      {brand.description}
                    </p>

                    {/* Flavors Preview */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {brand.flavors.slice(0, 5).map((flavor) => (
                        <span
                          key={flavor.id}
                          className="px-2 py-1 rounded text-xs text-white/70"
                          style={{ backgroundColor: `${flavor.color || '#fff'}20` }}
                        >
                          {flavor.nameTh}
                        </span>
                      ))}
                      {brand.flavors.length > 5 && (
                        <span className="px-2 py-1 rounded text-xs text-white/40 bg-white/5">
                          +{brand.flavors.length - 5} รสชาติ
                        </span>
                      )}
                    </div>

                    {/* View More */}
                    <div className="flex items-center gap-2 text-acid-lime text-sm font-medium group-hover:gap-3 transition-all">
                      <span>ดูรายละเอียด</span>
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-brand-border">
        <div className="max-w-7xl mx-auto text-center">
          <Link href="/" className="text-acid-lime text-sm hover:underline">
            ← กลับหน้าร้าน
          </Link>
        </div>
      </footer>
    </div>
  );
}