import type { Metadata } from "next";
import { getCanonical } from "@/lib/seo";
import { getAggregatedProducts } from "@/lib/catalog-aggregate";
import { categories } from "@/lib/config";
import ProductGridServer from "@/components/ProductGridServer";
import ProductFilterClient from "./ProductFilterClient";

interface PageProps {
  searchParams: Promise<{ category?: string; search?: string }>;
}

export const revalidate = 3600;

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const hasQuery = !!(params.category || params.search);
  const canonical = getCanonical("/products");

  return {
    title: "สินค้าทั้งหมด - พอดใช้แล้วทิ้ง พอดเปลี่ยนหัว",
    description: "รวมสินค้าพอดทุกแบรนด์ ทุกหมวดหมู่ ของแท้ 100% ราคาส่ง พร้อมส่งทั่วไทย",
    alternates: { canonical },
    openGraph: {
      title: "สินค้าทั้งหมด",
      description: "รวมสินค้าพอดทุกแบรนด์ ของแท้ 100% ราคาส่ง",
      url: canonical,
      type: "website",
      siteName: "Pod4U",
      locale: "th_TH",
    },
    robots: hasQuery
      ? { index: false, follow: true }
      : { index: true, follow: true },
  };
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const categoryParam = params.category || null;
  const searchParam = params.search || "";

  let allProducts = await getAggregatedProducts();

  if (categoryParam) {
    allProducts = allProducts.filter((p) => p.category_slug === categoryParam);
  }
  if (searchParam) {
    const q = searchParam.toLowerCase();
    allProducts = allProducts.filter(
      (p) =>
        (p.name_th || "").toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.brand_name_th || "").toLowerCase().includes(q) ||
        p.brand_name.toLowerCase().includes(q)
    );
  }

  return (
    <div className="pt-28 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 text-left">
          <div className="text-acid-lime text-xs font-mono tracking-widest uppercase mb-2">EXPLORE ALL</div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-2">
            สินค้าทั้งหมด
          </h1>
          <p className="text-white/50 text-sm">เลือกสรรสินค้าคุณภาพเยี่ยม ครบทุกประเภท พร้อมส่งทันที</p>
        </div>

        <div className="mb-10">
          <a
            href="/stock"
            className="inline-flex items-center gap-3 bg-acid-lime text-navy-deep px-6 py-3.5 rounded-full font-bold text-sm shadow-acid hover:scale-105 transition-transform"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-navy-deep opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-navy-deep" />
            </span>
            <span>ดูสินค้าพร้อมส่ง</span>
          </a>
        </div>

        <ProductFilterClient
          selectedCategory={categoryParam}
          searchQuery={searchParam}
          categories={categories}
        />

        <div className="mt-8">
          <p className="text-white/40 text-sm mb-4">{allProducts.length} รุ่นสินค้า</p>
          <ProductGridServer products={allProducts} />
        </div>
      </div>
    </div>
  );
}
