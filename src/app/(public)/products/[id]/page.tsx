"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Product } from "@/types/product";
import { getCatalogProductById, getCatalogProducts } from "@/lib/catalog";
import { categories, storeConfig } from "@/lib/config";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";

export default function ProductDetailPage() {
  const params = useParams();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const id = String(params.id);
    Promise.all([getCatalogProductById(id), getCatalogProducts()])
      .then(([item, all]) => {
        setProduct(item);
        setProducts(all);
      })
      .catch(() => setProduct(null));
  }, [params.id]);

  if (product === undefined) {
    return <div className="pt-28 min-h-screen flex items-center justify-center text-white/50">กำลังโหลดข้อมูลสินค้า...</div>;
  }

  if (!product) {
    return (
      <div className="pt-28 min-h-screen flex items-center justify-center">
        <div className="text-center vapor-card p-12 rounded-3xl border border-brand-border max-w-md mx-4">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl text-white font-bold mb-2">ไม่พบรายการสินค้านี้</h1>
          <p className="text-white/50 mb-6 text-sm">สินค้าที่คุณค้นหาอาจถูกย้ายหรือไม่มีในระบบ</p>
          <Link href="/products" className="btn-acid px-8 py-3 rounded-full text-sm font-bold inline-block">
            กลับไปหน้ารวมสินค้า
          </Link>
        </div>
      </div>
    );
  }

  const category = categories.find((c) => c.id === product.category);
  const relatedProducts = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="pt-28 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-mono text-white/50 mb-8">
          <Link href="/" className="hover:text-acid-lime transition-colors">HOME</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-acid-lime transition-colors">PRODUCTS</Link>
          <span>/</span>
          {category && (
            <>
              <Link href={`/products?category=${category.id}`} className="hover:text-acid-lime transition-colors uppercase">
                {category.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-acid-lime font-bold">{product.name}</span>
        </nav>

        {/* Product Detail Main */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 mb-20">
          {/* Image */}
          <div className="relative">
            <div className="relative aspect-square vapor-card rounded-3xl overflow-hidden border border-brand-border bg-brand-void/80 flex items-center justify-center">
              <img
                src={product.image}
                alt={product.imageAlt || product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://placehold.co/600x600/120d20/5b13ec?text=VAPING";
                }}
              />
              
              {/* Discount Badge */}
              {product.originalPrice && (
                <div className="absolute top-6 left-6 bg-acid-lime text-black text-xs font-black px-3.5 py-1.5 rounded-lg shadow-acid uppercase tracking-wider">
                  ลด {Math.round((1 - product.price / product.originalPrice) * 100)}%
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col justify-center">
            {category && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-brand-surface border border-brand-border w-fit mb-4">
                <span>{category.icon}</span>
                <span className="text-acid-lime text-xs font-mono font-bold uppercase">{category.nameTh}</span>
              </div>
            )}
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4 tracking-tight leading-tight">
              {product.name}
            </h1>
            
            <p className="text-white/70 text-base mb-6 leading-relaxed">{product.description}</p>

            {/* Price Block */}
            <div className="vapor-card rounded-2xl p-5 mb-8 border-brand-border">
              <div className="text-xs text-white/40 font-mono mb-1">ราคาจำหน่าย</div>
              <div className="flex items-baseline gap-4">
                <span className="text-4xl sm:text-5xl font-black text-acid-lime tracking-tight">{product.price}฿</span>
                {product.originalPrice && (
                  <>
                    <span className="text-xl text-white/30 line-through font-mono">{product.originalPrice}฿</span>
                    <span className="bg-vapor-violet/20 border border-vapor-violet/40 text-white/90 text-xs font-bold px-3 py-1 rounded-full">
                      ประหยัด {product.originalPrice - product.price}฿
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Features */}
            {product.features && product.features.length > 0 && (
              <div className="mb-8">
                <h3 className="text-white font-bold text-sm uppercase font-mono tracking-wider mb-3">จุดเด่น / คุณสมบัติ</h3>
                <div className="flex flex-wrap gap-2.5">
                  {product.features.map((feature, index) => (
                    <span key={index} className="px-3.5 py-1.5 rounded-lg bg-brand-surface border border-brand-border text-white/80 text-xs flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-acid-lime"></span>
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stock Status */}
            <div className="mb-8">
              {product.inStock ? (
                <div className="inline-flex items-center gap-2 text-xs font-mono text-acid-lime">
                  <span className="w-2 h-2 rounded-full bg-acid-lime animate-pulse"></span>
                  <span>IN STOCK • สินค้าพร้อมส่งทันที</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 text-xs font-mono text-red-400">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  <span>OUT OF STOCK • สินค้าหมดชั่วคราว</span>
                </div>
              )}
            </div>

            {/* CTA */}
            <a
              href={storeConfig.lineLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-acid px-8 py-4 rounded-full text-base font-extrabold flex items-center justify-center gap-3 tracking-wide shadow-acid"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 5.58 2 10c0 2.12.92 4.04 2.42 5.44L3 22l6.4-3.2c.84.13 1.71.2 2.6.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
              </svg>
              สั่งซื้อสินค้าผ่าน LINE ทันที
            </a>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="pt-12 border-t border-brand-border">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8">
              <div>
                <div className="text-acid-lime text-xs font-mono tracking-widest uppercase mb-1">RELATED ITEMS</div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  สินค้าที่คุณอาจสนใจ
                </h2>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
