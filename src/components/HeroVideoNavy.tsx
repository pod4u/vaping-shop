"use client";

import { storeConfig } from "@/lib/config";

export default function HeroVideoNavy() {
  return (
    <section className="relative min-h-[100vh] flex items-center overflow-hidden bg-navy-deep">
      {/* Main Content - Two Columns */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-4 items-center min-h-[80vh]">
          
          {/* Left Side - Text Content (30%) */}
          <div className="text-center lg:text-left order-2 lg:order-1 lg:pr-8">
            {/* Small Tag */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-acid-lime/10 border border-acid-lime/30 mb-6">
              <span className="w-2 h-2 rounded-full bg-acid-lime animate-pulse"></span>
              <span className="text-acid-lime text-sm font-medium tracking-wide">PREMIUM VAPE SHOP</span>
            </div>

            {/* Main Title */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-4 leading-[1.1]">
              <span className="bg-gradient-to-r from-white via-acid-lime to-white bg-clip-text text-transparent">
                VAPING
              </span>
              <span className="block mt-1 bg-gradient-to-r from-acid-lime via-white to-acid-lime bg-clip-text text-transparent">
                SHOP
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-white/70 text-base sm:text-lg md:text-xl max-w-md mx-auto lg:mx-0 mb-8 leading-relaxed font-light">
              {storeConfig.tagline}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mb-8">
              {/* LINE Button */}
              <a
                href={storeConfig.lineLink}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative px-6 py-3 rounded-full text-sm font-bold tracking-wide inline-flex items-center gap-2 overflow-hidden transition-all duration-300 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #d4ff14 0%, #a3e635 100%)',
                  color: '#0f172a',
                  boxShadow: '0 0 25px -5px rgba(212, 255, 20, 0.5)',
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
                className="px-6 py-3 rounded-full text-sm font-bold tracking-wide inline-flex items-center gap-2 border-2 border-white/40 text-white transition-all duration-300 hover:border-white hover:bg-white/10"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                ดูสินค้าทั้งหมด
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto lg:mx-0">
              <div className="text-center lg:text-left">
                <div className="text-acid-lime text-xl sm:text-2xl font-bold">500+</div>
                <div className="text-white/50 text-xs">สินค้าพร้อมส่ง</div>
              </div>
              <div className="text-center lg:text-left border-x border-white/10">
                <div className="text-acid-lime text-xl sm:text-2xl font-bold">24h</div>
                <div className="text-white/50 text-xs">บริการตลอด</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-acid-lime text-xl sm:text-2xl font-bold">ส่งฟรี</div>
                <div className="text-white/50 text-xs">ทั่วไทย</div>
              </div>
            </div>
          </div>

          {/* Right Side - Product Image (70%) - BIG & CLEAR */}
          <div className="relative order-1 lg:order-2 flex items-center justify-center h-full">
            {/* Glow Effect Behind Image */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
              <div className="w-[800px] h-[800px] bg-purple-500/20 rounded-full blur-[120px]"></div>
              <div className="absolute w-[500px] h-[500px] bg-acid-lime/10 rounded-full blur-[80px]"></div>
            </div>
            
            {/* Product Image - FULL SIZE */}
            <img
              src="/hero-bg.png"
              alt="SaltHub BAR9K - Premium Vape Product"
              className="relative z-10 w-full h-auto max-h-[90vh] object-contain object-center"
              style={{ maxWidth: '100%', maxHeight: '90vh' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}