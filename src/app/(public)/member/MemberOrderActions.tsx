"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/hooks/use-cart";
import type { CartItem } from "@/types/cart";

interface OrderItemSnapshot {
  product_flavor_id: string;
  product_name: string;
  flavor_name: string;
  brand_name: string;
  variant_key: string;
  sku: string;
  unit_price: number | string;
  quantity: number;
}

export default function MemberOrderActions({
  orderId,
  orderNumber,
  orderItems,
  status,
}: {
  orderId: string;
  orderNumber: string;
  orderItems: OrderItemSnapshot[];
  status: "draft" | "pending";
}) {
  const router = useRouter();
  const { items: cartItems, startEditingOrder } = useCart();
  const [isCancelling, setIsCancelling] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [error, setError] = useState("");

  function editOrder() {
    if (cartItems.length > 0 && !window.confirm("รายการในตะกร้าปัจจุบันจะถูกแทนที่ด้วยออเดอร์นี้ ต้องการดำเนินการต่อหรือไม่?")) {
      return;
    }

    const items: CartItem[] = orderItems.map((item) => ({
      productFlavorId: item.product_flavor_id,
      sku: item.sku,
      variantKey: item.variant_key,
      productName: item.product_name,
      productNameTh: null,
      flavorName: item.flavor_name,
      flavorNameTh: null,
      brandName: item.brand_name,
      brandNameTh: null,
      imageUrl: null,
      unitPrice: Number(item.unit_price),
      quantity: item.quantity,
    }));

    startEditingOrder(orderId, orderNumber, items);
    router.push("/stock?source=member&mode=edit");
  }

  async function handleConfirmCancel() {
    setIsCancelling(true);
    setError("");
    try {
      const response = await fetch(`/api/customers/orders/${orderId}/cancel`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ยกเลิกออเดอร์ไม่สำเร็จ");
      setShowConfirmCancel(false);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ยกเลิกออเดอร์ไม่สำเร็จ");
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-3.5 backdrop-blur-md">
      {!showConfirmCancel ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-white/60 flex items-center gap-1.5">
            <span className="text-amber-300">⏳</span>
            <span>
              {status === "draft"
                ? "ยังสามารถแก้ไขจำนวนสินค้า หรือยกเลิกออเดอร์นี้ได้"
                : "ล็อคสต็อกไว้ให้ 30 นาที หากไม่สะดวกโอน สามารถกดยกเลิกเพื่อคืนสต็อกได้"}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {status === "draft" && (
              <button
                type="button"
                onClick={editOrder}
                className="btn-liquid-acid px-4 py-2 rounded-xl text-xs font-black"
              >
                ✏️ แก้ไขสินค้า
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowConfirmCancel(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-300/80 hover:text-red-200 hover:bg-red-500/10 border border-red-500/20 transition-all ml-auto sm:ml-0"
            >
              ✕ ยกเลิกออเดอร์
            </button>
          </div>
        </div>
      ) : (
        /* INLINE CONFIRMATION MODAL - SLEEK & PREMIUM */
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 space-y-2.5 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start gap-2 text-xs text-red-200">
            <span className="text-base leading-none">⚠️</span>
            <div className="flex-1">
              <p className="font-bold text-white">ยืนยันการยกเลิกออเดอร์ #{orderNumber} หรือไม่?</p>
              <p className="text-white/60 text-[11px] mt-0.5">
                สินค้าจะถูกปลดล็อคคืนสต็อกส่วนกลางทันที และออเดอร์จะถูกย้ายไปในประวัติออเดอร์
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowConfirmCancel(false)}
              disabled={isCancelling}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white transition-colors"
            >
              ไม่ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleConfirmCancel}
              disabled={isCancelling}
              className="px-4 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-black text-xs shadow-lg shadow-red-500/30 transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {isCancelling ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>กำลังยกเลิก...</span>
                </>
              ) : (
                <span>ยืนยันยกเลิกออเดอร์</span>
              )}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
