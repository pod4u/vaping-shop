"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { bilingualPrimaryThai, bilingualName } from "@/lib/bilingual";

interface FlavorWithStock {
  id: string;
  brandId: string;
  brandName: string;
  brandNameTh: string | null;
  brandColor: string;
  name: string;
  nameTh: string;
  color: string;
  image: string;
  stock: number;
  price: number | null;
  productSlug?: string;
}

import { getCatalogProducts } from "@/lib/catalog";

export default function ReadyToShipProductsNavy() {
  const [products, setProducts] = useState<FlavorWithStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const load = async () => {
      try {
        const res = await fetch('/api/stock', { signal: controller.signal });
        const data = await res.json();
        clearTimeout(timeoutId);

        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          const readyProducts: FlavorWithStock[] = [];

          data.data.forEach((brandData: any) => {
            const brandId = brandData.brand?.id;
            const brandName = brandData.brand?.name;
            const brandNameTh = brandData.brand?.name_th;
            const brandColor = brandData.brand?.color;

            brandData.products?.forEach((product: any) => {
              product.availableFlavors?.forEach((flavorData: any) => {
                const stock = flavorData.stock_quantity || 0;

                if (stock > 0) {
                  const price = flavorData.sale_price ?? flavorData.price ?? null;

                  readyProducts.push({
                    id: flavorData.id,
                    brandId,
                    brandName,
                    brandNameTh,
                    brandColor,
                    name: flavorData.flavor?.name || flavorData.id,
                    nameTh: flavorData.flavor?.name_th || flavorData.id,
                    color: flavorData.flavor?.color || '#6B7280',
                    image: flavorData.flavor?.image || '/images/placeholder.svg',
                    stock,
                    price,
                    productSlug: product.slug,
                  });
                }
              });
            });
          });

          if (isMounted && readyProducts.length > 0) {
            setProducts(readyProducts.slice(0, 8));
            setIsLoading(false);
            return;
          }
        }
      } catch (error) {
        console.warn('Stock API delayed or unavailable, loading catalog fallback:', error);
      }

      // Fallback: Load from catalog dataset directly
      try {
        const catalogItems = await getCatalogProducts();
        if (isMounted) {
          const fallbackProducts: FlavorWithStock[] = catalogItems
            .filter((p) => p.inStock)
            .slice(0, 8)
            .map((p) => ({
              id: String(p.id),
              brandId: p.brandSlug || 'default',
              brandName: p.features?.[0] || 'Brand',
              brandNameTh: null,
              brandColor: '#3B82F6',
              name: p.name,
              nameTh: p.nameTh || p.name,
              color: '#3B82F6',
              image: p.image || '/images/placeholder.svg',
              stock: 50,
              price: p.price,
              productSlug: p.slug,
            }));
          setProducts(fallbackProducts);
        }
      } catch (err) {
        console.error('Failed to load fallback catalog:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  if (isLoading) {
    return (
      <section className="py-12 sm:py-16 lg:py-20 px-4 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-acid-lime/10 border border-acid-lime/30 mb-4">
              <div className="w-2 h-2 rounded-full bg-acid-lime animate-pulse"></div>
              <span className="text-acid-lime text-sm font-bold">พร้อมส่งทันที</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4">
              สินค้า<span className="text-acid-lime">พร้อมส่ง</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="navy-card rounded-2xl h-64 shimmer animate-pulse"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="py-12 sm:py-16 lg:py-20 px-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-acid-lime/5 rounded-full blur-[150px]"></div>
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-navy-deep to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-navy-deep to-transparent"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-acid-lime/10 border border-acid-lime/30 mb-4">
            <div className="w-2 h-2 rounded-full bg-acid-lime animate-pulse"></div>
            <span className="text-acid-lime text-sm font-bold">พร้อมส่งทันที</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4">
            สินค้า<span className="text-acid-lime">พร้อมส่ง</span>
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            สินค้าที่มีในสต็อก สั่งวันนี้จัดส่งทันที 🚚
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
          {products.map((product) => (
            <Link
              key={`${product.brandId}-${product.id}`}
              href={product.productSlug ? `/products/${product.productSlug}` : `/products`}
              className="group navy-card rounded-2xl overflow-hidden transition-all duration-300 h-full flex flex-col relative"
            >
              {/* Product Image */}
              <div
                className="relative aspect-square p-4"
                style={{ background: `linear-gradient(135deg, ${product.brandColor}10, ${product.brandColor}05)` }}
              >
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-contain transition-transform group-hover:scale-110"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/placeholder.svg';
                  }}
                />

                {/* Stock Badge - Acid Lime */}
                <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-acid-lime text-navy-deep text-xs font-black shadow-acid">
                  {product.stock} ชิ้น
                </div>
              </div>

              {/* Product Info */}
              <div className="p-3 sm:p-4 border-t border-navy-border flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-2 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: product.color }}
                  />
                  <span className="text-white/60 text-xs font-semibold tracking-wide truncate min-w-0">
                    {bilingualName(product.brandName, product.brandNameTh)}
                  </span>
                </div>

                <h3 className="text-white font-bold text-sm sm:text-base mb-0.5 truncate">
                  {bilingualPrimaryThai(product.nameTh, product.name).primary}
                </h3>
                {bilingualPrimaryThai(product.nameTh, product.name).secondary && (
                  <p className="text-white/50 text-xs truncate">
                    {bilingualPrimaryThai(product.nameTh, product.name).secondary}
                  </p>
                )}

                {/* Price */}
                <div className="mt-auto pt-3 flex flex-col min-[390px]:flex-row min-[390px]:items-center justify-between gap-2">
                  {product.price !== null ? (
                    <div className="text-acid-lime font-black">
                      ฿{product.price}
                    </div>
                  ) : (
                    <div className="text-white/50 text-sm">
                      สอบถามราคา
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-acid-lime font-mono bg-acid-lime/10 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-acid-lime animate-pulse"></span>
                    พร้อมส่ง
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* View All Button */}
        <div className="mt-12 text-center">
          <Link
            href="/stock"
            className="btn-liquid-acid inline-flex items-center gap-2 px-8 py-4 text-base font-bold"
          >
            <span>ดูสินค้าพร้อมส่งทั้งหมด</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
