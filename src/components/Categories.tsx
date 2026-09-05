"use client";

import Link from "next/link";
import { categories } from "../lib/config";

export default function Categories() {
  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Section ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top gradient fade */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-brand-void to-transparent"></div>
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-vapor-violet/10 rounded-full blur-[100px]"></div>
        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-brand-void to-transparent"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
          <div>
            <div className="text-acid-lime text-xs font-mono tracking-widest uppercase mb-2">CATALOG</div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              หมวดหมู่สินค้า
            </h2>
          </div>
          <p className="text-white/50 text-sm mt-2 sm:mt-0 font-normal">เลือกประเภทสินค้าที่ต้องการใช้งาน</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat, index) => (
            <Link
              key={cat.id}
              href={`/categories/${cat.id}`}
              className="group"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="vapor-card rounded-2xl p-5 text-center h-full flex flex-col items-center justify-center relative overflow-hidden group-hover:border-acid-lime/60 transition-all duration-300 card-tilt animate-slide-up">
                {/* Multi-layer hover effects */}
                <div className="absolute inset-0 bg-gradient-to-t from-vapor-violet/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* Glow pulse on hover */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-acid-lime/10 rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* Icon container with depth */}
                <div className="relative z-10 w-16 h-16 rounded-2xl bg-brand-surface border border-brand-border flex items-center justify-center text-3xl mb-4 group-hover:scale-110 group-hover:border-acid-lime/40 group-hover:shadow-lg group-hover:shadow-acid-lime/20 transition-all duration-300">
                  {/* Inner glow */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative z-10">{cat.icon}</span>
                </div>

                <h3 className="relative z-10 text-white font-bold text-base mb-1 group-hover:text-acid-lime transition-colors duration-300">
                  {cat.nameTh}
                </h3>
                <p className="relative z-10 text-white/40 text-xs font-mono uppercase tracking-wider">{cat.name}</p>

                {/* Bottom highlight line */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-1 bg-acid-lime rounded-full group-hover:w-16 transition-all duration-300"></div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}