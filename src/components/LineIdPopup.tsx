"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "lineIdPopupClosed";

export default function LineIdPopup() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already closed this popup
    const hasClosed = localStorage.getItem(STORAGE_KEY);
    if (!hasClosed) {
      setIsVisible(true);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-[90%] max-w-md">
        <div className="bg-gradient-to-b from-navy-surface to-navy-deep rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-acid-lime/20 to-acid-lime/10 p-6 pb-4">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-1.5 hover:bg-white/10 rounded-full transition-colors"
              aria-label="ปิด"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
            
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-acid-lime/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-acid-lime" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 5.58 2 10c0 2.12.92 4.04 2.42 5.44L3 22l6.4-3.2c.84.13 1.71.2 2.6.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-white font-bold text-xl">แจ้งเปลี่ยน LINE ID</h2>
                <p className="text-white/60 text-sm">เพิ่ม LINE ใหม่เพื่อไม่พลาดโปรโมชั่น!</p>
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6">
            <div className="bg-navy/50 rounded-xl p-4 mb-4">
              <p className="text-white/80 text-sm mb-2">LINE ID ใหม่:</p>
              <p className="text-acid-lime font-bold text-2xl font-mono tracking-wide">
                @994tiktt
              </p>
            </div>
            
            <p className="text-white/50 text-xs text-center mb-4">
              ⚠️ LINE ID เดิมจะไม่ใช้งานแล้ว กรุณาเพิ่ม LINE ID ใหม่
            </p>
            
            <a
              href="https://lin.ee/RU5qNLj"
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleClose}
              className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-acid-lime to-[#a3e635] text-navy-deep py-3 rounded-xl font-bold hover:shadow-acid transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 5.58 2 10c0 2.12.92 4.04 2.42 5.44L3 22l6.4-3.2c.84.13 1.71.2 2.6.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
              </svg>
              เพิ่มเพื่อน LINE เลย
            </a>
          </div>
        </div>
      </div>
    </>
  );
}