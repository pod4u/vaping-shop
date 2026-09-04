"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Flavor {
  id: string;
  name: string;
  name_th: string | null;
  color: string | null;
  image: string | null;
}

interface AvailableFlavor {
  id: string;
  stock_quantity: number;
  flavor: Flavor;
}

interface Product {
  id: string;
  name: string;
  name_th: string | null;
  price: number;
  sale_price: number | null;
  puff_count: number | null;
  image_url: string | null;
  availableFlavors: AvailableFlavor[];
}

interface Brand {
  id: string;
  name: string;
  name_th: string | null;
  color: string | null;
  banner_url: string | null;
}

interface BrandStock {
  brand: Brand;
  products: Product[];
}

interface StockData {
  success: boolean;
  data: BrandStock[];
  lastUpdated: string;
}

export default function StockPage() {
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  useEffect(() => {
    fetchStock();

    // Auto refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStock();
    }, 30000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, []);

  const fetchStock = async () => {
    try {
      const res = await fetch('/api/stock');
      const data = await res.json();

      if (data.success) {
        setStockData(data);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('th-TH').format(price);
  };

  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    const today = now.toLocaleDateString('th-TH');
    const updateDate = date.toLocaleDateString('th-TH');
    const isToday = today === updateDate;

    if (diffMins < 1) return `เมื่อสักครู่`;
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
    if (isToday) return `วันนี้ ${date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;
    if (diffDays === 1) return 'เมื่อวาน';
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`;

    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short'
    });
  };

  const shareLink = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({
        title: 'สินค้าพร้อมส่ง - Vaping Shop',
        text: 'ดูสินค้าพร้อมส่งของเราได้ที่นี่',
        url: url,
      });
    } else {
      await navigator.clipboard.writeText(url);
      alert('คัดลอกลิงก์แล้ว!');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy-deep flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-vapor-violet border-t-acid-lime rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-navy-deep flex items-center justify-center">
        <div className="text-center p-4">
          <p className="text-red-400 mb-4">เกิดข้อผิดพลาด: {error}</p>
          <button
            onClick={fetchStock}
            className="bg-acid-lime text-navy-deep px-6 py-3 rounded-full font-bold hover:shadow-acid transition-all"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  const totalProducts = stockData?.data.reduce(
    (sum, b) => sum + b.products.length, 0
  ) || 0;

  const totalFlavors = stockData?.data.reduce(
    (sum, b) => sum + b.products.reduce(
      (s, p) => s + p.availableFlavors.length, 0
    ), 0
  ) || 0;

  const sortedBrands = [...(stockData?.data || [])].sort((a, b) =>
    (a.brand.name || a.brand.name_th || '').localeCompare(
      b.brand.name || b.brand.name_th || '',
      'en',
      { sensitivity: 'base' }
    )
  );

  // Get all flavors flattened for simple view
  const allFlavors: { brand: Brand; product: Product; flavor: AvailableFlavor }[] = [];
  sortedBrands.forEach(b => {
    b.products.forEach(p => {
      p.availableFlavors.forEach(f => {
        allFlavors.push({ brand: b.brand, product: p, flavor: f });
      });
    });
  });

  allFlavors.sort((a, b) => {
    const brandCompare = (a.brand.name || a.brand.name_th || '').localeCompare(
      b.brand.name || b.brand.name_th || '',
      'en',
      { sensitivity: 'base' }
    );

    if (brandCompare !== 0) return brandCompare;
    return (a.flavor.flavor.name || a.flavor.flavor.name_th || '').localeCompare(
      b.flavor.flavor.name || b.flavor.flavor.name_th || '',
      'en',
      { sensitivity: 'base' }
    );
  });

  // Filter by brand if selected
  const filteredFlavors = selectedBrand 
    ? allFlavors.filter(f => f.brand.id === selectedBrand)
    : allFlavors;

  return (
    <div className="min-h-screen bg-navy-deep">
      {/* Title Section */}
      <section className="py-8 px-4 border-b border-navy-border">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-acid-lime animate-pulse"></span>
              <h1 className="text-2xl font-black text-white">
                สินค้าพร้อมส่ง
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-white/50 text-xs">
                {stockData?.lastUpdated && `อัปเดต ${formatLastUpdated(stockData.lastUpdated)}`}
              </span>
              <button
                onClick={shareLink}
                className="text-white/60 hover:text-acid-lime transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            </div>
          </div>
          <p className="text-white/50 text-sm">
            {totalFlavors} รายการ • {totalProducts} สินค้า • 7 แบรนด์
          </p>
        </div>
      </section>

      {/* Brand Filter Tabs */}
      <section className="sticky top-20 z-40 bg-navy-deep/95 backdrop-blur-xl border-b border-navy-border">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setSelectedBrand(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedBrand === null
                  ? 'bg-acid-lime text-navy-deep'
                  : 'bg-navy-surface text-white/70 hover:bg-white/10'
              }`}
            >
              ทั้งหมด ({totalFlavors})
            </button>
            {sortedBrands.map(b => {
              const count = b.products.reduce((s, p) => s + p.availableFlavors.length, 0);
              return (
                <button
                  key={b.brand.id}
                  onClick={() => setSelectedBrand(b.brand.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    selectedBrand === b.brand.id
                      ? 'text-white'
                      : 'bg-navy-surface text-white/70 hover:bg-white/10'
                  }`}
                  style={selectedBrand === b.brand.id ? { backgroundColor: b.brand.color || '#7928ca' } : {}}
                >
                  {b.brand.name || b.brand.name_th} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Flavor Grid - Simple & Clean */}
      <section className="py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredFlavors.map((item) => (
              <Link
                key={`${item.product.id}-${item.flavor.id}`}
                href={`/products/${item.flavor.id}`}
                className="group bg-navy-surface/50 border border-navy-border rounded-xl p-3 hover:border-acid-lime/50 transition-all h-full flex flex-col"
              >
                {/* Flavor Image */}
                <div className="relative aspect-square bg-navy-void rounded-lg mb-3 overflow-hidden">
                  {item.flavor.flavor.image ? (
                    <img
                      src={item.flavor.flavor.image}
                      alt={item.flavor.flavor.name_th || item.flavor.flavor.name || ''}
                      className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-2xl font-bold text-white/30"
                      style={{ backgroundColor: item.flavor.flavor.color ? `${item.flavor.flavor.color}20` : 'transparent' }}
                    >
                      {item.flavor.flavor.name_th?.charAt(0) || item.flavor.flavor.name?.charAt(0) || '?'}
                    </div>
                  )}
                  
                  {/* Stock Badge */}
                  <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-acid-lime/90 text-navy-deep text-[10px] font-bold">
                    {item.flavor.stock_quantity}
                  </div>
                </div>

                {/* Flavor Name */}
                <div className="space-y-0.5">
                  <p className="text-white text-sm font-medium truncate">
                    {item.flavor.flavor.name_th || item.flavor.flavor.name}
                  </p>
                  <p className="text-white/40 text-xs truncate">
                    {item.brand.name || item.brand.name_th}
                  </p>
                  {item.flavor.flavor.name_th && item.flavor.flavor.name && (
                    <p className="text-white/30 text-[10px] truncate">
                      {item.flavor.flavor.name}
                    </p>
                  )}
                </div>

                {/* Price */}
                <div className="mt-auto pt-2 border-t border-navy-border/50">
                  <p className="text-acid-lime text-sm font-bold">
                    ฿{formatPrice(item.product.sale_price || item.product.price)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Order CTA */}
      <section className="py-6 px-4 border-t border-navy-border">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-white/50 text-sm mb-4">
            สนใจสินค้าทัก LINE ได้เลย
          </p>
          <a
            href="https://lin.ee/RU5qNLj"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-acid-lime text-navy-deep px-6 py-3 rounded-full font-bold hover:shadow-acid transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 5.58 2 10c0 2.12.92 4.04 2.42 5.44L3 22l6.4-3.2c.84.13 1.71.2 2.6.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
            </svg>
            สั่งซื้อผ่าน LINE
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-4 px-4 border-t border-navy-border">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-white/30 text-xs">
            อัปเดต: {stockData?.lastUpdated ? formatLastUpdated(stockData.lastUpdated) : '-'}
          </p>
        </div>
      </footer>

      {/* Hide scrollbar style */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
