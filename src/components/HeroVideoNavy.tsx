"use client";

import { storeConfig } from "@/lib/config";

export default function HeroVideoNavy() {
  return (
    <section className="relative min-h-[100vh] flex items-center overflow-hidden">
      {/* Background - Dark Navy */}
      <div className="absolute inset-0 z-0 bg-navy-deep"></div>

      {/* Main Content - Two Columns */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[100vh]">
          
          {/* Left Side - Text Content */}
          <div className="text-center lg:text-left order-2 lg:order-1">
            {/* Small Tag */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-acid-lime/10 border border-acid-lime/30 mb-6">
              <span className="w-2 h-2 rounded-full bg-acid-lime animate-pulse"></span>
              <span className="text-acid-lime text-sm font-medium tracking-wide">PREMIUM VAPE SHOP</span>
            </div>

            {/* Main Title */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6 leading-[1.1]">
              <span className="bg-gradient-to-r from-white via-acid-lime to-white bg-clip-text text-transparent">
                VAPING
              </span>
              <span className="block mt-2 bg-gradient-to-r from-acid-lime via-white to-acid-lime bg-clip-text text-transparent">
                SHOP
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-white/70 text-lg sm:text-xl md:text-2xl max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed font-light">
              {storeConfig.tagline}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              {/* LINE Button */}
              <a
                href={storeConfig.lineLink}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative px-8 py-4 rounded-full text-base font-bold tracking-wide inline-flex items-center gap-3 overflow-hidden transition-all duration-300 hover:scale-110 hover:shadow-[0_0_50px_rgba(212,255,20,0.6)]"
                style={{
                  background: 'linear-gradient(135deg, #d4ff14 0%, #a3e635 50%, #d4ff14 100%)',
                  backgroundSize: '200% 200%',
                  animation: 'gradient-shift 3s ease infinite',
                  color: '#0f172a',
                  boxShadow: '0 0 30px -5px rgba(212, 255, 20, 0.5)',
                }}
              >
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
                </span>
                <svg className="w-6 h-6 relative z-10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 5.58 2 10c0 2.12.92 4.04 2.42 5.44L3 22l6.4-3.2c.84.13 1.71.2 2.6.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
                </svg>
                <span className="relative z-10">แชทสั่งซื้อผ่าน LINE</span>
              </a>

              {/* Secondary Button */}
              <a
                href="/products"
                className="group relative px-8 py-4 rounded-full text-base font-bold tracking-wide inline-flex items-center gap-2 border-2 border-white/40 text-white overflow-hidden transition-all duration-300 hover:scale-105 hover:border-white hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:bg-white/10"
              >
                <svg className="w-5 h-5 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                ดูสินค้าทั้งหมด
              </a>
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-3 gap-6 max-w-md mx-auto lg:mx-0">
              <div className="text-center lg:text-left group cursor-default">
                <div className="bg-gradient-to-r from-white to-acid-lime bg-clip-text text-transparent text-2xl sm:text-3xl font-bold group-hover:scale-110 transition-transform">
                  500+
                </div>
                <div className="text-white/50 text-xs sm:text-sm mt-1">สินค้าพร้อมส่ง</div>
              </div>
              <div className="text-center lg:text-left border-x border-white/10 group cursor-default">
                <div className="bg-gradient-to-r from-acid-lime to-white bg-clip-text text-transparent text-2xl sm:text-3xl font-bold group-hover:scale-110 transition-transform">
                  24h
                </div>
                <div className="text-white/50 text-xs sm:text-sm mt-1">บริการตลอด</div>
              </div>
              <div className="text-center lg:text-left group cursor-default">
                <div className="bg-gradient-to-r from-white to-acid-lime bg-clip-text text-transparent text-2xl sm:text-3xl font-bold group-hover:scale-110 transition-transform">
                  ส่งฟรี
                </div>
                <div className="text-white/50 text-xs sm:text-sm mt-1">ทั่วไทย</div>
              </div>
            </div>
          </div>

          {/* Right Side - Product Image */}
          <div className="relative order-1 lg:order-2 flex items-center justify-center min-h-[50vh] lg:min-h-[100vh]">
            {/* Glow Effect Behind Image */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[600px] h-[600px] bg-acid-lime/5 rounded-full blur-[100px]"></div>
              <div className="absolute w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[80px]"></div>
            </div>
            
            {/* Product Image */}
            <img
              src="/hero-bg.png"
              alt="SaltHub BAR9K - Premium Vape Product"
              className="relative z-10 w-full max-w-lg lg:max-w-2xl h-auto object-contain drop-shadow-[0_0_60px_rgba(139,92,246,0.3)]"
            />
          </div>
        </div>
      </div>

      {/* Decorative Lines */}
      <div className="absolute top-1/4 left-10 w-px h-40 bg-gradient-to-b from-transparent via-acid-lime/30 to-transparent hidden lg:block"></div>
      <div className="absolute top-1/3 right-10 w-px h-60 bg-gradient-to-b from-transparent via-acid-lime/30 to-transparent hidden lg:block"></div>

      {/* Gradient Animation */}
      <style jsx>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </section>
  );
}