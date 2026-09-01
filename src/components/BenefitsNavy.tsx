"use client";

import { storeConfig } from "../lib/config";

const benefitItems = [
  {
    title: "สินค้าหลากหลาย",
    description: "มีสินค้าให้เลือกมากกว่า 500+ รายการ ครบทุกรุ่น ทุกหัวน้ำยา",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    title: "ของแท้ 100% ตรงจากผู้ผลิต",
    description: "มั่นใจได้ในคุณภาพ ปลอดภัย ตรวจสอบ QR / Code ได้ทุกชิ้น",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016" />
      </svg>
    ),
  },
  {
    title: "อัปเดตรุ่นใหม่ไม่ตกเทรนด์",
    description: "สินค้าใหม่ล่าสุดและรสชาติยอดนิยมเติมสต็อกต่อเนื่องตลอดเวลา",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: "พร้อมดูแล 24 ชั่วโมง",
    description: "แอดมินใจดีพร้อมตอบคำถาม แนะนำกลิ่น และรับออเดอร์ตลอด 24 ชม.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "ส่งด่วนทันใจ",
    description: "แพ็กสินค้าและจัดส่งทันที รวดเร็ว ได้รับของไว 1-3 วัน",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
    ),
  },
  {
    title: "ราคาส่งคุ้มค่าที่สุด",
    description: "ราคาเป็นมิตรทั้งปลีกและส่ง ยิ่งสั่งเยอะยิ่งลดเยอะ",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function BenefitsNavy() {
  return (
    <section id="about" className="py-20 px-4 relative overflow-hidden">
      {/* Multi-layer depth background - Navy Blue */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top gradient */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-navy-deep via-navy-deep/50 to-transparent"></div>

        {/* Floating orbs for depth */}
        <div className="absolute top-[20%] left-[5%] w-[300px] h-[300px] bg-navy-glow/20 rounded-full blur-[100px] animate-float-slow"></div>
        <div className="absolute bottom-[30%] right-[10%] w-[250px] h-[250px] bg-navy-glow/8 rounded-full blur-[80px] animate-float-slow" style={{ animationDelay: '-3s' }}></div>

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(212,255,20,0.02)_1px,transparent_1px)] bg-[size:48px_48px] opacity-40"></div>

        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-navy-deep via-navy-deep/50 to-transparent"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
          <div>
            <div className="text-navy-glow text-xs font-mono tracking-widest uppercase mb-2">ADVANTAGES</div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              ทำไมต้องเลือกเรา?
            </h2>
          </div>
          <p className="text-white/50 text-sm mt-2 sm:mt-0 font-normal">มาตรฐานสินค้าและบริการที่คุณวางใจได้</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {benefitItems.map((benefit, index) => (
            <div
              key={index}
              className="navy-card rounded-2xl p-6 hover:border-navy-glow/50 transition-all duration-300 group relative overflow-hidden card-tilt animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Inner glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-navy-glow/15 via-transparent to-navy-glow/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              {/* Ambient spot light */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-navy-glow/10 rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div className="relative z-10 w-12 h-12 rounded-xl bg-navy/30 border border-navy-border text-navy-glow flex items-center justify-center mb-5 group-hover:scale-110 group-hover:border-navy-glow/40 group-hover:shadow-lg group-hover:shadow-navy-glow/20 transition-all duration-300">
                {benefit.icon}
              </div>
              <h3 className="relative z-10 text-white font-bold text-lg mb-2 group-hover:text-navy-glow transition-colors">
                {benefit.title}
              </h3>
              <p className="relative z-10 text-white/60 text-sm leading-relaxed group-hover:text-white/70 transition-colors">{benefit.description}</p>

              {/* Bottom accent line */}
              <div className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-navy-glow to-navy-glow group-hover:w-full transition-all duration-500"></div>
            </div>
          ))}
        </div>

        {/* Shipping Banner - Enhanced with Navy Blue depth */}
        <div className="mt-14 relative overflow-hidden rounded-3xl navy-card p-8 sm:p-10 border-navy-border-light group">
          {/* Multi-layer background effects */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-navy/20 rounded-full blur-[120px] group-hover:opacity-70 transition-opacity duration-700"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-navy-glow/10 rounded-full blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            {/* Moving gradient animation */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-navy-glow/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-navy-glow text-black flex items-center justify-center shrink-0 shadow-acid group-hover:shadow-acid-lg group-hover:scale-105 transition-all duration-300">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white mb-1">
                  จัดส่งฟรีทันที เมื่อสั่งซื้อครบ <span className="text-white-neon">{storeConfig.freeShippingMin}฿</span>
                </h3>
                <p className="text-white/60 text-sm">พร้อมบริการแพ็กห่อกันกระแทกอย่างดี ส่งด่วนถึงมือปลอดภัย</p>
              </div>
            </div>

            <a
              href={storeConfig.lineLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-white-cta px-8 py-4 rounded-full text-base font-extrabold whitespace-nowrap shrink-0 btn-press"
            >
              สั่งซื้อสินค้าเลย
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}