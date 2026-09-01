"use client";

import { featuredProducts } from "../data/products";
import ProductCardHybrid from "./ProductCardHybrid";
import Link from "next/link";

export default function FeaturedProductsHybrid() {
  return (
    <section className="py-20 px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-hybrid-deep to-transparent"></div>
        <div className="absolute top-1/3 left-[10%] w-[400px] h-[400px] bg-hybrid-glow/10 rounded-full blur-[120px] animate-float-slow"></div>
        <div className="absolute bottom-1/4 right-[15%] w-[300px] h-[300px] bg-hybrid-glow-bright/6 rounded-full blur-[100px] animate-float-slow" style={{ animationDelay: '-2s' }}></div>
        <div className="absolute inset-0 bg-[radial-gradient(rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:36px_36px] opacity-50"></div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-hybrid-deep to-transparent"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
          <div>
            <div className="text-hybrid-glow-bright text-xs font-mono tracking-widest uppercase mb-2">TOP PICKS</div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              สินค้าแนะนำ
            </h2>
          </div>
          <Link
            href="/products"
            className="mt-3 sm:mt-0 inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-hybrid-glow-bright transition-colors group"
          >
            ดูทั้งหมด
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product, index) => (
            <div key={product.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
              <ProductCardHybrid product={product} />
            </div>
          ))}
        </div>

        <div className="mt-10 text-center sm:hidden">
          <Link
            href="/products"
            className="w-full btn-hybrid-outline px-6 py-3.5 rounded-full text-sm font-bold inline-flex items-center justify-center gap-2 btn-press"
          >
            ดูสินค้าทั้งหมด
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}