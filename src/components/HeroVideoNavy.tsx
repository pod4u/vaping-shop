"use client";

import { storeConfig } from "@/lib/config";

export default function HeroVideoNavy() {
  return (
    <section className="relative min-h-[100vh] flex items-center overflow-hidden">
      {/* Full Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/hero-bg.png"
          alt="Premium Vape Products"
          className="w-full h-full object-cover object-center"
        />
        {/* Dark Gradient Overlay - Left side for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-navy-deep via-navy-deep/80 to-transparent lg:w-[60%]"></div>
        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-navy-deep to-transparent"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-20">
        <div className="max-w-xl">
          {/* Small Tag */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-acid-lime/10 border border-acid-lime/30 backdrop-blur-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-acid-lime animate-pulse"></span>
            <span className="text-acid-lime text-sm font-medium tracking-wide">PREMIUM VAPE SHOP</span>
          </div>

          {/* Main Title */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight mb-4 leading-[1.1]">
            <span className="bg-gradient-to-r from-white via-acid-lime to-white bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(212,255,20,0.3)]">
              VAPING
            </span>
            <span className="block mt-1 bg-gradient-to-r from-acid-lime via-white to-acid-lime bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              SHOP
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-white/80 text-lg sm:text-xl max-w-lg mb-8 leading-relaxed">
            {storeConfig.tagline}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-start gap-3 mb-10">
            {/* LINE Button */}
            <a
              href={storeConfig.lineLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative px-7 py-3.5 rounded-full text-sm font-bold tracking-wide inline-flex items-center gap-2.5 overflow-hidden transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #d4ff14 0%, #a3e635 100%)',
                color: '#0f172a',
                boxShadow: '0 0 30px -5px rgba(212, 255, 20, 0.5)',
              }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 5.58 2 10c0 2.12.92 4.04 2.42 5.44L3 22l6.4-3.2c.84.13 1.71.2 2.6.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
              </svg>
              แชทสั่งซื้อผ่าน LINE
            </a>

            {/* Secondary Button */}
            <a
              href="/products"
              className="px-7 py-3.5 rounded-full text-sm font-bold tracking-wide inline-flex items-center gap-2 border-2 border-white/50 text-white backdrop-blur-sm transition-all duration-300 hover:border-white hover:bg-white/10"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              ดูสินค้าทั้งหมด
            </a>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6">
            <div>
              <div className="text-acid-lime text-2xl font-bold">500+</div>
              <div className="text-white/50 text-sm">สินค้าพร้อมส่ง</div>
            </div>
            <div className="w-px h-10 bg-white/20"></div>
            <div>
              <div className="text-acid-lime text-2xl font-bold">24h</div>
              <div className="text-white/50 text-sm">บริการตลอด</div>
            </div>
            <div className="w-px h-10 bg-white/20"></div>
            <div>
              <div className="text-acid-lime text-2xl font-bold">ส่งฟรี</div>
              <div className="text-white/50 text-sm">ทั่วไทย</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}