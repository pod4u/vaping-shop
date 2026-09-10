"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCart } from "@/hooks/use-cart";
import { storeConfig } from "@/lib/config";
import { bilingualPrimaryThai, bilingualName } from "@/lib/bilingual";
import OrderSlipUpload from "@/components/OrderSlipUpload";

interface CartDrawerProps {
  variant?: "desktop" | "mobile";
}

interface MemberSessionInfo {
  isLoggedIn: boolean;
  customer?: {
    id: number;
    fullName: string;
    phone: string;
  };
  defaultAddress?: {
    id: string;
    recipient_name: string;
    phone: string;
    address: string;
    province: string;
    postal_code: string;
  } | null;
  addresses?: any[];
}

export function CartDrawer({ variant = "desktop" }: CartDrawerProps) {
  const {
    items,
    itemCount,
    estimatedTotal,
    isHydrated,
    updateQuantity,
    removeItem,
    clearCart,
    generateSummaryText,
    editingOrderId,
    editingOrderNumber,
    stopEditingOrder,
  } = useCart();

  const [isOpen, setIsOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error" | "manual">("idle");
  const [showTextarea, setShowTextarea] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Web Checkout states
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "member_confirm" | "login" | "order_success">("cart");
  const [memberSession, setMemberSession] = useState<MemberSessionInfo | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [createdOrder, setCreatedOrder] = useState<any>(null);

  // In-drawer Login state
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Device detection
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDesktop(!/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));
    }
  }, []);

  // Fetch member session when drawer opens
  useEffect(() => {
    if (isOpen) {
      fetchMemberSession();
      setCheckoutStep("cart");
      setOrderError("");
    }
  }, [isOpen]);

  const fetchMemberSession = async () => {
    setIsLoadingSession(true);
    try {
      const res = await fetch("/api/customers/member-session");
      const data = await res.json();
      setMemberSession(data);
    } catch {
      setMemberSession({ isLoggedIn: false });
    } finally {
      setIsLoadingSession(false);
    }
  };

  // Reset copy status when items change
  useEffect(() => {
    setCopyStatus("idle");
  }, [items]);

  const handleCopy = async () => {
    const text = generateSummaryText();
    if (!text) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        setCopyStatus("copied");
        setTimeout(() => setCopyStatus("idle"), 2000);
      } else {
        setShowTextarea(true);
        setCopyStatus("error");
      }
    } catch {
      setShowTextarea(true);
      setCopyStatus("error");
    }
  };

  const handleTextareaCopy = () => {
    if (textareaRef.current) {
      textareaRef.current.select();
      const success = document.execCommand("copy");
      if (success) {
        setCopyStatus("copied");
        setShowTextarea(false);
        setTimeout(() => setCopyStatus("idle"), 2000);
      } else {
        setCopyStatus("manual");
      }
    }
  };

  const handleSendToLine = () => {
    const summary = generateSummaryText();
    if (!summary) return;

    const lineId = encodeURIComponent(storeConfig.lineId);
    const message = encodeURIComponent(summary);
    window.location.assign(`https://line.me/R/oaMessage/${lineId}/?${message}`);
  };

  const handleSaveEdit = async () => {
    if (!editingOrderId || items.length === 0) return;
    setIsSaving(true);
    setSaveError("");
    try {
      const response = await fetch(`/api/customers/orders/${editingOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            product_flavor_id: item.productFlavorId,
            quantity: item.quantity,
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "บันทึกการแก้ไขไม่สำเร็จ");
      stopEditingOrder();
      window.location.assign("/member?orderUpdated=1");
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : "บันทึกการแก้ไขไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartWebCheckout = () => {
    if (memberSession?.isLoggedIn) {
      setCheckoutStep("member_confirm");
    } else {
      setCheckoutStep("login");
    }
  };

  const handleDrawerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");
    try {
      const res = await fetch("/api/customers/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: loginPhone, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เข้าสู่ระบบไม่สำเร็จ");

      // Refetch member session
      await fetchMemberSession();
      setCheckoutStep("member_confirm");
    } catch (err: any) {
      setLoginError(err.message || "เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleConfirmWebOrder = async () => {
    if (items.length === 0) return;
    setIsCreatingOrder(true);
    setOrderError("");

    try {
      const res = await fetch("/api/customers/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((it) => ({
            product_flavor_id: it.productFlavorId,
            quantity: it.quantity,
          })),
          address_id: memberSession?.defaultAddress?.id || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "สร้างคำสั่งซื้อไม่สำเร็จ");
      }

      setCreatedOrder(data.order);
      clearCart();
      setCheckoutStep("order_success");
    } catch (err: any) {
      setOrderError(err.message || "เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ");
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleClearCart = () => {
    if (window.confirm("ลบสินค้าทั้งหมดออกจากตะกร้าหรือไม่?")) {
      clearCart();
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("th-TH").format(price);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {/* Desktop variant: icon only */}
      {variant === "desktop" && (
        <SheetTrigger
          className="relative p-2 text-white/80 hover:text-white transition-colors"
          aria-label={`ตะกร้าสินค้า ${itemCount > 0 ? `${itemCount} ชิ้น` : "ว่างเปล่า"}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          {isHydrated && itemCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-acid-lime text-navy-deep text-xs font-bold rounded-full shadow-acid animate-scale-in" aria-hidden="true">
              {itemCount > 99 ? "99+" : itemCount}
            </span>
          )}
        </SheetTrigger>
      )}

      {/* Mobile variant: icon + text + badge */}
      {variant === "mobile" && (
        <SheetTrigger
          className="flex items-center justify-center gap-2 bg-navy-surface border border-navy-border text-white px-4 py-3 rounded-full font-bold hover:border-white/30 transition-all"
          aria-label={`ตะกร้าสินค้า ${itemCount > 0 ? `${itemCount} ชิ้น` : "ว่างเปล่า"}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <span>ตะกร้าสินค้า</span>
          {isHydrated && itemCount > 0 && (
            <span className="bg-acid-lime text-navy-deep text-xs font-bold px-2 py-0.5 rounded-full" aria-hidden="true">
              {itemCount > 99 ? "99+" : itemCount}
            </span>
          )}
        </SheetTrigger>
      )}

      <SheetContent side="right" className="w-full sm:max-w-md bg-[#020617] border-navy-border text-white flex flex-col p-6">
        <SheetHeader className="text-left pb-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-white text-lg font-bold flex items-center gap-2">
              <span>🛒</span>
              <span>
                {checkoutStep === "member_confirm"
                  ? "ยืนยันการสั่งซื้อ"
                  : checkoutStep === "login"
                  ? "เข้าสู่ระบบสมาชิก"
                  : checkoutStep === "order_success"
                  ? "สั่งซื้อสำเร็จ!"
                  : editingOrderId
                  ? `แก้ไขออเดอร์ ${editingOrderNumber || ""}`
                  : "ตะกร้าสินค้า"}
              </span>
            </SheetTitle>
            {memberSession?.isLoggedIn && checkoutStep === "cart" && (
              <span className="text-[11px] font-mono text-acid-lime bg-acid-lime/10 px-2 py-0.5 rounded-full">
                👤 {memberSession.customer?.fullName.split(" ")[0]}
              </span>
            )}
          </div>
          <SheetDescription className="text-white/50 text-xs">
            {checkoutStep === "member_confirm"
              ? "ตรวจสอบที่อยู่จัดส่งและยอดรวมเพื่อสร้างออเดอร์"
              : checkoutStep === "login"
              ? "เข้าสู่ระบบด้วยเบอร์โทรเพื่อสั่งซื้อบนเว็บ"
              : checkoutStep === "order_success"
              ? "ระบบบันทึกคำสั่งซื้อของคุณเรียบร้อยแล้ว"
              : editingOrderId
              ? "แก้ไขจำนวนสินค้าและกดบันทึกเพื่ออัปเดตออเดอร์เดิม"
              : `มีสินค้าในตะกร้า ${itemCount} รายการ`}
          </SheetDescription>
        </SheetHeader>

        {/* STEP 1: CART ITEMS VIEW */}
        {checkoutStep === "cart" && (
          <>
            {!isHydrated ? (
              <div className="flex-1 flex items-center justify-center text-white/40 text-sm">กำลังโหลดตะกร้า...</div>
            ) : items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-3xl mb-4">🛒</div>
                <p className="text-white/80 font-bold mb-1">ยังไม่มีสินค้าในตะกร้า</p>
                <p className="text-white/40 text-xs mb-6">เลือกดูสินค้าพร้อมส่งหรือหมวดหมู่เพื่อเพิ่มรายการ</p>
                <Link
                  href="/stock"
                  onClick={() => setIsOpen(false)}
                  className="btn-liquid-acid px-6 py-2.5 rounded-full text-xs font-bold"
                >
                  ดูสินค้าพร้อมส่ง
                </Link>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
                {items.map((item) => {
                  const nameDisplay = bilingualPrimaryThai(item.productNameTh, item.productName);
                  const flavorDisplay = bilingualPrimaryThai(item.flavorNameTh, item.flavorName);
                  return (
                    <div key={item.productFlavorId} className="flex gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all">
                      <div className="w-14 h-14 rounded-xl bg-navy-surface/80 p-1 flex-shrink-0 flex items-center justify-center overflow-hidden">
                        <img
                          src={item.imageUrl || "/images/placeholder.svg"}
                          alt={item.flavorName}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/images/placeholder.svg";
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-xs font-bold text-white truncate">{nameDisplay.primary}</h4>
                          <button
                            type="button"
                            onClick={() => removeItem(item.productFlavorId)}
                            className="text-white/30 hover:text-red-400 text-xs p-1"
                            aria-label="ลบรายการ"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="text-xs text-acid-lime font-medium truncate mb-2">รส {flavorDisplay.primary}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center rounded-lg border border-white/15 bg-white/5 p-0.5">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productFlavorId, item.quantity - 1)}
                              className="w-6 h-6 rounded flex items-center justify-center text-white/80 hover:bg-white/10 text-xs font-bold"
                            >
                              -
                            </button>
                            <span className="w-8 text-center text-xs font-bold font-mono">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productFlavorId, item.quantity + 1)}
                              className="w-6 h-6 rounded flex items-center justify-center text-white/80 hover:bg-white/10 text-xs font-bold"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-xs font-bold text-white font-mono">
                            ฿{item.unitPrice ? formatPrice(item.unitPrice * item.quantity) : "0"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Cart Footer Actions */}
            {items.length > 0 && (
              <div className="pt-4 border-t border-white/10 space-y-3 mt-auto">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">ยอดรวมสินค้า ({itemCount} ชิ้น)</span>
                  <span className="text-xl font-black text-acid-lime">฿{formatPrice(estimatedTotal)}</span>
                </div>

                {editingOrderId ? (
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                    className="btn-liquid-acid w-full py-3 text-sm font-black flex items-center justify-center gap-2 shadow-acid"
                  >
                    {isSaving ? "กำลังบันทึก..." : "บันทึกการแก้ไขออเดอร์"}
                  </button>
                ) : (
                  <div className="space-y-2">
                    {/* DUAL CHECKOUT BUTTONS - Smart Order Based on Device */}
                    {isDesktop ? (
                      <>
                        {/* Desktop Primary: Direct Web Checkout */}
                        <button
                          type="button"
                          onClick={handleStartWebCheckout}
                          className="btn-liquid-acid w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-acid transition-all"
                        >
                          <span>🛍️ สั่งซื้อผ่านระบบสมาชิก (บนเว็บ)</span>
                        </button>

                        {/* Desktop Secondary: LINE Button */}
                        <button
                          type="button"
                          onClick={handleSendToLine}
                          className="btn-liquid-glass w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 5.58 2 10c0 2.12.92 4.04 2.42 5.44L3 22l6.4-3.2c.84.13 1.71.2 2.6.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
                          </svg>
                          <span>สั่งซื้อผ่าน LINE (แชทกับแอดมิน)</span>
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Mobile Primary: LINE Button */}
                        <button
                          type="button"
                          onClick={handleSendToLine}
                          className="btn-liquid-acid w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-acid"
                        >
                          <svg className="w-5 h-5 text-navy-deep" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 5.58 2 10c0 2.12.92 4.04 2.42 5.44L3 22l6.4-3.2c.84.13 1.71.2 2.6.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
                          </svg>
                          <span>ส่งรายการเข้า LINE</span>
                        </button>

                        {/* Mobile Secondary: Direct Web Checkout */}
                        <button
                          type="button"
                          onClick={handleStartWebCheckout}
                          className="btn-liquid-glass w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                        >
                          <span>🛍️ สั่งซื้อผ่านระบบสมาชิกบนเว็บ</span>
                        </button>
                      </>
                    )}

                    {/* Copy text fallback */}
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="w-full py-2 text-center text-white/40 hover:text-white text-xs transition-colors"
                    >
                      {copyStatus === "copied" ? "✓ คัดลอกรายการแล้ว" : "คัดลอกข้อความสรุปออเดอร์"}
                    </button>
                  </div>
                )}

                {/* Clear Cart Button */}
                <button
                  type="button"
                  onClick={editingOrderId ? stopEditingOrder : handleClearCart}
                  className="w-full text-center text-[11px] text-red-300/60 hover:text-red-300 transition-colors pt-1"
                >
                  {editingOrderId ? "ยกเลิกการแก้ไข" : "ลบสินค้าทั้งหมดออกจากตะกร้า"}
                </button>
              </div>
            )}
          </>
        )}

        {/* STEP 2: MEMBER CHECKOUT CONFIRMATION */}
        {checkoutStep === "member_confirm" && (
          <div className="flex-1 flex flex-col justify-between py-4 space-y-4">
            <div className="space-y-4">
              {/* Member & Address Info Card */}
              <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/10 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>👤</span> ข้อมูลผู้สั่งซื้อ
                  </span>
                  <span className="text-xs font-mono text-acid-lime">{memberSession?.customer?.phone}</span>
                </div>
                <p className="text-xs text-white/80 font-bold">{memberSession?.customer?.fullName}</p>

                {memberSession?.defaultAddress ? (
                  <div className="pt-2 border-t border-white/10">
                    <div className="text-[11px] text-white/50 mb-1 flex items-center gap-1">
                      <span>📍</span> ที่อยู่จัดส่ง
                    </div>
                    <p className="text-xs text-white/80 leading-relaxed font-light">
                      {memberSession.defaultAddress.recipient_name} ({memberSession.defaultAddress.phone})<br />
                      {memberSession.defaultAddress.address} {memberSession.defaultAddress.province} {memberSession.defaultAddress.postal_code}
                    </p>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-white/10 text-xs text-amber-300">
                    ⚠️ ยังไม่มีที่อยู่จัดส่ง กรุณาเข้าไปเพิ่มที่อยู่ในระบบสมาชิกก่อนสั่งซื้อ
                  </div>
                )}
              </div>

              {/* Order Summary Card */}
              <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/10 space-y-2 text-xs">
                <div className="flex justify-between text-white/60">
                  <span>จำนวนสินค้า:</span>
                  <span className="text-white font-mono">{itemCount} ชิ้น</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>ค่าจัดส่ง (EMS/Flash):</span>
                  <span className="text-acid-lime font-mono">{itemCount >= 3 ? "ฟรี (โปรโมชั่น)" : "฿50"}</span>
                </div>
                <div className="pt-2 border-t border-white/10 flex justify-between items-baseline text-sm">
                  <span className="font-bold text-white">ยอดรวมที่ต้องชำระ:</span>
                  <span className="text-2xl font-black text-acid-lime">
                    ฿{formatPrice(estimatedTotal + (itemCount >= 3 ? 0 : 50))}
                  </span>
                </div>
              </div>

              {orderError && (
                <div className="p-3 rounded-xl bg-red-400/10 border border-red-400/20 text-xs text-red-300">
                  {orderError}
                </div>
              )}
            </div>

            {/* Confirmation Buttons */}
            <div className="space-y-2 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={handleConfirmWebOrder}
                disabled={isCreatingOrder || !memberSession?.defaultAddress}
                className="btn-liquid-acid w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-acid disabled:opacity-40"
              >
                {isCreatingOrder ? "กำลังสร้างคำสั่งซื้อ..." : "ยืนยันการสั่งซื้อสินค้า"}
              </button>

              <button
                type="button"
                onClick={() => setCheckoutStep("cart")}
                className="w-full py-2.5 rounded-xl text-xs text-white/60 hover:text-white font-medium transition-colors"
              >
                ← ย้อนกลับไปแก้ไขตะกร้า
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: FAST IN-DRAWER LOGIN */}
        {checkoutStep === "login" && (
          <div className="flex-1 flex flex-col justify-between py-4">
            <div>
              <p className="text-xs text-white/60 mb-4">
                เข้าสู่ระบบด้วยเบอร์โทรศัพท์และรหัสผ่าน เพื่อดึงที่อยู่จัดส่งและบันทึกออเดอร์ลงระบบสมาชิก
              </p>

              <form onSubmit={handleDrawerLogin} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="tel"
                    required
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    placeholder="0812345678"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm outline-none focus:border-acid-lime"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1">รหัสผ่าน</label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="รหัสผ่านของคุณ"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm outline-none focus:border-acid-lime"
                  />
                </div>

                {loginError && (
                  <p className="p-2.5 rounded-lg bg-red-400/10 border border-red-400/20 text-xs text-red-300">
                    {loginError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="btn-liquid-acid w-full py-3 rounded-xl font-bold text-sm mt-2 disabled:opacity-50"
                >
                  {isLoggingIn ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบและสั่งซื้อ"}
                </button>
              </form>

              <div className="mt-4 pt-4 border-t border-white/10 text-center space-y-2">
                <Link
                  href="/register"
                  onClick={() => setIsOpen(false)}
                  className="block text-xs text-acid-lime font-bold hover:underline"
                >
                  ยังไม่เคยสมัครสมาชิก? คลิกสมัครที่นี่ →
                </Link>
                <button
                  type="button"
                  onClick={handleSendToLine}
                  className="text-[11px] text-white/40 hover:text-white"
                >
                  หรือสั่งซื้อผ่าน LINE โดยไม่ต้องสมัครสมาชิก
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCheckoutStep("cart")}
              className="w-full py-2.5 text-xs text-white/60 hover:text-white"
            >
              ← ย้อนกลับไปตะกร้า
            </button>
          </div>
        )}

        {/* STEP 4: ORDER SUCCESS SCREEN */}
        {checkoutStep === "order_success" && createdOrder && (
          <div className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto">
            {/* Celebratory Icon */}
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center pt-2">
              <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping opacity-75" />
              <div className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-400 text-navy-deep font-black text-2xl flex items-center justify-center shadow-xl shadow-emerald-500/40">
                ✓
              </div>
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-xl font-black text-white tracking-wide">สั่งซื้อสำเร็จ!</h3>
              <p className="text-xs text-white/60">
                ระบบได้ล็อคสต็อกสินค้าไว้ให้คุณแล้ว กรุณาโอนเงินเพื่อยืนยันออเดอร์
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/15 text-xs text-white/80 mt-1">
                <span className="text-white/40">เลขที่ออเดอร์:</span>
                <span className="font-mono font-bold text-acid-lime">#{createdOrder.orderNumber}</span>
              </div>
            </div>

            {/* Thunder Slip Verification & Luxury Bank Card */}
            <OrderSlipUpload
              orderId={createdOrder.id}
              orderNumber={createdOrder.orderNumber}
              total={createdOrder.total}
              bankInfo={createdOrder.bankTransfer}
            />

            {/* Shipping Info Card */}
            <div className="w-full p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-left text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-white/50 text-[11px] font-bold">
                <span>📍</span> ที่อยู่จัดส่งพัสดุ
              </div>
              <p className="text-white font-bold text-xs">{createdOrder.shippingName}</p>
              <p className="text-white/65 text-[11px] leading-relaxed">{createdOrder.shippingAddress}</p>
            </div>

            <div className="w-full space-y-2 pt-1">
              <Link
                href="/member"
                onClick={() => setIsOpen(false)}
                className="btn-liquid-glass w-full py-3 rounded-xl font-bold text-xs block text-center"
              >
                ดูสถานะออเดอร์ในระบบสมาชิก →
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full py-2 text-xs text-white/40 hover:text-white transition-colors"
              >
                เสร็จสิ้น / ปิดหน้าต่าง
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
