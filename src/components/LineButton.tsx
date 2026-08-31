"use client";

import { storeConfig } from "../lib/config";

export default function LineButton() {
  return (
    <a
      href={storeConfig.lineLink}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 group"
      aria-label="ติดต่อผ่าน LINE"
    >
      {/* Pulse ring */}
      <span className="absolute inset-0 rounded-full bg-acid-lime animate-ping opacity-25 group-hover:opacity-40"></span>
      
      {/* Button */}
      <div className="relative flex items-center gap-2.5 btn-acid px-5 py-3.5 rounded-full shadow-acid transition-all duration-300 group-hover:scale-105">
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 5.58 2 10c0 2.12.92 4.04 2.42 5.44L3 22l6.4-3.2c.84.13 1.71.2 2.6.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
        </svg>
        <span className="hidden sm:inline font-black text-sm tracking-wide">สั่งซื้อด่วน LINE</span>
      </div>
    </a>
  );
}