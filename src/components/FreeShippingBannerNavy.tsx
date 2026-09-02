import Link from "next/link";

export default function FreeShippingBannerNavy() {
  return (
    <section className="py-8 px-4 bg-navy-deep">
      <div className="max-w-7xl mx-auto">
        <div className="vapor-card rounded-2xl border border-navy-border overflow-hidden relative">
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-acid-lime/10 via-transparent to-acid-lime/10 pointer-events-none"></div>

          {/* Content */}
          <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left Side */}
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl bg-acid-lime/20 border border-acid-lime/40 flex items-center justify-center text-3xl animate-pulse">
                🎁
              </div>

              {/* Text */}
              <div>
                <h3 className="text-white font-black text-lg sm:text-xl mb-1">
                  โปรโมชั่นพิเศษ!
                </h3>
                <p className="text-white/60 text-sm sm:text-base">
                  <span className="text-acid-lime font-bold">ส่งฟรี!</span> เมื่อสั่งซื้อครบ <span className="text-white-neon font-bold">800 บาท</span>
                </p>
              </div>
            </div>

            {/* Right Side - CTA */}
            <Link
              href="/products"
              className="flex items-center gap-2 bg-gradient-to-r from-acid-lime to-[#a3e635] text-navy-deep px-6 py-3 rounded-full text-sm font-bold hover:shadow-acid transition-all whitespace-nowrap"
            >
              เลือกสินค้าเลย
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Bottom Glow */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-acid-lime/50 to-transparent"></div>
        </div>
      </div>
    </section>
  );
}