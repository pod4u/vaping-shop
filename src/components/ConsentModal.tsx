"use client";

import { useState } from "react";

interface ConsentModalProps {
  onAccept: (acceptedMarketing: boolean) => void;
}

export default function ConsentModal({ onAccept }: ConsentModalProps) {
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptMarketing, setAcceptMarketing] = useState(false);

  const handleAccept = () => {
    if (acceptTerms) {
      onAccept(acceptMarketing);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 vapor-card rounded-2xl p-6 border border-navy-border max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-acid-lime/20 flex items-center justify-center text-xl">
            📋
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">นโยบายความเป็นส่วนตัว</h2>
            <p className="text-xs text-white/50">Personal Data Protection Policy</p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 text-sm text-white/70 mb-6">
          {/* Purpose */}
          <div>
            <h3 className="font-bold text-white mb-2">ข้อมูลที่เราเก็บและวัตถุประสงค์</h3>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-acid-lime mt-0.5">•</span>
                <span><strong>ชื่อ, เบอร์โทร, LINE ID, ที่อยู่</strong> - เพื่อจัดส่งสินค้าและติดต่อแจ้งสถานะออเดอร์</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-acid-lime mt-0.5">•</span>
                <span><strong>Email</strong> - เพื่อส่งใบเสร็จและแจ้งข่าวสาร (ถ้ายินยอม)</span>
              </li>
            </ul>
          </div>

          {/* Duration */}
          <div>
            <h3 className="font-bold text-white mb-2">ระยะเวลาการเก็บข้อมูล</h3>
            <p>เราจะเก็บข้อมูลของคุณตลอดระยะเวลาที่คุณเป็นลูกค้า และอีก 5 ปีหลังจากการทำรายการสุดท้าย</p>
          </div>

          {/* Rights */}
          <div>
            <h3 className="font-bold text-white mb-2">สิทธิของคุณตาม PDPA</h3>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-white/40 mt-0.5">✓</span>
                <span>สิทธิขอเข้าถึงข้อมูล</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white/40 mt-0.5">✓</span>
                <span>สิทธิขอให้แก้ไขข้อมูล</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white/40 mt-0.5">✓</span>
                <span>สิทธิขอให้ลบข้อมูล</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white/40 mt-0.5">✓</span>
                <span>สิทธิขอรับข้อมูลกลับคืน</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white/40 mt-0.5">✓</span>
                <span>สิทธิคัดค้านการใช้ข้อมูล</span>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-white mb-2">ติดต่อเรื่องข้อมูลส่วนบุคคล</h3>
            <a
              href="https://lin.ee/RU5qNLj"
              target="_blank"
              rel="noopener noreferrer"
              className="text-acid-lime hover:underline"
            >
              LINE: คลิกเพื่อติดต่อ →
            </a>
          </div>
        </div>

        {/* Checkboxes */}
        <div className="space-y-3 mb-6">
          {/* Accept Terms */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                acceptTerms
                  ? "bg-acid-lime border-acid-lime"
                  : "border-white/30 group-hover:border-white/50"
              }`}>
                {acceptTerms && (
                  <svg className="w-3 h-3 text-navy-deep" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm text-white">
              ยอมรับ{" "}
              <span className="text-acid-lime font-medium">เงื่อนไขการใช้บริการ</span> และ{" "}
              <span className="text-acid-lime font-medium">นโยบายความเป็นส่วนตัว</span>
              <span className="text-red-400 ml-1">*</span>
            </span>
          </label>

          {/* Accept Marketing */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                checked={acceptMarketing}
                onChange={(e) => setAcceptMarketing(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                acceptMarketing
                  ? "bg-acid-lime border-acid-lime"
                  : "border-white/30 group-hover:border-white/50"
              }`}>
                {acceptMarketing && (
                  <svg className="w-3 h-3 text-navy-deep" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm text-white/70">
              ยินยอมรับโปรโมชั่น ข่าวสาร และสิทธิพิเศษต่างๆ (ไม่บังคับ)
            </span>
          </label>
        </div>

        {/* Buttons */}
        <button
          onClick={handleAccept}
          disabled={!acceptTerms}
          className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${
            acceptTerms
              ? "bg-gradient-to-r from-acid-lime to-[#a3e635] text-navy-deep hover:shadow-acid"
              : "bg-white/10 text-white/30 cursor-not-allowed"
          }`}
        >
          {acceptTerms ? "✅ ยอมรับและดำเนินการต่อ" : "กรุณายอมรับเงื่อนไข"}
        </button>
      </div>
    </div>
  );
}