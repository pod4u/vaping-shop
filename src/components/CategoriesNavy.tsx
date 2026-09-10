"use client";

import Link from "next/link";
import { categories } from "../lib/config";

export default function CategoriesNavy() {
  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Section ambient background with curved blur glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#020617] to-transparent"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] rounded-[100%] bg-blue-600/10 blur-[90px]"></div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#020617] to-transparent"></div>
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
          {categories.map((cat, index) => {
            // Give subtle accent variation using site palette (Blue, Lime, Cyan)
            const colorVariant = index % 3 === 0 ? "blue" : index % 3 === 1 ? "lime" : "cyan";
            return (
              <Link
                key={cat.id}
                href={`/categories/${cat.id}`}
                className="group"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="navy-card rounded-2xl p-5 text-center h-full flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300">
                  {/* Curved Blur Arc Dome Glow on Card Top */}
                  <div 
                    className="absolute -top-10 left-1/2 -translate-x-1/2 w-36 h-24 rounded-[100%] blur-[25px] opacity-35 group-hover:opacity-85 group-hover:scale-125 transition-all duration-500 pointer-events-none"
                    style={{
                      background: 'radial-gradient(ellipse at 50% 0%, rgba(138, 171, 255, 0.8) 0%, rgba(43, 95, 255, 0.4) 50%, transparent 80%)'
                    }}
                  ></div>

                  {/* Dual-Layer 3D Liquid Glass Squircle (ตามตัวอย่าง Figma 4-step) */}
                  <div className="glass-squircle-container w-16 h-16 mb-4">
                    {/* Layer 1: Back Gradient Plate */}
                    <div className={`glass-squircle-back ${colorVariant !== "blue" ? colorVariant : ""}`}></div>
                    
                    {/* Layer 2: Front Liquid Frosted Glass Plate */}
                    <div className="glass-squircle-front w-full h-full flex items-center justify-center text-3xl">
                      <span className="relative z-10 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] transform group-hover:scale-110 transition-transform duration-300">
                        {cat.icon}
                      </span>
                    </div>
                  </div>

                  <h3 className="relative z-10 text-white font-bold text-base mb-1 group-hover:text-acid-lime transition-colors duration-300">
                    {cat.nameTh}
                  </h3>
                  <div className="relative z-10 text-white/50 text-xs font-mono uppercase tracking-wider flex items-center gap-1 group-hover:text-white/80 transition-colors">
                    <span className="text-acid-lime text-[10px]">&gt;</span> {cat.name}
                  </div>

                  {/* Bottom highlight line */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-acid-lime rounded-full group-hover:w-16 transition-all duration-300"></div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}