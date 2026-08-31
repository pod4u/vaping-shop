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

  useEffect(() => {
    fetchStock();
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

    if (diffMins < 1) return `วันนี้ ${date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;
    if (diffMins < 60) return `วันนี้ ${date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;
    if (isToday) return `วันนี้ ${date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;
    if (diffDays === 1) return 'เมื่อวาน';
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
    
    return date.toLocaleDateString('th-TH', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
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
      <div className="min-h-screen bg-brand-void flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-vapor-violet border-t-acid-lime rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">กำลังโหลดข้อมูลสินค้า...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-brand-void flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">เกิดข้อผิดพลาด: {error}</p>
          <button
            onClick={fetchStock}
            className="btn-acid px-6 py-3 rounded-full font-bold"
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

  return (
    <div className="min-h-screen bg-brand-void">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-brand-void/80 backdrop-blur-xl border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-vapor-violet/20 border border-vapor-violet/50 flex items-center justify-center">
                <span className="text-xl">💨</span>
              </div>
              <span className="text-xl font-black text-white">
                VAPING <span className="text-acid-lime">SHOP</span>
              </span>
            </Link>

            <button
              onClick={shareLink}
              className="btn-acid px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              แชร์
            </button>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative py-12 px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-vapor-violet/20 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-acid-lime/10 rounded-full blur-[100px]"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-acid-lime/10 border border-acid-lime/30 mb-6">
            <span className="w-2 h-2 rounded-full bg-acid-lime animate-pulse"></span>
            <span className="text-acid-lime text-xs font-mono tracking-wider uppercase">
              อัปเดต {stockData?.lastUpdated ? formatLastUpdated(stockData.lastUpdated) : '-'}
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white mb-4">
            สินค้า <span className="text-acid-lime">พร้อมส่ง</span>
          </h1>

          <p className="text-white/60 text-lg mb-8">
            มีสินค้าพร้อมส่ง {totalProducts} รายการ, {totalFlavors} รสชาติ
          </p>

          <a
            href="https://line.me/ti/p/@vaping-shop"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-acid px-8 py-4 rounded-full text-base font-extrabold inline-flex items-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 5.58 2 10c0 2.12.92 4.04 2.42 5.44L3 22l6.4-3.2c.84.13 1.71.2 2.6.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
            </svg>
            สั่งซื้อผ่าน LINE
          </a>
        </div>
      </section>

      {/* Brand Sections */}
      {stockData?.data.map((brandStock) => (
        <section key={brandStock.brand.id} className="py-8 px-4 relative">
          {/* Brand Banner */}
          <div className="max-w-7xl mx-auto mb-8">
            <div
              className="relative h-28 md:h-44 rounded-2xl overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${brandStock.brand.color || '#7928ca'}40, ${brandStock.brand.color || '#7928ca'}10)` }}
            >
              {/* Animated Background Elements */}
              <div className="absolute inset-0 overflow-hidden">
                <div 
                  className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-3xl opacity-30 animate-pulse"
                  style={{ backgroundColor: brandStock.brand.color || '#7928ca' }}
                ></div>
                <div 
                  className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full blur-2xl opacity-20"
                  style={{ backgroundColor: '#05FF00' }}
                ></div>
                {/* Diagonal Lines */}
                <div 
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: `repeating-linear-gradient(
                      45deg,
                      transparent,
                      transparent 10px,
                      rgba(255,255,255,0.1) 10px,
                      rgba(255,255,255,0.1) 20px
                    )`
                  }}
                ></div>
              </div>

              {/* Content */}
              <div className="relative z-10 h-full flex items-center justify-between px-6 md:px-10">
                <div>
                  <h2 
                    className="text-3xl md:text-5xl font-black text-white drop-shadow-lg"
                    style={{ textShadow: `0 0 40px ${brandStock.brand.color || '#7928ca'}` }}
                  >
                    {brandStock.brand.name_th || brandStock.brand.name}
                  </h2>
                  <p className="text-white/60 text-sm md:text-base mt-1">
                    {brandStock.products.length} สินค้าพร้อมส่ง
                  </p>
                </div>

                {/* Brand Icon */}
                <div 
                  className="w-14 h-14 md:w-20 md:h-20 rounded-2xl flex items-center justify-center text-3xl md:text-4xl font-black text-white shadow-2xl"
                  style={{ 
                    backgroundColor: brandStock.brand.color || '#7928ca',
                    boxShadow: `0 0 30px ${brandStock.brand.color || '#7928ca'}60`
                  }}
                >
                  {brandStock.brand.name.charAt(0)}
                </div>
              </div>

              {/* Bottom Gradient */}
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-brand-void to-transparent"></div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto">
            {/* Product Info - เต็มความกว้าง */}
            {brandStock.products.map((product) => (
              <div key={product.id} className="mb-12">
                {/* Product Header */}
                <div className="vapor-card rounded-2xl p-6 mb-6">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <h3 className="text-white font-bold text-2xl">
                        {product.name_th || product.name}
                      </h3>
                      {product.puff_count && (
                        <span className="inline-block mt-2 px-3 py-1 rounded bg-vapor-violet/20 text-vapor-violet text-sm font-mono">
                          {product.puff_count / 1000}K Puffs
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-acid-lime text-3xl font-black">
                        ฿{formatPrice(product.sale_price || product.price)}
                      </div>
                      {product.sale_price && (
                        <div className="text-white/40 text-base line-through">
                          ฿{formatPrice(product.price)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Flavors Grid - นอก product card */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl md:text-2xl font-black text-white">
                      รสชาติที่มี ({product.availableFlavors.length})
                    </h2>
                    <span className="text-acid-lime text-sm font-bold">พร้อมส่ง</span>
                  </div>

                  {/* Grid เหมือนหน้าแบรนด์ */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                    {product.availableFlavors.map((af, index) => (
                      <div
                        key={af.id}
                        className="group vapor-card rounded-2xl overflow-hidden card-tilt animate-slide-up"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        {/* Flavor Image */}
                        <div className="relative aspect-square bg-brand-void overflow-hidden">
                          {af.flavor.image ? (
                            <img
                              src={af.flavor.image}
                              alt={af.flavor.name || ''}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div 
                              className="w-full h-full flex items-center justify-center text-white font-bold text-3xl"
                              style={{ backgroundColor: af.flavor.color ? `${af.flavor.color}30` : 'rgba(255,255,255,0.1)' }}
                            >
                              {af.flavor.name_th?.charAt(0) || af.flavor.name?.charAt(0)}
                            </div>
                          )}

                          {/* พร้อมส่ง Badge */}
                          <div className="absolute top-2 left-2 px-3 py-1 rounded-full bg-acid-lime text-brand-void text-xs font-black uppercase tracking-wide shadow-lg">
                            ✓ พร้อมส่ง
                          </div>

                          {/* Stock Badge */}
                          {af.stock_quantity > 1 && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white text-brand-void text-xs font-black flex items-center justify-center shadow-lg">
                              {af.stock_quantity}
                            </div>
                          )}

                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-brand-void/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                            <span className="text-acid-lime text-sm font-bold">พร้อมส่ง</span>
                          </div>
                        </div>

                        {/* Flavor Info */}
                        <div className="p-4 text-center">
                          <h3 className="text-white font-bold text-sm mb-1 group-hover:text-acid-lime transition-colors">
                            {af.flavor.name_th || af.flavor.name}
                          </h3>
                          <p className="text-white/40 text-xs">{af.flavor.name}</p>

                          {/* Color indicator */}
                          {af.flavor.color && (
                            <div
                              className="w-3 h-3 rounded-full mx-auto mt-2"
                              style={{ backgroundColor: af.flavor.color }}
                            ></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-brand-border">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-white/40 text-sm mb-4">
            อัปเดตล่าสุด: {stockData?.lastUpdated ? formatLastUpdated(stockData.lastUpdated) : '-'}
          </p>
          <p className="text-white/60 text-sm">
            สนใจสินค้าทัก LINE ได้เลย แอดมินตอบเร็ว 🚀
          </p>
          <Link href="/" className="text-acid-lime text-sm mt-4 inline-block hover:underline">
            ← กลับหน้าร้าน
          </Link>
        </div>
      </footer>
    </div>
  );
}