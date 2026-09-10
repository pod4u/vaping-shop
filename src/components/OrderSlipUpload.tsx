"use client";

import React, { useState, useRef } from "react";

interface BankTransferInfo {
  bankName?: string;
  bankShort?: string;
  accountNumber?: string;
  accountNumberClean?: string;
  accountName?: string;
}

interface OrderSlipUploadProps {
  orderId: string;
  orderNumber: string;
  total: number;
  bankInfo?: BankTransferInfo;
  onSuccess?: (confirmedOrder: any) => void;
  className?: string;
}

const DEFAULT_BANK_INFO: BankTransferInfo = {
  bankName: "ธนาคารกรุงไทย",
  bankShort: "KTB",
  accountNumber: "204-0-94166-5",
  accountNumberClean: "2040941665",
  accountName: "ธเนศ ชนวัฒน์",
};

export default function OrderSlipUpload({
  orderId,
  orderNumber,
  total,
  bankInfo = DEFAULT_BANK_INFO,
  onSuccess,
  className = "",
}: OrderSlipUploadProps) {
  const [copied, setCopied] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStep, setVerifyStep] = useState<string>("กำลังอ่านข้อมูลสลิป...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [verifiedData, setVerifiedData] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const accountToCopy = bankInfo.accountNumberClean || bankInfo.accountNumber || "2040941665";

  const handleCopyAccount = async () => {
    try {
      await navigator.clipboard.writeText(accountToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("กรุณาเลือกไฟล์รูปภาพเท่านั้น (รองรับ JPG, PNG, WebP)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("ขนาดไฟล์รูปภาพต้องไม่เกิน 10MB");
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setErrorMessage(null);
  };

  const handleSubmitSlip = async () => {
    if (!selectedFile) {
      setErrorMessage("กรุณาเลือกหรือลากรูปภาพสลิปการโอนเงินก่อนกดยืนยัน");
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);
    setVerifyStep("กำลังอ่านข้อมูล QR Code ในสลิป...");

    const stepTimer1 = setTimeout(() => {
      setVerifyStep("กำลังเชื่อมต่อระบบ Thunder ตรวจสอบยอดเงินและบัญชี...");
    }, 1200);

    const stepTimer2 = setTimeout(() => {
      setVerifyStep("กำลังตรวจสอบความถูกต้องและยืนยันออเดอร์...");
    }, 2800);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch(`/api/customers/orders/${orderId}/slip`, {
        method: "POST",
        body: formData,
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "ตรวจสอบสลิปไม่ผ่าน กรุณาตรวจสอบรูปภาพสลิปอีกครั้ง");
        setIsVerifying(false);
        return;
      }

      setVerifiedSuccess(true);
      setVerifiedData(data.order);
      setIsVerifying(false);
      if (onSuccess) {
        onSuccess(data.order);
      }
    } catch (err: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      console.error("Slip upload error:", err);
      setErrorMessage("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง");
      setIsVerifying(false);
    }
  };

  if (verifiedSuccess) {
    return (
      <div className={`p-5 rounded-3xl bg-gradient-to-b from-emerald-500/15 to-emerald-950/30 border border-emerald-500/40 text-center space-y-3.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300 ${className}`}>
        <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping opacity-60" />
          <div className="relative w-14 h-14 rounded-full bg-emerald-500 text-navy-deep font-black text-2xl flex items-center justify-center shadow-lg shadow-emerald-500/50">
            ✓
          </div>
        </div>
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-300 text-xs font-black uppercase tracking-wider mb-1">
            ⚡ Thunder Verified
          </span>
          <h4 className="text-lg font-black text-white mt-1">ชำระเงินเรียบร้อยแล้ว!</h4>
          <p className="text-xs text-white/70 max-w-xs mx-auto mt-1 leading-relaxed">
            ระบบตรวจสอบสลิปอัตโนมัติสำเร็จ ออเดอร์ของคุณได้รับการยืนยันและตัดสต็อกเข้าคิวจัดส่งทันที
          </p>
          {verifiedData?.transRef && (
            <div className="mt-3 inline-block px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-[11px] font-mono text-emerald-400">
              Transaction Ref: {verifiedData.transRef}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3.5 text-left ${className}`}>
      {/* LUXURY FINTECH BANK CARD (KRUNGTHAI VIP) */}
      <div className="relative rounded-3xl p-5 bg-gradient-to-br from-[#00519c] via-[#002f6c] to-[#01142e] border border-sky-400/40 shadow-2xl overflow-hidden group transition-all duration-300 hover:border-sky-300/60">
        {/* Ambient Glows */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#00a3e0]/25 rounded-full blur-3xl pointer-events-none group-hover:bg-[#00a3e0]/35 transition-all" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-sky-600/20 rounded-full blur-2xl pointer-events-none" />

        {/* Card Header: Brand & Status Pill */}
        <div className="relative flex items-center justify-between gap-2 pb-3 border-b border-white/15">
          <div className="flex items-center gap-2.5">
            {/* KTB Badge */}
            <div className="w-8 h-8 rounded-xl bg-[#00a3e0] text-white font-black text-xs flex items-center justify-center shadow-md shadow-sky-900/50 border border-white/25">
              KTB
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-black text-white tracking-wide">{bankInfo.bankName || "ธนาคารกรุงไทย"}</p>
              </div>
              <p className="text-[10px] text-sky-200/80 font-medium">Krungthai Bank · โอนเงินผ่านแอปธนาคาร</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-400/15 border border-sky-400/30 text-[10px] font-bold text-sky-300 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span>ตรวจสลิปทันที</span>
          </div>
        </div>

        {/* Account Number Display with One-Click Copy */}
        <div className="relative mt-3.5 p-3.5 rounded-2xl bg-black/40 border border-white/15 backdrop-blur-md flex items-center justify-between gap-3 shadow-inner">
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-white/50 block">เลขที่บัญชีรับโอน</span>
            <span className="text-lg sm:text-xl font-black font-mono tracking-widest text-white drop-shadow-sm block truncate">
              {bankInfo.accountNumber || "204-0-94166-5"}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyAccount}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 flex-shrink-0 active:scale-95 shadow-lg ${
              copied
                ? "bg-emerald-400 text-navy-deep shadow-emerald-400/30"
                : "bg-acid-lime hover:bg-[#c9f511] text-navy-deep shadow-acid/40"
            }`}
          >
            {copied ? (
              <>
                <span className="text-sm">✓</span>
                <span>คัดลอกแล้ว</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>คัดลอกเลข</span>
              </>
            )}
          </button>
        </div>

        {/* Account Holder & Required Transfer Amount */}
        <div className="relative mt-3 flex items-end justify-between px-1 text-xs">
          <div>
            <span className="text-white/50 text-[11px] block">ชื่อบัญชี</span>
            <span className="text-white font-bold text-xs">{bankInfo.accountName || "ธเนศ ชนวัฒน์"}</span>
          </div>

          <div className="text-right">
            <span className="text-white/50 text-[11px] block">ยอดที่ต้องโอน</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-acid-lime drop-shadow leading-none">
              ฿{total.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Gentle Notice */}
        <div className="relative mt-3 pt-2 border-t border-white/10 text-[10px] text-sky-200/70 flex items-center justify-between">
          <span>* โอนตรงเศษสตางค์ ระบบจะตรวจจับและยืนยันทันที</span>
          <span className="text-white/40">รองรับทุกธนาคาร</span>
        </div>
      </div>

      {/* MODERN SLIP UPLOAD DROPZONE */}
      <div className="p-4 rounded-3xl bg-white/[0.03] border border-white/15 backdrop-blur-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">🧾</span>
            <span className="text-xs font-black text-white">แนบสลิปโอนเงินเพื่อยืนยันออเดอร์</span>
          </div>
          <span className="text-[10px] text-white/40 font-medium">JPG, PNG, WebP (สูงสุด 10MB)</span>
        </div>

        {previewUrl ? (
          /* Uploaded Preview Card */
          <div className="relative rounded-2xl overflow-hidden border border-acid-lime/40 bg-navy-surface/80 p-3 flex items-center gap-3.5 shadow-lg">
            <div className="w-16 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-black/50 border border-white/15 relative">
              <img src={previewUrl} alt="Slip preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-[10px] font-bold mb-1">
                <span>✓</span> พร้อมส่งตรวจสอบ
              </div>
              <p className="text-xs font-bold text-white truncate">{selectedFile?.name}</p>
              <p className="text-[10px] text-white/50 mt-0.5 font-mono">
                {selectedFile ? (selectedFile.size / 1024).toFixed(1) : 0} KB
              </p>

              <button
                type="button"
                onClick={handleRemoveFile}
                disabled={isVerifying}
                className="text-[11px] text-red-300 hover:text-red-200 mt-1 font-bold inline-flex items-center gap-1 underline transition-colors"
              >
                <span>✕</span> เปลี่ยนรูปสลิป
              </button>
            </div>
          </div>
        ) : (
          /* Drag & Drop Area */
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all duration-300 ${
              isDragging
                ? "border-acid-lime bg-acid-lime/10 scale-[1.01]"
                : "border-white/20 hover:border-acid-lime/60 bg-white/[0.02] hover:bg-white/[0.05]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-white flex items-center justify-center mx-auto mb-2 text-xl shadow-inner group-hover:scale-110 transition-transform">
              📸
            </div>
            <p className="text-xs font-black text-white">
              คลิกเพื่อเลือกรูปสลิป <span className="text-acid-lime font-normal">หรือลากไฟล์มาวาง</span>
            </p>
            <p className="text-[10px] text-white/40 mt-1">
              รองรับรูปสลิปจากทุกธนาคาร (กสิกร, ไทยพาณิชย์, กรุงไทย, กรุงเทพ ฯลฯ)
            </p>
          </div>
        )}

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-xs text-red-200 flex items-start gap-2.5 animate-in fade-in">
            <span className="text-red-400 text-base leading-none">⚠️</span>
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Primary Verification Action Button */}
        <button
          type="button"
          onClick={handleSubmitSlip}
          disabled={!selectedFile || isVerifying}
          className="btn-liquid-acid w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-acid disabled:opacity-40 disabled:pointer-events-none transition-all"
        >
          {isVerifying ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-navy-deep border-t-transparent rounded-full animate-spin" />
              <span>{verifyStep}</span>
            </div>
          ) : (
            <>
              <span>⚡ ตรวจสอบสลิปและยืนยันออเดอร์ทันที</span>
            </>
          )}
        </button>

        <p className="text-[10px] text-white/40 text-center leading-relaxed">
          * ระบบ Thunder จะอ่าน QR Code และตรวจสอบกับเครือข่ายธนาคารจริง เพื่อความรวดเร็วและปลอดภัย
        </p>
      </div>
    </div>
  );
}
