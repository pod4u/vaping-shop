"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface FlavorWithStock {
  id: string;
  brandId: string;
  brandName: string;
  brandNameTh: string;
  brandColor: string;
  name: string;
  nameTh: string;
  color: string;
  image: string;
  stock: number;
  price: number;
}

export default function ReadyToShipProductsNavy() {
  const [products, setProducts] = useState<FlavorWithStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReadyProducts();
  }, []);

  const loadReadyProducts = async () => {
    try {
      const res = await fetch('/api/stock');
      const data = await res.json();

      if (data.success) {
        const readyProducts: FlavorWithStock[] = [];

        // API format: data.data = [{ brand, products }]
        data.data.forEach((brandData: any) => {
          const brandId = brandData.brand?.id;
          const brandName = brandData.brand?.name;
          const brandNameTh = brandData.brand?.name_th;
          const brandColor = brandData.brand?.color;

          brandData.products?.forEach((product: any) => {
            product.availableFlavors?.forEach((flavorData: any) => {
              const stock = flavorData.stock_quantity || 0;

              if (stock > 0) {
                readyProducts.push({
                  id: flavorData.id,
                  brandId,
                  brandName,
                  brandNameTh,
                  brandColor,
                  name: flavorData.flavor?.name || flavorData.id,
                  nameTh: flavorData.flavor?.name_th || flavorData.id,
                  color: flavorData.flavor?.color || '#6B7280',
                  image: flavorData.flavor?.image || '/images/placeholder.png',
                  stock,
                  price: product.price || getPrice(brandId)
                });
              }
            });
          });
        });

        // เรียงตาม stock มากไปน้อย
        readyProducts.sort((a, b) => b.stock - a.stock);

        setProducts(readyProducts.slice(0, 8)); // แสดงแค่ 8 ตัว
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPrice = (brandId: string): number => {
    const prices: Record<string, number> = {
      alfa: 450, marbo: 250, mood: 290, vplus: 380,
      eskobar: 480, mbar: 350, relx: 450
    };
    return prices[brandId] || 350;
  };

  if (isLoading) {
    return (
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-navy-glow border-t-navy-glow rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white/60">กำลังโหลดสินค้าพร้อมส่ง...</p>
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Background Effects - Navy Blue */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-navy-glow/5 rounded-full blur-[150px]"></div>
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-navy-deep to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-navy-deep to-transparent"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-navy-glow/10 border border-navy-glow/30 mb-4">
            <div className="w-2 h-2 rounded-full bg-navy-glow animate-pulse"></div>
            <span className="text-navy-glow text-sm font-bold">พร้อมส่งทันที</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4">
            สินค้า<span className="text-navy-glow">พร้อมส่ง</span>
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
              href={`/brand/${product.brandId}`}
              className="group navy-card rounded-xl overflow-hidden transition-all hover:scale-[1.02] hover:shadow-acid"
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
                    (e.target as HTMLImageElement).src = '/images/placeholder.png';
                  }}
                />

                {/* Stock Badge */}
                <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-navy-glow text-navy-deep text-xs font-black">
                  {product.stock} ชิ้น
                </div>
              </div>

              {/* Product Info */}
              <div className="p-4 border-t border-navy-border">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: product.color }}
                  />
                  <span className="text-white/60 text-xs">{product.brandNameTh}</span>
                </div>

                <h3 className="text-white font-bold text-sm sm:text-base mb-1 truncate">
                  {product.nameTh}
                </h3>
                <p className="text-white/50 text-xs truncate">{product.name}</p>

                {/* Price */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-navy-glow font-black">
                    ฿{product.price}
                  </div>
                  <div className="text-white/40 text-xs">
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
            className="inline-flex items-center gap-2 btn-acid px-8 py-4 rounded-full font-bold text-lg hover:shadow-acid transition-all"
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