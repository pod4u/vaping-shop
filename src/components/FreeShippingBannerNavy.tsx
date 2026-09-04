import Link from "next/link";

export default function FreeShippingBannerNavy() {
  return (
    <section className="py-8 px-4 bg-navy-deep">
      <div className="max-w-7xl mx-auto">
        <div className="vapor-card rounded-2xl border border-acid-lime/30 overflow-hidden relative">
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-acid-lime/15 via-green-500/10 to-acid-lime/15 pointer-events-none"></div>

          {/* Animated Badge */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse shadow-lg">
            🔥 โปรเดือนกันยายน!
          </div>

          {/* Content */}
          <div className="relative p-6 sm:p-8 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-acid-lime to-green-500 flex items-center justify-center text-3xl shadow-acid animate-bounce">
                🚚
              </div>

              {/* Title */}
              <div>
                <h3 className="text-white font-black text-xl sm:text-2xl mb-1">
                  ซื้อ 3 ชิ้น <span className="text-acid-lime">ส่งฟรี!</span>
                </h3>
                <p className="text-white/60 text-sm sm:text-base">
                  เฉพาะ <span className="text-acid-lime font-bold">บุหรี่ไฟฟ้าดูดทิ้ง</span> (Disposable)
                </p>
              </div>
            </div>

            {/* Details */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/5 rounded-xl p-4">
              {/* Conditions */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-acid-lime"></span>
                  สั่งซื้อดูดทิ้ง 3 ชิ้นขึ้นไป = ส่งฟรีทันที
                </div>
                <div className="flex items-center gap-2 text-white/50 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30"></span>
                  รายการอื่น (Pod, อะไหล่) ไม่ร่วมโปรโมชั่น
                </div>
                <div className="flex items-center gap-2 text-white/50 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30"></span>
                  โปรโมชั่นถึง 30 กันยายน 2569 เท่านั้น
                </div>
              </div>

              {/* CTA */}
              <Link
                href="/products?category=disposable"
                className="flex items-center gap-2 bg-gradient-to-r from-acid-lime to-[#a3e635] text-navy-deep px-6 py-3 rounded-full text-sm font-bold hover:shadow-acid transition-all whitespace-nowrap"
              >
                เลือกดูดทิ้งเลย
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Bottom Glow */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-acid-lime/50 to-transparent"></div>
        </div>
      </div>
    </section>
  );
}