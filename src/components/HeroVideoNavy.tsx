"use client";

import { storeConfig } from "@/lib/config";

export default function HeroVideoNavy() {
  return (
    <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
          poster="/hero-poster.jpg"
        >
          {/* ใส่ video source ของคุณที่นี่ */}
          <source src="/hero-video.mp4" type="video/mp4" />
          <source src="/hero-video.webm" type="video/webm" />
        </video>
        
        {/* Dark Overlay - เพื่อให้อ่านข้อความง่าย */}
        <div className="absolute inset-0 bg-navy-deep/70 backdrop-blur-[2px]"></div>
        
        {/* Gradient Fade ด้านล่าง */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-navy-deep to-transparent"></div>
        
        {/* Side Gradient */}
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-navy-deep to-transparent"></div>
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-navy-deep to-transparent"></div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-1/4 left-10 w-px h-40 bg-gradient-to-b from-transparent via-navy-glow/50 to-transparent"></div>
      <div className="absolute top-1/3 right-10 w-px h-60 bg-gradient-to-b from-transparent via-navy-glow/50 to-transparent"></div>
      <div className="absolute bottom-1/4 left-1/4 w-40 h-px bg-gradient-to-r from-transparent via-navy-glow/30 to-transparent"></div>

      {/* Main Content */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        {/* Small Tag */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-8">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
          <span className="text-white/80 text-sm font-medium tracking-wide">PREMIUM VAPE SHOP</span>
        </div>

        {/* Main Title */}
        <h1 className="text-white-neon text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6 leading-[1.1]">
          VAPING <span className="block mt-2">SHOP</span>
        </h1>

        {/* Subtitle */}
        <p className="text-white/60 text-lg sm:text-xl md:text-2xl max-w-2xl mx-auto mb-10 leading-relaxed font-light">
          {storeConfig.tagline}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={storeConfig.lineLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-white-cta px-8 py-4 rounded-full text-base font-bold tracking-wide inline-flex items-center gap-3 transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 5.58 2 10c0 2.12.92 4.04 2.42 5.44L3 22l6.4-3.2c.84.13 1.71.2 2.6.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
            </svg>
            แชทสั่งซื้อผ่าน LINE
          </a>
          
          <a
            href="/products"
            className="px-8 py-4 rounded-full text-base font-bold tracking-wide inline-flex items-center gap-2 border-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            ดูสินค้าทั้งหมด
          </a>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
          <div className="text-center">
            <div className="text-white-neon text-2xl sm:text-3xl font-bold">500+</div>
            <div className="text-white/40 text-xs sm:text-sm mt-1">สินค้าพร้อมส่ง</div>
          </div>
          <div className="text-center border-x border-white/10">
            <div className="text-white-neon text-2xl sm:text-3xl font-bold">24h</div>
            <div className="text-white/40 text-xs sm:text-sm mt-1">บริการตลอด</div>
          </div>
          <div className="text-center">
            <div className="text-white-neon text-2xl sm:text-3xl font-bold">ส่งฟรี</div>
            <div className="text-white/40 text-xs sm:text-sm mt-1">ทั่วไทย</div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="flex flex-col items-center gap-2 text-white/40">
          <span className="text-xs tracking-widest">SCROLL</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </section>
  );
}