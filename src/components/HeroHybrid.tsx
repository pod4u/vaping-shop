"use client";

import { storeConfig } from "../lib/config";
import Link from "next/link";

export default function HeroHybrid() {
  return (
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden pt-28 pb-16">
      {/* Deep Dark Background with Blue Neon Effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Base - very dark */}
        <div className="absolute inset-0 bg-gradient-to-b from-hybrid-deep via-hybrid-darker to-hybrid-deep"></div>

        {/* Futuristic tunnel effect - vertical light strips */}
        <div className="absolute inset-0 opacity-40">
          {/* Vertical neon lines */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-hybrid-glow-bright to-transparent"
              style={{ left: `${10 + i * 12}%`, opacity: 0.3 + Math.random() * 0.3 }}
            />
          ))}
        </div>

        {/* Concentric rings above */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 opacity-30">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-hybrid-glow/30"
              style={{
                width: `${300 + i * 200}px`,
                height: `${150 + i * 100}px`,
                top: `${-100 - i * 50}px`,
                left: `${-(150 + i * 100)}px`,
              }}
            />
          ))}
        </div>

        {/* Deep Blue ambient glow */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1000px] h-[700px] bg-hybrid-blue/25 rounded-full blur-[180px] animate-pulse-slow"></div>

        {/* Secondary glow spots */}
        <div className="absolute top-[25%] left-[15%] w-[400px] h-[400px] bg-hybrid-glow/15 rounded-full blur-[130px] animate-float-slow"></div>
        <div className="absolute bottom-[30%] right-[10%] w-[350px] h-[350px] bg-hybrid-glow-bright/10 rounded-full blur-[120px] animate-float-slow" style={{ animationDelay: '-3s' }}></div>

        {/* Floating particles - blue tinted */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(25)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-hybrid-glow-bright/50 rounded-full animate-float-slow"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${-Math.random() * 6}s`,
                animationDuration: `${4 + Math.random() * 4}s`,
                opacity: 0.3 + Math.random() * 0.4,
              }}
            ></div>
          ))}
        </div>

        {/* Grid pattern - subtle */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px] opacity-40"></div>

        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-hybrid-deep to-transparent"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-hybrid-surface/70 backdrop-blur-sm border border-hybrid-border mb-8 shadow-lg animate-slide-up">
          <span className="w-2 h-2 rounded-full bg-hybrid-blue animate-pulse"></span>
          <span className="text-white/90 text-xs font-mono tracking-widest uppercase">
            AUTHENTIC PODS &amp; DISPOSABLES • 24/7
          </span>
        </div>

        {/* Main Heading with Blue Gradient */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6 leading-[1.08] animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <span className="text-white">ELEVATE YOUR</span>
          <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-hybrid-glow via-hybrid-blue to-hybrid-glow-bright bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(37,99,235,0.5)]">
            VAPING
          </span>
          <span className="text-white"> EXPERIENCE</span>
        </h1>

        {/* Tagline */}
        <p className="text-base sm:text-lg md:text-xl text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed font-normal animate-slide-up" style={{ animationDelay: '0.2s' }}>
          {storeConfig.tagline} ของแท้ 100% สต็อกแน่นพร้อมส่งทุกวัน ทักหาเราได้ตลอด 24 ชม.
        </p>

        {/* CTA Buttons - Blue Primary */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 max-w-md mx-auto sm:max-w-none animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <a
            href={storeConfig.lineLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto btn-blue-glow px-8 py-4 rounded-full text-base font-extrabold flex items-center justify-center gap-3 tracking-wide btn-press"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 5.58 2 10c0 2.12.92 4.04 2.42 5.44L3 22l6.4-3.2c.84.13 1.71.2 2.6.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
            </svg>
            สั่งซื้อด่วนผ่าน LINE
          </a>

          <Link
            href="/products"
            className="w-full sm:w-auto btn-hybrid-outline px-8 py-4 rounded-full text-base font-semibold flex items-center justify-center gap-2.5 tracking-wide btn-press"
          >
            สำรวจสินค้าทั้งหมด
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        {/* Trust Badges - Blue Theme */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <div className="group hybrid-card rounded-2xl p-4 sm:p-5 flex items-center gap-4 text-left relative overflow-hidden card-tilt">
            <div className="absolute inset-0 bg-gradient-to-r from-hybrid-glow/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 w-12 h-12 rounded-xl bg-hybrid-blue/30 border border-hybrid-border-light/50 flex items-center justify-center shrink-0 text-white group-hover:scale-110 transition-all duration-300 shadow-lg shadow-hybrid-blue/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="relative z-10">
              <div className="text-white font-bold text-sm">การันตีของแท้ 100%</div>
              <div className="text-white/50 text-xs">สินค้าตรงปก ตรวจสอบได้ทุกชิ้น</div>
            </div>
          </div>

          <div className="group hybrid-card rounded-2xl p-4 sm:p-5 flex items-center gap-4 text-left relative overflow-hidden card-tilt">
            <div className="absolute inset-0 bg-gradient-to-r from-hybrid-glow/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 w-12 h-12 rounded-xl bg-hybrid-blue/30 border border-hybrid-border-light/50 flex items-center justify-center shrink-0 text-white group-hover:scale-110 transition-all duration-300 shadow-lg shadow-hybrid-blue/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="relative z-10">
              <div className="text-white font-bold text-sm">จัดส่งไว กทม. &amp; ทั่วประเทศ</div>
              <div className="text-white/50 text-xs">ส่งฟรีเมื่อสั่งซื้อครบ {storeConfig.freeShippingMin}฿</div>
            </div>
          </div>

          <div className="group hybrid-card rounded-2xl p-4 sm:p-5 flex items-center gap-4 text-left relative overflow-hidden card-tilt">
            <div className="absolute inset-0 bg-gradient-to-r from-hybrid-glow/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 w-12 h-12 rounded-xl bg-hybrid-blue/30 border border-hybrid-border-light/50 flex items-center justify-center shrink-0 text-white group-hover:scale-110 transition-all duration-300 shadow-lg shadow-hybrid-blue/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="relative z-10">
              <div className="text-white font-bold text-sm">บริการตอบแชทตลอด 24 ชม.</div>
              <div className="text-white/50 text-xs">แอดมินพร้อมดูแล ให้คำแนะนำทันที</div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce-subtle hidden md:block">
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-1.5">
            <div className="w-1 h-2 bg-hybrid-glow-bright rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </section>
  );
}