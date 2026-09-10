"use client";

import { useState } from "react";
import { bilingualPrimaryThai } from "@/lib/bilingual";
import { useCart } from "@/hooks/use-cart";
import { storeConfig } from "@/lib/config";
import { MAX_QUANTITY_PER_ITEM } from "@/types/cart";

export interface VariantDetail {
  id: string;
  flavor_name: string;
  flavor_name_th: string | null;
  flavor_color: string;
  flavor_slug: string;
  price: number;
  sale_price: number | null;
  stock_quantity: number;
  is_available: boolean;
  image_url: string | null;
  nicotine_level: string | null;
  sku?: string | null;
  variant_key?: string | null;
}

interface ProductDetailFlavorSelectorProps {
  productName: string;
  productNameTh: string | null;
  brandName: string;
  brandNameTh: string | null;
  variants: VariantDetail[];
  defaultImageUrl: string | null;
}

export default function ProductDetailFlavorSelector({
  productName,
  productNameTh,
  brandName,
  brandNameTh,
  variants,
  defaultImageUrl,
}: ProductDetailFlavorSelectorProps) {
  const inStockVariants = variants.filter((v) => v.is_available && v.stock_quantity > 0);
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    inStockVariants.length > 0 ? inStockVariants[0].id : variants[0]?.id || ""
  );
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const { addItem, getQuantity, hasItem } = useCart();

  const selectedVariant = variants.find((v) => v.id === selectedVariantId) || inStockVariants[0];

  const handleAddToCart = () => {
    if (!selectedVariant) return;

    for (let i = 0; i < quantity; i++) {
      addItem({
        productFlavorId: selectedVariant.id,
        sku: selectedVariant.sku || null,
        variantKey: selectedVariant.variant_key || null,
        productName,
        productNameTh,
        flavorName: selectedVariant.flavor_name,
        flavorNameTh: selectedVariant.flavor_name_th,
        brandName,
        brandNameTh,
        imageUrl: selectedVariant.image_url || defaultImageUrl,
        unitPrice: selectedVariant.price,
      });
    }

    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  const currentInCart = selectedVariant ? getQuantity(selectedVariant.id) : 0;
  const isOutOfStock = !selectedVariant || !selectedVariant.is_available || selectedVariant.stock_quantity <= 0;

  return (
    <div className="space-y-6">
      {/* Flavors Grid / Selector */}
      {variants.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold text-sm uppercase font-mono tracking-wider">
              เลือกรสชาติ ({variants.length} รสชาติ)
            </h2>
            {selectedVariant && (
              <span className="text-xs font-mono text-acid-lime">
                {selectedVariant.is_available && selectedVariant.stock_quantity > 0
                  ? `พร้อมส่ง (${selectedVariant.stock_quantity} ชิ้น)`
                  : "สินค้าหมด"}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
            {variants.map((variant) => {
              const flavorDisplay = bilingualPrimaryThai(variant.flavor_name_th, variant.flavor_name);
              const isSelected = variant.id === selectedVariantId;
              const hasStock = variant.is_available && variant.stock_quantity > 0;

              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => {
                    setSelectedVariantId(variant.id);
                    setQuantity(1);
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "bg-acid-lime/15 border-acid-lime shadow-[0_0_15px_rgba(212,255,20,0.2)]"
                      : hasStock
                      ? "bg-navy-surface/60 border-navy-border hover:border-white/30 text-white/80"
                      : "bg-navy-surface/20 border-white/5 opacity-40 cursor-not-allowed"
                  }`}
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: variant.flavor_color || "#a3e635" }}
                    />
                    <div className="truncate">
                      <div className={`text-xs font-bold truncate ${isSelected ? "text-acid-lime" : "text-white"}`}>
                        {flavorDisplay.primary}
                      </div>
                      <div className="text-[10px] text-white/40 font-mono truncate">
                        ฿{variant.price} {hasStock ? `• เหลือ ${variant.stock_quantity}` : "• หมด"}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="text-acid-lime text-xs font-black ml-1 flex-shrink-0">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Flavor Info & Price */}
      {selectedVariant && (
        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs text-white/50 mb-0.5">รสชาติที่เลือก:</div>
            <div className="text-white font-black text-base flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{ backgroundColor: selectedVariant.flavor_color || "#a3e635" }}
              />
              <span>{bilingualPrimaryThai(selectedVariant.flavor_name_th, selectedVariant.flavor_name).primary}</span>
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-acid-lime">฿{selectedVariant.price.toLocaleString()}</span>
            {selectedVariant.sale_price && (
              <span className="text-sm text-white/30 line-through">฿{Number(selectedVariant.sale_price).toLocaleString()}</span>
            )}
          </div>
        </div>
      )}

      {/* Quantity Selector & Action Buttons */}
      <div className="space-y-3 pt-2">
        {!isOutOfStock && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/60 font-medium">จำนวน:</span>
            <div className="flex items-center rounded-xl border border-white/15 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/10 disabled:opacity-30 font-bold"
              >
                -
              </button>
              <span className="w-10 text-center text-sm font-bold text-white font-mono">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(Math.min(MAX_QUANTITY_PER_ITEM, quantity + 1))}
                disabled={quantity >= MAX_QUANTITY_PER_ITEM || (selectedVariant && quantity >= selectedVariant.stock_quantity)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/10 disabled:opacity-30 font-bold"
              >
                +
              </button>
            </div>
            {currentInCart > 0 && (
              <span className="text-xs text-acid-lime font-mono">
                (มีในตะกร้าแล้ว {currentInCart} ชิ้น)
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          {/* Main ADD TO CART BUTTON */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`btn-liquid-acid flex-1 py-4 px-6 rounded-full text-sm sm:text-base font-black flex items-center justify-center gap-2.5 transition-all shadow-acid ${
              isOutOfStock ? "opacity-40 cursor-not-allowed" : ""
            }`}
          >
            {justAdded ? (
              <>
                <svg className="w-5 h-5 text-navy-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                <span>เพิ่มลงตะกร้าแล้ว!</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span>{isOutOfStock ? "สินค้าหมดชั่วคราว" : "เพิ่มลงตะกร้าสินค้า"}</span>
              </>
            )}
          </button>

          {/* Secondary LINE Button */}
          <a
            href={storeConfig.lineLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-liquid-glass py-4 px-6 rounded-full text-sm sm:text-base font-bold flex items-center justify-center gap-2 sm:w-auto"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 5.58 2 10c0 2.12.92 4.04 2.42 5.44L3 22l6.4-3.2c.84.13 1.71.2 2.6.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
            </svg>
            <span>ทัก LINE</span>
          </a>
        </div>
      </div>
    </div>
  );
}
