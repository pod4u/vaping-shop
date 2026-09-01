"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface AnnouncementBannerNavyProps {
  message?: string;
  lineId?: string;
  show?: boolean;
}

export default function AnnouncementBannerNavy({
  message = "📢 แจ้งเปลี่ยน LINE ID ใหม่!",
  lineId = "@vaping_shop",
  show = true
}: AnnouncementBannerNavyProps) {
  const [isVisible, setIsVisible] = useState(show);

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-navy via-navy-deep to-navy text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Message */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="hidden sm:flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-acid-lime/20 flex items-center justify-center animate-pulse">
                <svg className="w-6 h-6 text-acid-lime" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 5.58 2 10c0 2.12.92 4.04 2.42 5.44L3 22l6.4-3.2c.84.13 1.71.2 2.6.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
                </svg>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm sm:text-base truncate">
                {message}
              </p>
              <p className="text-white/80 text-xs sm:text-sm truncate">
                เพิ่ม LINE ใหม่: <span className="font-bold text-acid-lime">{lineId}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={`https://line.me/ti/p/~${lineId.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-gradient-to-r from-acid-lime to-[#a3e635] text-navy-deep px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold hover:shadow-acid transition-all whitespace-nowrap"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 5.58 2 10c0 2.12.92 4.04 2.42 5.44L3 22l6.4-3.2c.84.13 1.71.2 2.6.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
              </svg>
              <span className="hidden sm:inline">เพิ่มเพื่อน</span>
              <span className="sm:hidden">เพิ่ม</span>
            </a>

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
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-acid-lime/50 to-transparent"></div>
    </div>
  );
}