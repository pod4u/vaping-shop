import type { Metadata } from "next";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase";
import { getCanonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "แบรนด์ทั้งหมด",
  description: "รวมแบรนด์พอดทุกแบรนด์ ของแท้ 100% พร้อมส่งทั่วไทย",
  alternates: { canonical: getCanonical("/brands") },
  openGraph: { title: "แบรนด์ทั้งหมด", description: "รวมแบรนด์พอดทุกแบรนด์", url: getCanonical("/brands"), siteName: "Pod4U", locale: "th_TH" },
};

export const revalidate = 3600;

interface BrandRow {
  slug: string;
  name: string;
  name_th: string | null;
  description: string | null;
  color: string | null;
}

export default async function BrandsPage() {
  const supabase = getServerSupabase();
  const { data: brands } = await supabase
    .from("brands")
    .select("slug, name, name_th, description, color")
    .eq("is_active", true)
    .order("sort_order");

  const brandList: BrandRow[] = (brands || []).map((b: any) => ({
    slug: b.slug,
    name: b.name,
    name_th: b.name_th,
    description: b.description,
    color: b.color,
  }));

  return (
    <div className="pt-28 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-10">
          <div className="text-acid-lime text-xs font-mono tracking-widest uppercase mb-2">ALL BRANDS</div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">เลือกแบรนด์ที่คุณชอบ</h1>
          <p className="text-white/50 text-base">รวมแบรนด์พอดใช้แล้วทิ้งคุณภาพดี หลากหลายราคา หลากหลายระบบ</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brandList.map((brand) => (
            <Link
              key={brand.slug}
              href={`/brands/${brand.slug}`}
              className="group block"
            >
              <div className="navy-card rounded-2xl overflow-hidden h-full relative">
                {brand.color && (
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: brand.color }} />
                )}
                <div className="p-6">
                  <h2 className="text-xl font-black text-white group-hover:text-acid-lime transition-colors">
                    {brand.name}
                  </h2>
                  {brand.name_th && (
                    <p className="text-white/60 text-sm">{brand.name_th}</p>
                  )}
                  {brand.description && (
                    <p className="text-white/50 text-sm mt-3 line-clamp-2">{brand.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-acid-lime text-sm font-medium mt-4 group-hover:gap-3 transition-all">
                    <span>ดูรายละเอียด</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
