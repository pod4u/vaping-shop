"use client";

import Link from "next/link";
import { Product } from "../types/product";

interface ProductCardHybridProps {
  product: Product;
}

export default function ProductCardHybrid({ product }: ProductCardHybridProps) {
  return (
    <Link href={`/products/${product.id}`} className="group block">
      <div className="hybrid-card rounded-2xl overflow-hidden group-hover:border-hybrid-glow-bright/50 transition-all duration-300 h-full flex flex-col relative gradient-border-animated-hybrid">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-hybrid-glow/20 rounded-full blur-[60px]"></div>
        </div>

        <div className="relative aspect-square overflow-hidden bg-hybrid-deep/80">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://placehold.co/400x400/020617/3b82f6?text=VAPING";
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-hybrid-deep/90 via-hybrid-deep/20 to-transparent opacity-60 group-hover:opacity-30 transition-opacity duration-500"></div>

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="bg-gradient-to-r from-hybrid-glow to-hybrid-blue text-white px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 shadow-[0_0_25px_rgba(37,99,235,0.4)]">
              <span>ดูรายละเอียด</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {product.originalPrice && (
            <div className="absolute top-3 left-3 bg-hybrid-blue text-white text-xs font-black px-2.5 py-1 rounded-md shadow-[0_0_15px_rgba(59,130,246,0.4)] uppercase tracking-wider">
              -{Math.round((1 - product.price / product.originalPrice) * 100)}%
            </div>
          )}

          {!product.inStock && (
            <div className="absolute inset-0 bg-hybrid-deep/85 backdrop-blur-sm flex items-center justify-center">
              <span className="px-4 py-1.5 rounded-full bg-hybrid-surface border border-hybrid-border text-white/80 font-bold text-xs tracking-wider uppercase">
                สินค้าหมด
              </span>
            </div>
          )}
        </div>

        <div className="p-5 flex-1 flex flex-col justify-between relative">
          <div>
            <h3 className="text-white font-bold text-base mb-1.5 line-clamp-1 group-hover:text-hybrid-blue transition-colors duration-300">
              {product.name}
            </h3>
            <p className="text-white/50 text-xs line-clamp-2 leading-relaxed mb-4 group-hover:text-white/60 transition-colors">{product.description}</p>
          </div>

          <div className="flex items-end justify-between pt-3 border-t border-hybrid-border/60">
            <div>
              <div className="text-xs text-white/40 font-mono mb-0.5">ราคา</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-hybrid-blue tracking-tight">{product.price}฿</span>
                {product.originalPrice && (
                  <span className="text-white/30 text-xs line-through">{product.originalPrice}฿</span>
                )}
              </div>
            </div>

            {product.inStock ? (
              <div className="flex items-center gap-1.5 text-xs text-hybrid-blue font-mono bg-hybrid-blue/10 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-hybrid-blue animate-pulse"></span>
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