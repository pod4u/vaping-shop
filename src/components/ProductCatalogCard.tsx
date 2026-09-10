"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { AggregatedProduct } from "@/lib/catalog-aggregate";
import { bilingualPrimary, formatPuffsShort, bilingualPrimaryThai } from "@/lib/bilingual";
import { AddToCartButton } from "@/components/AddToCartButton";

interface ProductCatalogCardProps {
  product: AggregatedProduct;
}

export default function ProductCatalogCard({ product }: ProductCatalogCardProps) {
  const [showFlavorPicker, setShowFlavorPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const { primary, secondary } = bilingualPrimary(product.name, product.name_th);
  const brandDisplay = bilingualPrimary(product.brand_name, product.brand_name_th);
  const puffLabel = formatPuffsShort(product.puff_count);

  const inStockVariants = (product.available_variants || []).filter(
    (v) => v.is_available && v.stock_quantity > 0
  );

  // Close picker on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowFlavorPicker(false);
      }
    }
    if (showFlavorPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFlavorPicker]);

  return (
    <div className="group relative flex flex-col h-full navy-card rounded-2xl overflow-hidden hover:border-acid-lime/50 transition-all duration-300">
      {/* Product Image & Link */}
      <Link href={`/products/${product.slug}`} className="block relative aspect-square overflow-hidden bg-navy-deep/80">
        <img
          src={product.image_url || "/images/placeholder.svg"}
          alt={`${primary} ${brandDisplay.primary}`}
          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
          width={400}
          height={400}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/90 via-navy-deep/20 to-transparent opacity-60 group-hover:opacity-30 transition-opacity duration-500" />
        
        {/* Discount Badge */}
        {product.sale_price && (
          <div className="absolute top-3 left-3 bg-acid-lime text-navy-deep text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-wider shadow-sm z-10">
            -{Math.round((1 - product.min_price / product.sale_price) * 100)}%
          </div>
        )}

        {/* Out of Stock Overlay */}
        {!product.has_stock && (
          <div className="absolute inset-0 bg-navy-deep/85 backdrop-blur-sm flex items-center justify-center z-10">
            <span className="px-4 py-1.5 rounded-full bg-navy-surface border border-navy-border text-white/80 font-bold text-xs tracking-wider uppercase">
              สินค้าหมด
            </span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between relative">
        <div>
          <Link href={`/products/${product.slug}`} className="block group-hover:text-acid-lime transition-colors">
            <h3 className="text-white font-bold text-sm sm:text-base mb-0.5 line-clamp-1">
              {primary}
            </h3>
            {secondary && (
              <p className="text-white/50 text-xs line-clamp-1 mb-1">{secondary}</p>
            )}
          </Link>
          <p className="text-white/40 text-xs line-clamp-1 leading-relaxed mb-3">
            {brandDisplay.primary}
            {brandDisplay.secondary ? ` · ${brandDisplay.secondary}` : ""}
            {puffLabel ? ` · ${puffLabel}` : ""}
          </p>
        </div>

        {/* Price & Stock info */}
        <div className="pt-3 border-t border-navy-border/60">
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-[11px] text-white/40 font-mono mb-0.5">ราคาเริ่มต้น</div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-acid-lime tracking-tight">
                  ฿{product.min_price.toLocaleString()}
                </span>
                {product.sale_price && (
                  <span className="text-white/30 text-xs line-through">
                    ฿{product.sale_price.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {product.has_stock ? (
              <div className="flex items-center gap-1.5 text-xs text-acid-lime font-mono bg-acid-lime/10 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-acid-lime animate-pulse" />
                <span>{inStockVariants.length} รส</span>
              </div>
            ) : (
              <span className="text-xs text-white/30 font-mono bg-white/5 px-2.5 py-1 rounded-full">หมด</span>
            )}
          </div>

          {/* ADD TO CART ACTION BUTTON */}
          {product.has_stock && (
            <div className="relative" ref={pickerRef}>
              {inStockVariants.length === 1 ? (
                // Only 1 variant: Direct Add to Cart Button
                <AddToCartButton
                  productFlavorId={inStockVariants[0].id}
                  sku={inStockVariants[0].sku}
                  variantKey={inStockVariants[0].variant_key}
                  productName={product.name}
                  productNameTh={product.name_th}
                  flavorName={inStockVariants[0].name}
                  flavorNameTh={inStockVariants[0].name_th}
                  brandName={product.brand_name}
                  brandNameTh={product.brand_name_th}
                  imageUrl={inStockVariants[0].image_url || product.image_url}
                  unitPrice={inStockVariants[0].price}
                  stockQuantity={inStockVariants[0].stock_quantity}
                  className="w-full justify-center py-2.5 font-bold text-xs sm:text-sm"
                />
              ) : (
                // Multiple variants: Open Flavor Picker
                <>
                  <button
                    type="button"
                    onClick={() => setShowFlavorPicker(!showFlavorPicker)}
                    className="btn-liquid-acid w-full py-2.5 px-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm"
                    aria-expanded={showFlavorPicker}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <span>เลือกรสชาติ ({inStockVariants.length})</span>
                    <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${showFlavorPicker ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Flavor Quick-Picker Popover */}
                  {showFlavorPicker && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 p-3 rounded-2xl bg-navy-deep/95 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/80 z-30 animate-scale-in">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                        <span className="text-xs font-bold text-white">เลือกรสชาติที่ต้องการ</span>
                        <button
                          type="button"
                          onClick={() => setShowFlavorPicker(false)}
                          className="text-white/40 hover:text-white text-xs p-1"
                          aria-label="ปิด"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs">
                        {inStockVariants.map((variant) => {
                          const flavorNameDisplay = bilingualPrimaryThai(variant.name_th, variant.name);
                          return (
                            <div
                              key={variant.id}
                              className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors gap-2"
                            >
                              <div className="min-w-0 flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: variant.color || "#a3e635" }}
                                />
                                <div className="truncate">
                                  <div className="text-white font-medium truncate">{flavorNameDisplay.primary}</div>
                                  <div className="text-white/40 text-[10px]">เหลือ {variant.stock_quantity} ชิ้น • ฿{variant.price}</div>
                                </div>
                              </div>
                              <div className="flex-shrink-0">
                                <AddToCartButton
                                  variant="compact"
                                  productFlavorId={variant.id}
                                  sku={variant.sku}
                                  variantKey={variant.variant_key}
                                  productName={product.name}
                                  productNameTh={product.name_th}
                                  flavorName={variant.name}
                                  flavorNameTh={variant.name_th}
                                  brandName={product.brand_name}
                                  brandNameTh={product.brand_name_th}
                                  imageUrl={variant.image_url || product.image_url}
                                  unitPrice={variant.price}
                                  stockQuantity={variant.stock_quantity}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-2 pt-2 border-t border-white/10 text-center">
                        <Link
                          href={`/products/${product.slug}`}
                          className="text-acid-lime hover:underline text-[11px] font-semibold"
                        >
                          ดูรายละเอียดเต็มรุ่นนี้ →
                        </Link>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
