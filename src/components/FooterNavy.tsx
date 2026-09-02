import Link from "next/link";
import { storeConfig, categories } from "../lib/config";

export default function FooterNavy() {
  return (
    <footer className="relative mt-24 border-t border-navy-border bg-navy-deep">
      {/* Top subtle glow line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-navy-glow to-transparent opacity-50"></div>

      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Store Info */}
          <div>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 rounded-lg bg-navy/30 border border-navy-border flex items-center justify-center">
                <span className="text-lg">💨</span>
              </div>
              <span className="text-xl font-black tracking-tight text-white">
                VAPING <span className="text-white-neon">SHOP</span>
              </span>
            </div>
            <p className="text-white/50 mb-6 text-sm leading-relaxed">
              {storeConfig.tagline}
            </p>
            <a
              href={storeConfig.lineLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 btn-white-cta px-5 py-2.5 rounded-full text-xs font-black transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 5.58 2 10c0 2.12.92 4.04 2.42 5.44L3 22l6.4-3.2c.84.13 1.71.2 2.6.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
              </svg>
              LINE: {storeConfig.lineId}
            </a>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-white font-bold text-base mb-6 tracking-wide">หมวดหมู่สินค้า</h3>
            <ul className="space-y-2.5">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/products?category=${cat.id}`}
                    className="text-white/50 hover:text-white transition-colors text-sm flex items-center gap-2 group"
                  >
                    <span className="text-xs group-hover:text-white transition-colors">{cat.icon}</span>
                    {cat.nameTh}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold text-base mb-6 tracking-wide">เมนูด่วน</h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/navy" className="text-white/50 hover:text-white transition-colors text-sm">
                  หน้าแรก
                </Link>
              </li>
              <li>
                <Link href="/products" className="text-white/50 hover:text-white transition-colors text-sm">
                  สินค้าทั้งหมด
                </Link>
              </li>
              <li>
                <Link href="/navy#about" className="text-white/50 hover:text-white transition-colors text-sm">
                  ทำไมต้องเลือกเรา
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-bold text-base mb-6 tracking-wide">ติดต่อเรา</h3>
            <ul className="space-y-4 text-white/50 text-sm">
              <li className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-navy/30 border border-navy-border flex items-center justify-center text-white shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 5.58 2 10c0 2.12.92 4.04 2.42 5.44L3 22l6.4-3.2c.84.13 1.71.2 2.6.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
                  </svg>
                </div>
                <span>LINE: {storeConfig.lineId}</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-navy/30 border border-navy-border flex items-center justify-center text-white shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span>บริการตลอด {storeConfig.serviceHours}</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-navy/30 border border-navy-border flex items-center justify-center text-white shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <span>ส่งฟรีเมื่อซื้อครบ {storeConfig.freeShippingMin}฿</span>
              </li>
            </ul>

            {/* LINE Add Friend Button */}
            <div className="mt-6 pt-6 border-t border-navy-border">
              <p className="text-white/50 text-xs mb-3">เพิ่มเพื่อน LINE</p>
              <a
                href={storeConfig.lineLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="https://scdn.line-apps.com/n/line_add_friends/btn/th.png"
                  alt="เพิ่มเพื่อน"
                  height="36"
                  className="hover:opacity-80 transition-opacity"
                />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-navy-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40 font-mono">
          <p>© {new Date().getFullYear()} VAPING SHOP. ALL RIGHTS RESERVED.</p>
          <p className="text-white/30">PREMIUM VAPE &amp; POD SYSTEM</p>
        </div>
      </div>
    </footer>
  );
}