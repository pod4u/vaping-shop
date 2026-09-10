import type { Product } from "../types/product";
import { getCatalogProducts } from "@/lib/catalog";
import ProductCardNavy from "./ProductCardNavy";
import Link from "next/link";

const fallbackFeaturedProducts: Product[] = [
  {
    id: "marbo-mswitch-15k-wb",
    name: "MARBO M SWITCH 15K - Watermelon Bubblegum",
    nameTh: "มาร์โบ หัวเปลี่ยน MSW 15K - แตงโมบับเบิ้ลกัม",
    category: "flavor-pod",
    slug: "marbo-m-switch-15k",
    brandSlug: "marbo",
    price: 390,
    image: "https://puslxgriozubqlpoxrqo.supabase.co/storage/v1/object/public/product-images/marbo/m-switch-15k/watermelon-bubblegum.webp",
    description: "หัวพอตพร้อมน้ำยา สำหรับเครื่อง MARBO M SWITCH และ F SWITCH",
    features: ["MARBO", "15,000 Puffs", "Watermelon Bubblegum"],
    inStock: true,
    isFeatured: true,
  },
  {
    id: "moood-14k-bb",
    name: "MOOOD Monster Series 14K - Blueberry",
    nameTh: "มู้ด มอนสเตอร์ 14K - บลูเบอร์รี่",
    category: "disposable-pod",
    slug: "moood-monster-series-14k",
    brandSlug: "moood",
    price: 350,
    image: "https://puslxgriozubqlpoxrqo.supabase.co/storage/v1/object/public/product-images/moood/monster-series-14k/blueberry.webp",
    description: "พอตใช้แล้วทิ้งรุ่นใหญ่ 14,000 คำ รสชาติเข้มข้น",
    features: ["MOOOD", "14,000 Puffs", "Blueberry"],
    inStock: true,
    isFeatured: true,
  },
  {
    id: "relx-pro-2-mf",
    name: "RELX Pod Pro 2 - Mint Freeze",
    nameTh: "รีแล็กซ์ พอดโปร 2 - มิ้นท์ฟรีซ",
    category: "flavor-pod",
    slug: "relx-pod-pro-2",
    brandSlug: "relx",
    price: 200,
    image: "https://puslxgriozubqlpoxrqo.supabase.co/storage/v1/object/public/product-images/relx/pro-2/mint-freeze.webp",
    description: "หัวน้ำยา RELX แท้ รสชาติเย็นสดชื่น ฟีลสูบนุ่มลึก",
    features: ["RELX", "Mint Freeze", "3% Nicotine"],
    inStock: true,
    isFeatured: true,
  },
  {
    id: "vplus-16k-mint",
    name: "VPLUS 16K - Mint",
    nameTh: "วีพลัส 16K - มิ้นท์",
    category: "disposable-pod",
    slug: "vplus-16k",
    brandSlug: "vplus",
    price: 340,
    image: "https://puslxgriozubqlpoxrqo.supabase.co/storage/v1/object/public/product-images/vplus/16k/mint.jpg",
    description: "พอตใช้แล้วทิ้ง VPLUS 16,000 คำ หน้าจอดิจิทัลบอกแบตและน้ำยา",
    features: ["VPLUS", "16,000 Puffs", "Mint"],
    inStock: true,
    isFeatured: true,
  },
];

export default async function FeaturedProductsNavy() {
  let featuredProducts: Product[] = [];

  try {
    const items = await getCatalogProducts();
    const inStockItems = items.filter((item) => item.inStock);
    if (inStockItems.length > 0) {
      featuredProducts = inStockItems.slice(0, 4);
    }
  } catch (error) {
    console.warn("FeaturedProducts fetch failed, using fallback:", error);
  }

  if (featuredProducts.length === 0) {
    featuredProducts = fallbackFeaturedProducts;
  }
  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Multi-layer depth background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-navy-deep to-transparent"></div>

        <div className="absolute top-1/3 left-[10%] w-[400px] h-[400px] bg-acid-lime/10 rounded-full blur-[120px] animate-float-slow"></div>
        <div className="absolute bottom-1/4 right-[15%] w-[300px] h-[300px] bg-acid-lime/5 rounded-full blur-[100px] animate-float-slow" style={{ animationDelay: '-2s' }}></div>

        <div className="absolute inset-0 bg-[radial-gradient(rgba(212,255,20,0.03)_1px,transparent_1px)] bg-[size:36px_36px] opacity-50"></div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-navy-deep to-transparent"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
          <div>
            <div className="text-acid-lime text-xs font-mono tracking-widest uppercase mb-2">TOP PICKS</div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              สินค้าแนะนำ
            </h2>
          </div>
          <Link
            href="/products"
            className="mt-3 sm:mt-0 inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-acid-lime transition-colors group"
          >
            ดูทั้งหมด
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product, index) => (
            <div key={product.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
              <ProductCardNavy product={product} />
            </div>
          ))}
        </div>

        <div className="mt-10 text-center sm:hidden">
          <Link
            href="/products"
            className="btn-liquid-acid w-full px-6 py-3.5 text-sm inline-flex items-center justify-center gap-2"
          >
            ดูสินค้าทั้งหมด
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
