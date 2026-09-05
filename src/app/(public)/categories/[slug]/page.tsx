import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase";
import { APP_URL, getCanonical, safeJsonLd } from "@/lib/seo";
import { getAggregatedProductsByCategory } from "@/lib/catalog-aggregate";
import ProductGridServer from "@/components/ProductGridServer";

interface CategoryData {
  slug: string;
  name: string;
  name_th: string | null;
  description: string | null;
  icon: string;
}

async function getCategoryBySlug(slug: string): Promise<CategoryData | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("categories")
    .select("slug, name, name_th, description, icon")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();
  if (error || !data) return null;
  return data;
}

export async function generateStaticParams() {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from("categories")
    .select("slug")
    .eq("is_active", true);
  return (data || []).map((c: any) => ({ slug: c.slug }));
}

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const category = await getCategoryBySlug(params.slug);
  if (!category) return { title: "ไม่พบหมวดหมู่" };

  const name = category.name_th || category.name;
  const title = `${name}`;
  const description = category.description || `รวมสินค้า${name} ทุกแบรนด์ ของแท้ 100% พร้อมส่ง`;
  const canonical = getCanonical(`/categories/${category.slug}`);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website", siteName: "Pod4U", locale: "th_TH" },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true },
  };
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const category = await getCategoryBySlug(params.slug);
  if (!category) notFound();

  const products = await getAggregatedProductsByCategory(category.slug);
  const displayName = category.name_th || category.name;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "หน้าแรก", item: APP_URL },
      { "@type": "ListItem", position: 2, name: "สินค้า", item: `${APP_URL}/products` },
      { "@type": "ListItem", position: 3, name: displayName, item: getCanonical(`/categories/${category.slug}`) },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />
      <div className="pt-28 pb-16 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-mono text-white/50 mb-6">
            <Link href="/" className="hover:text-acid-lime transition-colors">หน้าแรก</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-acid-lime transition-colors">สินค้า</Link>
            <span>/</span>
            <span className="text-acid-lime font-bold">{displayName}</span>
          </nav>

          <header className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{category.icon}</span>
              <h1 className="text-3xl sm:text-4xl font-black text-white">{displayName}</h1>
            </div>
            {category.description && (
              <p className="text-white/60 text-base max-w-2xl">{category.description}</p>
            )}
            <p className="text-white/40 text-sm mt-2">{products.length} รุ่นสินค้า</p>
          </header>

          <ProductGridServer products={products} emptyMessage="ยังไม่มีสินค้าในหมวดนี้" />
        </div>
      </div>
    </>
  );
}
