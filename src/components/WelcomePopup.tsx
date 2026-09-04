"use client";

import { useState, useEffect } from "react";
import { X, Package, ArrowRight } from "lucide-react";
import Link from "next/link";

const STORAGE_KEY = "welcomePopupClosed";

export default function WelcomePopup() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already closed this popup
    const hasClosed = localStorage.getItem(STORAGE_KEY);
    if (!hasClosed) {
      // Small delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
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
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 hover:bg-white/10 rounded-full transition-colors z-10"
            aria-label="ปิด"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
          
          {/* Hero Section */}
          <div className="relative bg-gradient-to-r from-acid-lime/20 via-green-500/20 to-acid-lime/10 p-6 pb-5">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-acid-lime to-green-500 mb-3">
                <Package className="w-8 h-8 text-navy-deep" />
              </div>
              <h2 className="text-white font-black text-2xl mb-1">ยินดีต้อนรับ!</h2>
              <p className="text-white/60 text-sm">สินค้าพร้อมส่ง · จัดส่งภายใน 1-2 วัน</p>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-5 space-y-4">
            {/* Stock Ready */}
            <Link
              href="/stock"
              onClick={handleClose}
              className="flex items-center gap-4 bg-green-500/10 border border-green-500/30 rounded-xl p-4 hover:bg-green-500/20 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm">สินค้าพร้อมส่ง</p>
                <p className="text-white/50 text-xs">ดูสินค้าที่มีสต็อกตอนนี้</p>
              </div>
              <ArrowRight className="w-5 h-5 text-green-400" />
            </Link>
            
            {/* LINE ID */}
            <div className="bg-navy/50 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-acid-lime/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-acid-lime" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 5.58 2 10c0 2.12.92 4.04 2.42 5.44L3 22l6.4-3.2c.84.13 1.71.2 2.6.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-white font-bold text-sm">LINE ID ใหม่</p>
                  <p className="text-acid-lime font-mono text-sm">@994tiktt</p>
                </div>
              </div>
              <a
                href="https://lin.ee/RU5qNLj"
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleClose}
                className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-acid-lime to-[#a3e635] text-navy-deep py-2.5 rounded-lg font-bold hover:shadow-acid transition-all text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 5.58 2 10c0 2.12.92 4.04 2.42 5.44L3 22l6.4-3.2c.84.13 1.71.2 2.6.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
                </svg>
                เพิ่มเพื่อน LINE
              </a>
            </div>
            
            {/* Footer note */}
            <p className="text-white/30 text-xs text-center">
              จะไม่แสดงอีกหลังจากปิด
            </p>
          </div>
        </div>
      </div>
    </>
  );
}