import Link from "next/link";

export default function FreeShippingBannerNavy() {
  return (
    <section className="py-8 px-4 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="navy-card rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
          {/* Subtle Ambient Curved Glow */}
          <div className="absolute top-0 right-1/4 w-96 h-48 bg-acid-lime/10 rounded-full blur-[70px] pointer-events-none"></div>

          {/* Animated Badge */}
          <div className="absolute top-3 right-3 sm:top-5 sm:right-5 bg-acid-lime text-navy-deep text-xs font-black px-3.5 py-1 rounded-full shadow-lg shadow-acid-lime/20">
            🚚 เฉพาะดูดแล้วทิ้ง
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              {/* Dual-Layer 3D Liquid Squircle */}
              <div className="glass-squircle-container w-16 h-16 shrink-0">
                <div className="glass-squircle-back lime"></div>
                <div className="glass-squircle-front w-full h-full flex items-center justify-center text-3xl">
                  <span className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">🚚</span>
                </div>
              </div>

              {/* Title */}
              <div>
                <h3 className="text-white font-black text-xl sm:text-2xl mb-1">
                  ดูดแล้วทิ้งครบ <span className="text-acid-lime">3 ชิ้น</span> ส่งฟรี!
                </h3>
                <p className="text-white/60 text-sm sm:text-base">
                  ทุกออเดอร์ <span className="text-acid-lime font-bold">ไม่มีขั้นต่ำ</span> จัดส่งทั่วไทย
                </p>
              </div>
            </div>

            {/* Details */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/[0.03] border border-white/[0.08] backdrop-blur-md rounded-2xl p-4 sm:p-5">
              {/* Conditions */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-white/90 text-sm font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-acid-lime"></span>
                  เฉพาะสินค้าดูดแล้วทิ้ง 3 ชิ้นขึ้นไป ส่งฟรีทั่วไทย
                </div>
                <div className="flex items-center gap-2 text-white/50 text-xs sm:text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30"></span>
                  รายการอื่นค่าส่งทั่วไทย 50฿
                </div>
                <div className="flex items-center gap-2 text-white/50 text-xs sm:text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30"></span>
                  จัดส่งผ่าน EMS / Flash / Kerry 1-3 วัน
                </div>
              </div>

              {/* CTA */}
              <Link
                href="/stock"
                className="btn-liquid-acid flex items-center gap-2 px-6 py-3 text-sm font-black whitespace-nowrap"
              >
                ดูสินค้าพร้อมส่ง
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

