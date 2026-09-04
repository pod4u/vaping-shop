"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Product } from "@/types/product";
import { getCatalogProducts } from "@/lib/catalog";
import { categories } from "@/lib/config";
import ProductCard from "@/components/ProductCard";

function ProductsContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const searchParam = searchParams.get("search");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryParam);
  const [searchQuery, setSearchQuery] = useState(searchParam || "");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCatalogProducts()
      .then(setProducts)
      .catch((error) => console.error("Unable to load catalog", error))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [categoryParam]);

  useEffect(() => {
    if (searchParam) {
      setSearchQuery(searchParam);
    }
  }, [searchParam]);

  const filteredProducts = products.filter((product) => {
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (isLoading) {
    return <div className="vapor-card rounded-2xl p-12 text-center text-white/50">กำลังโหลดข้อมูลสินค้า...</div>;
  }

  return (
    <>
      {/* Hero Section */}
      <section className="relative pb-8 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-acid-lime/20 via-green-500/10 to-navy-deep"></div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5"></div>

        {/* Animated Shapes */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-acid-lime/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-green-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

        <div className="relative max-w-7xl mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left - Text */}
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-acid-lime/20 text-acid-lime px-4 py-1.5 rounded-full text-xs font-bold mb-4">
                <span className="w-2 h-2 rounded-full bg-acid-lime animate-pulse"></span>
                พร้อมส่งทันที
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
                {selectedCategory
                  ? categories.find(c => c.id === selectedCategory)?.nameTh || "สินค้าทั้งหมด"
                  : "สินค้าทั้งหมด"}
              </h1>
              <p className="text-white/60 text-sm sm:text-base">
                {filteredProducts.length} รายการ • คุณภาพระดับพรีเมียม • ของแท้ 100%
              </p>
            </div>

            {/* Right - Visual */}
            <div className="relative">
              <div className="w-48 h-48 relative">
                {/* Glowing Circle */}
                <div className="absolute inset-0 bg-gradient-to-br from-acid-lime/30 to-green-500/30 rounded-full animate-pulse"></div>

                {/* Product Icons */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-6xl">💨</div>
                </div>

                {/* Floating Elements */}
                <div className="absolute -top-2 -right-2 bg-acid-lime text-navy-deep text-xs font-bold px-3 py-1 rounded-full shadow-acid animate-bounce">
                  พร้อมส่ง
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Border */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-acid-lime/30 to-transparent"></div>
      </section>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        {/* Search */}
        <div className="relative flex-1">
          <div className="relative vapor-card rounded-xl border border-brand-border">
            <input
              type="text"
              placeholder="ค้นหารุ่นสินค้า, กลิ่น, รสชาติ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent px-5 py-3.5 pl-12 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-acid-lime rounded-xl text-sm"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Category Filter Select */}
        <div className="relative">
          <select
            value={selectedCategory || ""}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="vapor-card rounded-xl px-5 py-3.5 pr-10 text-white focus:outline-none focus:ring-1 focus:ring-acid-lime min-w-[220px] appearance-none cursor-pointer text-sm"
          >
            <option value="" className="bg-brand-dark text-white">ทุกหมวดหมู่สินค้า</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id} className="bg-brand-dark text-white">
                {cat.nameTh} ({cat.name})
              </option>
            ))}
          </select>
          <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2.5 mb-10">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-5 py-2 rounded-full text-xs font-bold font-mono tracking-wider transition-all duration-200 ${
            !selectedCategory
              ? "btn-acid text-black shadow-acid-sm"
              : "bg-brand-surface border border-brand-border text-white/70 hover:border-acid-lime/40 hover:text-white"
          }`}
        >
          ALL (ทั้งหมด)
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
              selectedCategory === cat.id
                ? "btn-acid text-black shadow-acid-sm font-bold"
                : "bg-brand-surface border border-brand-border text-white/70 hover:border-acid-lime/40 hover:text-white"
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.nameTh}</span>
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 vapor-card rounded-2xl border border-brand-border">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-xl text-white font-bold mb-2">ไม่พบสินค้าที่คุณค้นหา</h3>
          <p className="text-white/50 text-sm">ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่นดูใหม่อีกครั้ง</p>
        </div>
      )}
    </>
  );
}

export default function ProductsPage() {
  return (
    <div className="pt-28 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 text-left">
          <div className="text-acid-lime text-xs font-mono tracking-widest uppercase mb-2">EXPLORE ALL</div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-2">
            สินค้าทั้งหมด
          </h1>
          <p className="text-white/50 text-sm">เลือกสรรสินค้าคุณภาพเยี่ยม ครบทุกประเภท พร้อมส่งทันที</p>
        </div>

        {/* Flashing Ready-to-Ship Button */}
        <div className="mb-10">
          <Link
            href="/stock"
            className="inline-flex items-center gap-3 bg-acid-lime text-navy-deep px-6 py-3.5 rounded-full font-bold text-sm shadow-acid animate-[pulse_1.5s_ease-in-out_infinite] hover:animate-none hover:scale-105 transition-transform"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-navy-deep opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-navy-deep"></span>
            </span>
            <span>ดูสินค้าพร้อมส่ง</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <Suspense fallback={
          <div className="vapor-card rounded-2xl p-12 text-center">
            <div className="animate-pulse text-white/50 font-mono text-sm">กำลังโหลดข้อมูลสินค้า...</div>
          </div>
        }>
          <ProductsContent />
        </Suspense>
      </div>
    </div>
  );
}
