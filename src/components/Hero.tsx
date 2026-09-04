"use client";

import { storeConfig } from "../lib/config";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden pt-28 pb-16">
      {/* Multi-layer Depth Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Base gradient layer */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-void via-brand-dark to-brand-void"></div>

        {/* Animated mesh gradient */}
        <div className="absolute inset-0 opacity-60">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(123,40,202,0.3),transparent)]"></div>
        </div>

        {/* Deep Ultraviolet Wave - Main glow */}
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-vapor-violet/30 rounded-full blur-[150px] animate-pulse-slow"></div>

        {/* Acid Lime Ambient Accent - Secondary glow */}
        <div className="absolute top-[30%] left-[10%] w-[500px] h-[400px] bg-acid-lime/10 rounded-full blur-[140px] animate-float-slow"></div>

        {/* Floating orb 1 */}
        <div className="absolute top-[15%] right-[15%] w-[300px] h-[300px] bg-vapor-violet/20 rounded-full blur-[100px] animate-float-slow" style={{ animationDelay: '-2s' }}></div>

        {/* Floating orb 2 */}
        <div className="absolute bottom-[20%] left-[5%] w-[250px] h-[250px] bg-acid-lime/8 rounded-full blur-[80px] animate-float-slow" style={{ animationDelay: '-4s' }}></div>

        {/* Deep Violet Base */}
        <div className="absolute bottom-[-15%] right-1/4 w-[700px] h-[500px] bg-vapor-deep/30 rounded-full blur-[160px]"></div>

        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-acid-lime/40 rounded-full animate-float-slow"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${-Math.random() * 6}s`,
                animationDuration: `${4 + Math.random() * 4}s`,
                opacity: 0.2 + Math.random() * 0.4,
                transform: `scale(${0.5 + Math.random() * 1})`,
              }}
            ></div>
          ))}
        </div>

        {/* Subtle Geometric Wireframe / Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(212,255,20,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-50"></div>

        {/* Gradient overlay from bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-brand-void to-transparent"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
        {/* Streetwear Pill Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-brand-surface/80 backdrop-blur-sm border border-brand-border mb-8 shadow-lg animate-slide-up">
          <span className="w-2 h-2 rounded-full bg-acid-lime animate-pulse"></span>
          <span className="text-white/90 text-xs font-mono tracking-widest uppercase">
            AUTHENTIC PODS &amp; DISPOSABLES • 24/7
          </span>
        </div>

        {/* Main Punchy Heading */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6 leading-[1.08] text-white animate-slide-up" style={{ animationDelay: '0.1s' }}>
          ELEVATE YOUR <br className="hidden sm:block" />
          <span className="relative inline-block">
            <span className="text-acid-lime text-glow-acid">Pod</span>
            {/* Text reflection/glow effect */}
            <span className="absolute -bottom-2 left-0 right-0 text-acid-lime/20 blur-sm select-none">Pod4U</span>
          </span> EXPERIENCE
        </h1>

        {/* Tagline */}
        <p className="text-base sm:text-lg md:text-xl text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed font-normal animate-slide-up" style={{ animationDelay: '0.2s' }}>
          {storeConfig.tagline} ของแท้ 100% สต็อกแน่นพร้อมส่งทุกวัน ทักหาเราได้ตลอด 24 ชม.
        </p>

        {/* High Contrast CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 max-w-md mx-auto sm:max-w-none animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <a
            href={storeConfig.lineLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto btn-acid px-8 py-4 rounded-full text-base font-extrabold flex items-center justify-center gap-3 tracking-wide btn-press"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 5.58 2 10c0 2.12.92 4.04 2.42 5.44L3 22l6.4-3.2c.84.13 1.71.2 2.6.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
            </svg>
            สั่งซื้อด่วนผ่าน LINE
          </a>

          <Link
            href="/products"
            className="w-full sm:w-auto btn-vapor-outline px-8 py-4 rounded-full text-base font-semibold flex items-center justify-center gap-2.5 tracking-wide btn-press"
          >
            สำรวจสินค้าทั้งหมด
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        {/* Trust Badges Bar - 3D Cards with depth */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <div className="group vapor-card rounded-2xl p-4 sm:p-5 flex items-center gap-4 text-left relative overflow-hidden card-tilt">
            {/* Inner glow on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-vapor-violet/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 w-12 h-12 rounded-xl bg-vapor-violet/20 border border-vapor-violet/40 flex items-center justify-center shrink-0 text-acid-lime group-hover:scale-110 group-hover:border-acid-lime/40 transition-all duration-300 shadow-lg shadow-vapor-violet/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="relative z-10">
              <div className="text-white font-bold text-sm">การันตีของแท้ 100%</div>
              <div className="text-white/50 text-xs">สินค้าตรงปก ตรวจสอบได้ทุกชิ้น</div>
            </div>
          </div>

          <div className="group vapor-card rounded-2xl p-4 sm:p-5 flex items-center gap-4 text-left relative overflow-hidden card-tilt">
            <div className="absolute inset-0 bg-gradient-to-r from-acid-lime/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 w-12 h-12 rounded-xl bg-vapor-violet/20 border border-vapor-violet/40 flex items-center justify-center shrink-0 text-acid-lime group-hover:scale-110 group-hover:border-acid-lime/40 transition-all duration-300 shadow-lg shadow-vapor-violet/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="relative z-10">
              <div className="text-white font-bold text-sm">จัดส่งไว กทม. &amp; ทั่วประเทศ</div>
              <div className="text-white/50 text-xs">ส่งฟรีเมื่อสั่งซื้อครบ {storeConfig.freeShippingMin}฿</div>
            </div>
          </div>

          <div className="group vapor-card rounded-2xl p-4 sm:p-5 flex items-center gap-4 text-left relative overflow-hidden card-tilt">
            <div className="absolute inset-0 bg-gradient-to-r from-vapor-violet/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 w-12 h-12 rounded-xl bg-vapor-violet/20 border border-vapor-violet/40 flex items-center justify-center shrink-0 text-acid-lime group-hover:scale-110 group-hover:border-acid-lime/40 transition-all duration-300 shadow-lg shadow-vapor-violet/20">
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
            <div className="w-1 h-2 bg-acid-lime rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </section>
  );
}