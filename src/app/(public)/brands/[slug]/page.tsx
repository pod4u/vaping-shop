import { Metadata } from "next";
import { notFound } from "next/navigation";
import { APP_URL, getCanonical } from "@/lib/seo";
import { getServerSupabase } from "@/lib/supabase";
import { getAggregatedProductsByBrand } from "@/lib/catalog-aggregate";
import ProductGridServer from "@/components/ProductGridServer";
import Link from "next/link";

interface BrandData {
  slug: string;
  name: string;
  name_th: string | null;
  description: string | null;
  color: string | null;
  banner_url: string | null;
}

async function getBrandBySlug(slug: string): Promise<BrandData | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("brands")
    .select("slug, name, name_th, description, color, banner_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();
  if (error || !data) return null;
  return data;
}

export async function generateStaticParams() {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from("brands")
    .select("slug")
    .eq("is_active", true);
  return (data || []).map((b: any) => ({ slug: b.slug }));
}

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const brand = await getBrandBySlug(params.slug);
  if (!brand) return { title: "ไม่พบแบรนด์" };

  const title = `${brand.name_th || brand.name}`;
  const description = brand.description || `รวมสินค้า${brand.name_th || brand.name} ทุก รุ่น ของแท้ 100%`;
  const canonical = getCanonical(`/brands/${brand.slug}`);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website", siteName: "Pod4U", locale: "th_TH" },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true },
  };
}

export default async function BrandPage({ params }: { params: { slug: string } }) {
  const brand = await getBrandBySlug(params.slug);
  if (!brand) notFound();

  const products = await getAggregatedProductsByBrand(brand.slug);
  const displayName = brand.name_th || brand.name;

  return (
    <div className="pt-28 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-mono text-white/50 mb-6">
          <Link href="/" className="hover:text-acid-lime transition-colors">หน้าแรก</Link>
          <span>/</span>
          <Link href="/brands" className="hover:text-acid-lime transition-colors">แบรนด์</Link>
          <span>/</span>
          <span className="text-acid-lime font-bold">{displayName}</span>
        </nav>

        {/* Brand Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            {brand.color && (
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: brand.color }} />
            )}
            <h1 className="text-3xl sm:text-4xl font-black text-white">{displayName}</h1>
          </div>
          {brand.description && (
            <p className="text-white/60 text-base max-w-2xl">{brand.description}</p>
          )}
          <p className="text-white/40 text-sm mt-2">{products.length} รุ่นสินค้า</p>
        </header>

        <ProductGridServer products={products} emptyMessage="ยังไม่มีสินค้าจากแบรนด์นี้" />
      </div>
    </div>
  );
}
