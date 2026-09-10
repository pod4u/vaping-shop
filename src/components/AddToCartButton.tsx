"use client";

import { useState } from "react";
import { useCart } from "@/hooks/use-cart";
import { MAX_QUANTITY_PER_ITEM } from "@/types/cart";

interface AddToCartButtonProps {
  productFlavorId: string;
  sku: string | null;
  variantKey: string | null;
  productName: string;
  productNameTh: string | null;
  flavorName: string;
  flavorNameTh: string | null;
  brandName: string;
  brandNameTh: string | null;
  imageUrl: string | null;
  unitPrice: number | null;
  stockQuantity?: number;
  className?: string;
  variant?: "default" | "compact";
}

export function AddToCartButton({
  productFlavorId,
  sku,
  variantKey,
  productName,
  productNameTh,
  flavorName,
  flavorNameTh,
  brandName,
  brandNameTh,
  imageUrl,
  unitPrice,
  stockQuantity,
  className = "",
  variant = "default",
}: AddToCartButtonProps) {
  const { addItem, hasItem, getQuantity, isHydrated } = useCart();
  const [isAdding, setIsAdding] = useState(false);

  const alreadyInCart = hasItem(productFlavorId);
  const currentQuantity = getQuantity(productFlavorId);
  const maxReached = currentQuantity >= MAX_QUANTITY_PER_ITEM;

  const handleAdd = () => {
    if (maxReached) return;

    setIsAdding(true);

    addItem({
      productFlavorId,
      sku,
      variantKey,
      productName,
      productNameTh,
      flavorName,
      flavorNameTh,
      brandName,
      brandNameTh,
      imageUrl,
      unitPrice,
    });

    // Reset animation
    setTimeout(() => setIsAdding(false), 300);
  };

  if (!isHydrated) {
    return (
      <button
        type="button"
        disabled
        className={`bg-navy-surface/50 text-white/40 px-3 py-1.5 rounded-lg text-xs font-medium ${className}`}
        aria-label="กำลังโหลด"
      >
        โหลด...
      </button>
    );
  }

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={handleAdd}
        disabled={maxReached}
        className={`flex items-center gap-1 text-xs font-medium transition-all ${
          maxReached
            ? "text-white/40"
            : alreadyInCart
            ? "text-acid-lime"
            : "text-white/80 hover:text-acid-lime"
        } ${className}`}
        aria-label={
          maxReached
            ? `สินค้าครบจำนวนสูงสุด ${MAX_QUANTITY_PER_ITEM} ชิ้นแล้ว`
            : alreadyInCart
            ? `เพิ่ม ${flavorName} ในรายการอีก มีอยู่แล้ว ${currentQuantity} ชิ้น`
            : `เพิ่ม ${flavorName} ลงตะกร้า`
        }
      >
        <svg
          className={`w-4 h-4 transition-transform ${isAdding ? "scale-125" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        <span aria-hidden="true">
          {maxReached
            ? "ครบแล้ว"
            : alreadyInCart
              ? `เพิ่มลงตะกร้า (${currentQuantity})`
              : "เพิ่มลงตะกร้า"}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={maxReached}
      className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
        maxReached
          ? "bg-navy-surface/50 text-white/40 cursor-not-allowed"
          : alreadyInCart
          ? "bg-acid-lime/20 text-acid-lime border border-acid-lime/30 hover:bg-acid-lime/30"
          : "bg-acid-lime text-navy-deep hover:shadow-acid"
      } ${className}`}
      aria-label={
        maxReached
          ? `สินค้าครบจำนวนสูงสุด ${MAX_QUANTITY_PER_ITEM} ชิ้นแล้ว`
          : alreadyInCart
          ? `เพิ่ม ${flavorName} ในรายการอีก มีอยู่แล้ว ${currentQuantity} ชิ้น`
          : `เพิ่ม ${flavorName} ลงตะกร้า`
      }
    >
      <svg
        className={`w-4 h-4 transition-transform ${isAdding ? "scale-125" : ""}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        {maxReached ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        )}
      </svg>
      {maxReached
        ? "ครบแล้ว"
        : alreadyInCart
        ? `เพิ่มอีก (${currentQuantity})`
        : "เพิ่มลงตะกร้า"}
    </button>
  );
}
