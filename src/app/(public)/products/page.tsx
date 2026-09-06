import type { Metadata } from "next";
import { getCanonical } from "@/lib/seo";
import { getAggregatedProducts, matchText, matchArray, matchPuffCount } from "@/lib/catalog-aggregate";
import { getServerSupabase } from "@/lib/supabase";
import ProductGridServer from "@/components/ProductGridServer";
import ProductFilterClient from "./ProductFilterClient";

interface PageProps {
  searchParams: Promise<{
    category?: string;
    brand?: string;
    puffs?: string;
    stock?: string;
    sort?: string;
    search?: string;
  }>;
}

export const revalidate = 3600;

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const hasQuery = !!(params.category || params.brand || params.puffs || params.stock || params.sort || params.search);
  const canonical = getCanonical("/products");

  return {
    title: "สินค้าทั้งหมด",
    description:
      "รวมพอตใช้แล้วทิ้งและพอดเปลี่ยนหัวทุกแบรนด์ MARBO, ALFA, M BAR ค้นหาตามชื่อรุ่น แบรนด์ หรือจำนวนพัฟได้",
    alternates: { canonical },
    openGraph: {
      title: "สินค้าทั้งหมด",
      description: "รวมพอตใช้แล้วทิ้งและพอดเปลี่ยนหัวทุกแบรนด์ พร้อมรายละเอียดสินค้าและสต็อกล่าสุด",
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

interface BrandOption {
  slug: string;
  name: string;
  name_th: string | null;
}

async function getBrandOptions(): Promise<BrandOption[]> {
  const supabase = getServerSupabase();

  const { data: brands, error } = await supabase
    .from("brands")
    .select("slug, name, name_th")
    .eq("is_active", true)
    .order("sort_order");

  if (error) {
    console.error("Failed to fetch brands:", error.message);
    return [];
  }

  return (brands || []).map((b: any) => ({
    slug: b.slug,
    name: b.name,
    name_th: b.name_th,
  }));
}

function matchesSearch(product: Awaited<ReturnType<typeof getAggregatedProducts>>[0], query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  // Product name
  if (matchText(product.name, trimmed)) return true;
  if (matchText(product.name_th, trimmed)) return true;

  // Brand name
  if (matchText(product.brand_name, trimmed)) return true;
  if (matchText(product.brand_name_th, trimmed)) return true;

  // Flavor names
  if (matchArray(product.flavor_names, trimmed)) return true;
  if (matchArray(product.flavor_names_th, trimmed)) return true;

  // Puff count
  if (matchPuffCount(product.puff_count, trimmed)) return true;

  return false;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const categoryParam = params.category || null;
  const brandParam = params.brand || null;
  const puffsParam = params.puffs || null;
  const stockParam = params.stock || null;
  const sortParam = params.sort || null;
  const searchParam = params.search || "";

  // Single query for products, separate query for brands
  const [allProducts, brandOptions] = await Promise.all([
    getAggregatedProducts(),
    getBrandOptions(),
  ]);

  // Extract puff counts from products
  const puffSet = new Set<number>();
  for (const p of allProducts) {
    if (p.puff_count) puffSet.add(p.puff_count);
  }
  const puffCounts = [...puffSet].sort((a, b) => a - b);

  // Filter - create a copy for sorting
  let filtered = allProducts;

  if (categoryParam) {
    filtered = filtered.filter((p) => p.category_slug === categoryParam);
  }
  if (brandParam) {
    filtered = filtered.filter((p) => p.brand_slug === brandParam);
  }
  if (puffsParam) {
    const puffNum = parseInt(puffsParam, 10);
    if (!isNaN(puffNum)) {
      filtered = filtered.filter((p) => p.puff_count === puffNum);
    }
  }
  if (stockParam === "in") {
    filtered = filtered.filter((p) => p.has_stock);
  }
  if (searchParam) {
    filtered = filtered.filter((p) => matchesSearch(p, searchParam));
  }

  // Sort - create a copy to avoid mutating source
  if (sortParam) {
    filtered = [...filtered];
    switch (sortParam) {
      case "price-asc":
        filtered.sort((a, b) => a.min_price - b.min_price);
        break;
      case "price-desc":
        filtered.sort((a, b) => b.min_price - a.min_price);
        break;
      case "puffs":
        filtered.sort((a, b) => (b.puff_count || 0) - (a.puff_count || 0));
        break;
      case "name-az":
        filtered.sort((a, b) =>
          (a.name || "").localeCompare(b.name || "", "en", { sensitivity: "base" })
        );
        break;
      default:
        break;
    }
  }

  return (
    <div className="pt-28 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 text-left">
          <div className="text-acid-lime text-xs font-mono tracking-widest uppercase mb-2">ALL PRODUCTS</div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-3">
            สินค้าทั้งหมด
          </h1>
          <p className="text-white/60 text-sm max-w-3xl leading-relaxed">
            รวมพอตใช้แล้วทิ้งและพอดเปลี่ยนหัวจากหลายแบรนด์ ค้นหาตามชื่อรุ่น แบรนด์ หรือจำนวนพัฟ
          </p>
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
          selectedBrand={brandParam}
          selectedPuffs={puffsParam}
          selectedStock={stockParam}
          selectedSort={sortParam}
          searchQuery={searchParam}
          brands={brandOptions}
          puffCounts={puffCounts}
        />

        <div className="mt-8">
          <p className="text-white/40 text-sm mb-4">{filtered.length} รุ่นสินค้า</p>
          <ProductGridServer products={filtered} />
        </div>
      </div>
    </div>
  );
}