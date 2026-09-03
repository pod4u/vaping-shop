"use client";

import Link from "next/link";
import { Product } from "../types/product";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/products/${product.id}`} className="group block">
      <div className="vapor-card rounded-2xl overflow-hidden group-hover:border-acid-lime/50 transition-all duration-300 h-full flex flex-col relative gradient-border-animated">
        {/* Animated glow overlay on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-acid-lime/20 rounded-full blur-[60px]"></div>
        </div>

        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-brand-void/80">
          <img
            src={product.image}
            alt={product.imageAlt || product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://placehold.co/400x400/120d20/5b13ec?text=VAPING";
            }}
          />

          {/* Subtle dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-brand-void/90 via-brand-void/20 to-transparent opacity-60 group-hover:opacity-30 transition-opacity duration-500"></div>

          {/* Quick action button overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="bg-acid-lime text-black px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 shadow-acid">
              <span>ดูรายละเอียด</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* Discount Badge */}
          {product.originalPrice && (
            <div className="absolute top-3 left-3 bg-acid-lime text-black text-xs font-black px-2.5 py-1 rounded-md shadow-acid-sm uppercase tracking-wider glow-pulse">
              -{Math.round((1 - product.price / product.originalPrice) * 100)}%
            </div>
          )}

          {/* Out of Stock */}
          {!product.inStock && (
            <div className="absolute inset-0 bg-brand-void/85 backdrop-blur-sm flex items-center justify-center">
              <span className="px-4 py-1.5 rounded-full bg-brand-surface border border-brand-border text-white/80 font-bold text-xs tracking-wider uppercase">
                สินค้าหมด
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col justify-between relative">
          <div>
            <h3 className="text-white font-bold text-base mb-1.5 line-clamp-1 group-hover:text-acid-lime transition-colors duration-300">
              {product.name}
            </h3>
            <p className="text-white/50 text-xs line-clamp-2 leading-relaxed mb-4 group-hover:text-white/60 transition-colors">{product.description}</p>
          </div>

          <div className="flex items-end justify-between pt-3 border-t border-brand-border/60">
            <div>
              <div className="text-xs text-white/40 font-mono mb-0.5">ราคา</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-acid-lime tracking-tight counter-glow">{product.price}฿</span>
                {product.originalPrice && (
                  <span className="text-white/30 text-xs line-through">{product.originalPrice}฿</span>
                )}
              </div>
            </div>

            {product.inStock ? (
              <div className="flex items-center gap-1.5 text-xs text-acid-lime font-mono bg-acid-lime/10 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-acid-lime animate-pulse"></span>
                <span>IN STOCK</span>
              </div>
            ) : (
              <span className="text-xs text-white/30 font-mono bg-white/5 px-2.5 py-1 rounded-full">OUT OF STOCK</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
