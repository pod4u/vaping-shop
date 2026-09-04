"use client";

import Link from "next/link";
import Image from "next/image";
import { Brand } from "@/lib/brands";
import { storeConfig } from "@/lib/config";

interface BrandPageProps {
  brand: Brand;
}

export default function BrandPage({ brand }: BrandPageProps) {
  const formatPuffCount = (count: number) => {
    if (count >= 1000) {
      return `${count / 1000}K`;
    }
    return count.toString();
  };

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
                Pod<span className="text-acid-lime">4U</span>
              </span>
            </Link>

            <Link
              href="/brands"
              className="text-white/70 hover:text-acid-lime text-sm font-medium transition-colors"
            >
              ← ดูแบรนด์ทั้งหมด
            </Link>
          </div>
        </div>
      </header>

      {/* Brand Hero */}
      <section className="relative py-16 px-4 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full blur-[150px]"
            style={{ backgroundColor: `${brand.color}20` }}
          ></div>
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-acid-lime/10 rounded-full blur-[120px]"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center">
            {/* Brand Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
              style={{ backgroundColor: `${brand.color}20`, borderColor: `${brand.color}40`, borderWidth: 1 }}
            >
              {brand.puffCount > 0 && (
                <span className="text-white/90 text-xs font-mono tracking-wider uppercase">
                  {formatPuffCount(brand.puffCount)} PUFFS
                </span>
              )}
            </div>

            {/* Brand Name */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-4">
              {brand.name}
            </h1>
            <p className="text-xl text-white/60 mb-4">{brand.nameTh}</p>
            <p className="text-lg text-white/50 max-w-2xl mx-auto">{brand.description}</p>

            {/* CTA Button */}
            <div className="mt-8">
              <a
                href={storeConfig.lineLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-acid px-8 py-4 rounded-full text-base font-extrabold inline-flex items-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 5.58 2 10c0 2.12.92 4.04 2.42 5.44L3 22l6.4-3.2c.84.13 1.71.2 2.6.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
                </svg>
                สั่งซื้อผ่าน LINE
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Flavors Grid */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-black text-white">
              รสชาติทั้งหมด ({brand.flavors.length})
            </h2>
            <span className="text-white/50 text-sm">เลือกรสชาติที่คุณชอบ</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {brand.flavors.map((flavor, index) => (
              <div
                key={flavor.id}
                className="group vapor-card rounded-2xl overflow-hidden card-tilt animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Flavor Image */}
                <div className="relative aspect-square bg-brand-void overflow-hidden">
                  <Image
                    src={flavor.image}
                    alt={flavor.name}
                    fill
                    className="object-contain group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  />
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-void/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                    <span className="text-acid-lime text-sm font-bold">สั่งซื้อ</span>
                  </div>
                </div>

                {/* Flavor Info */}
                <div className="p-4 text-center">
                  <h3 className="text-white font-bold text-sm mb-1 group-hover:text-acid-lime transition-colors">
                    {flavor.nameTh}
                  </h3>
                  <p className="text-white/40 text-xs">{flavor.name}</p>
                  
                  {/* Color indicator */}
                  {flavor.color && (
                    <div
                      className="w-3 h-3 rounded-full mx-auto mt-2"
                      style={{ backgroundColor: flavor.color }}
                    ></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Order CTA */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="vapor-card rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0 pointer-events-none">
              <div
                className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px]"
                style={{ backgroundColor: `${brand.color}20` }}
              ></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-acid-lime/10 rounded-full blur-[60px]"></div>
            </div>

            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-black text-white mb-4">
                สนใจ {brand.nameTh}?
              </h2>
              <p className="text-white/60 mb-6">
                ทัก LINE ได้เลย แอดมินพร้อมตอบและส่งรูปสินค้าจริงให้ดูก่อนสั่งซื้อ
              </p>
              <a
                href={storeConfig.lineLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-acid px-8 py-4 rounded-full text-base font-extrabold inline-flex items-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 5.58 2 10c0 2.12.92 4.04 2.42 5.44L3 22l6.4-3.2c.84.13 1.71.2 2.6.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
                </svg>
                ติดต่อผ่าน LINE
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-brand-border">
        <div className="max-w-7xl mx-auto text-center">
          <Link href="/" className="text-acid-lime text-sm hover:underline">
            ← กลับหน้าร้าน
          </Link>
        </div>
      </footer>
    </div>
  );
}