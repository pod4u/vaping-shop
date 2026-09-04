"use client";

import { storeConfig } from "@/lib/config";
import Image from "next/image";

export default function HeroVideoNavy() {
  return (
    <section className="relative min-h-[82svh] lg:min-h-screen flex items-center overflow-hidden">
      {/* Full Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero-bg.png"
          alt="Premium Vape Products"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[68%_center] lg:object-center"
        />
        {/* Dark Gradient Overlay - Left side for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-navy-deep via-navy-deep/70 to-transparent lg:w-[55%]"></div>
        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-navy-deep to-transparent"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-10 sm:py-16 lg:py-20">
        <div className="max-w-xl">
          {/* Small Tag */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/20 backdrop-blur-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            <span className="text-white/80 text-sm font-medium tracking-wide">POD4U</span>
          </div>

          {/* Main Title - Glowing White/Blue Gradient */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight mb-4 leading-[1.1]">
            <span 
              className="block drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]"
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #93c5fd 50%, #ffffff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: '0 0 40px rgba(255,255,255,0.3)',
              }}
            >
              Pod4U
            </span>
            <span 
              className="block mt-1 drop-shadow-[0_0_25px_rgba(147,197,253,0.5)]"
              style={{
                background: 'linear-gradient(135deg, #93c5fd 0%, #ffffff 50%, #93c5fd 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: '0 0 35px rgba(147,197,253,0.3)',
              }}
            >
              SHOP
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-white/80 text-lg sm:text-xl max-w-lg mb-8 leading-relaxed">
            {storeConfig.tagline}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-start gap-3 mb-8 sm:mb-10">
            {/* LINE Button - Green */}
            <a
              href={storeConfig.lineLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative w-full sm:w-auto justify-center px-7 py-3.5 rounded-full text-sm font-bold tracking-wide inline-flex items-center gap-2.5 overflow-hidden transition-all duration-300 hover:scale-105"
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
              className="w-full sm:w-auto justify-center px-7 py-3.5 rounded-full text-sm font-bold tracking-wide inline-flex items-center gap-2 border-2 border-white/50 text-white backdrop-blur-sm transition-all duration-300 hover:border-white hover:bg-white/10"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              ดูสินค้าทั้งหมด
            </a>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-6">
            <div>
              <div className="text-white text-2xl font-bold drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">500+</div>
              <div className="text-white/50 text-xs sm:text-sm">สินค้าพร้อมส่ง</div>
            </div>
            <div className="w-px h-10 bg-white/20"></div>
            <div>
              <div className="text-white text-2xl font-bold drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">24h</div>
              <div className="text-white/50 text-xs sm:text-sm">บริการตลอด</div>
            </div>
            <div className="w-px h-10 bg-white/20"></div>
            <div>
              <div className="text-white text-2xl font-bold drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">ส่งฟรี</div>
              <div className="text-white/50 text-xs sm:text-sm">ทั่วไทย</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
