"use client";

import { useEffect, useState } from "react";
import type { Product } from "../types/product";
import { getCatalogProducts } from "@/lib/catalog";
import ProductCard from "./ProductCard";
import Link from "next/link";

export default function FeaturedProducts() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  useEffect(() => { getCatalogProducts().then((items) => setFeaturedProducts(items.filter((item) => item.inStock).slice(0, 4))).catch(console.error); }, []);
  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Multi-layer depth background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top gradient */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-brand-void to-transparent"></div>

        {/* Ambient glows */}
        <div className="absolute top-1/3 left-[10%] w-[400px] h-[400px] bg-vapor-violet/12 rounded-full blur-[120px] animate-float-slow"></div>
        <div className="absolute bottom-1/4 right-[15%] w-[300px] h-[300px] bg-acid-lime/8 rounded-full blur-[100px] animate-float-slow" style={{ animationDelay: '-2s' }}></div>

        {/* Subtle grid */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(91,19,236,0.03)_1px,transparent_1px)] bg-[size:36px_36px] opacity-50"></div>

        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-brand-void to-transparent"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
          <div>
            <div className="text-acid-lime text-xs font-mono tracking-widest uppercase mb-2">TOP PICKS</div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              สินค้าแนะนำ
            </h2>
          </div>
          <Link
            href="/products"
            className="mt-3 sm:mt-0 inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-acid-lime transition-colors group"
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
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        <div className="mt-10 text-center sm:hidden">
          <Link
            href="/products"
            className="w-full btn-vapor-outline px-6 py-3.5 rounded-full text-sm font-bold inline-flex items-center justify-center gap-2 btn-press"
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
