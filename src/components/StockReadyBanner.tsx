"use client";

import { useState } from "react";
import { X, Package, ArrowRight } from "lucide-react";
import Link from "next/link";

interface StockReadyBannerProps {
  show?: boolean;
}

export default function StockReadyBanner({
  show = true
}: StockReadyBannerProps) {
  const [isVisible, setIsVisible] = useState(show);

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[99] bg-gradient-to-r from-green-600 via-green-500 to-green-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Message */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="hidden sm:flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-bounce">
                <Package className="w-6 h-6 text-white" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm sm:text-base truncate">
                🚚 สินค้าพร้อมส่ง!
              </p>
              <p className="text-white/90 text-xs sm:text-sm truncate">
                สต็อกพร้อม สั่งวันนี้จัดส่งภายใน 1-2 วัน
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/stock"
              className="flex items-center gap-2 bg-white text-green-600 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold hover:shadow-lg hover:scale-105 transition-all whitespace-nowrap"
            >
              <span>ดูสินค้าพร้อมส่ง</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            {/* Close Button */}
            <button
              onClick={() => setIsVisible(false)}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
              aria-label="ปิด"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom border glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
    </div>
  );
}