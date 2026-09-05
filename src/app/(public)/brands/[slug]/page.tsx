import { Metadata } from "next";
import { notFound } from "next/navigation";
import { APP_URL, getCanonical, safeJsonLd } from "@/lib/seo";
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

const marboFaqs = [
  {
    question: "MARBO, มาโบ และมาร์โบ คือแบรนด์เดียวกันหรือไม่?",
    answer: "เป็นชื่อที่ผู้ค้นใช้เรียกแบรนด์ MARBO ต่างรูปแบบกัน ส่วน M BAR หรือ mbar เป็นชื่อที่พบในสายผลิตภัณฑ์และชื่อรุ่นบางรายการ",
  },
  {
    question: "MARBO 9K กับ M BAR 10K ดูข้อมูลแยกกันได้ที่ไหน?",
    answer: "เปิดหน้าสินค้าของแต่ละรุ่นเพื่อดูรายละเอียด จำนวนพัฟที่ผู้ผลิตระบุ ตัวเลือกรสชาติ ราคา และสถานะสต็อกล่าสุด",
  },
  {
    question: "จำนวนรสชาติของแต่ละรุ่นอัปเดตอย่างไร?",
    answer: "เว็บไซต์แสดงเฉพาะตัวเลือกรสชาติที่เปิดใช้งานในระบบ จำนวนจึงเปลี่ยนได้ตามข้อมูลสินค้าและสต็อกล่าสุด",
  },
];

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const brand = await getBrandBySlug(params.slug);
  if (!brand) return { title: "ไม่พบแบรนด์" };

  const isMarboFamily = brand.slug === "marbo" || brand.slug === "mbar";
  const title = brand.slug === "marbo"
    ? "MARBO มาโบ มาร์โบ และ M BAR"
    : brand.slug === "mbar"
      ? "M BAR 10K (mbar / มาโบ 10K)"
      : `${brand.name_th || brand.name}`;
  const description = isMarboFamily
    ? `${title} รวมชื่อเรียก รุ่นสินค้า รสชาติที่เปิดใช้งาน และสถานะล่าสุด พร้อมเชื่อมข้อมูล MARBO 9K และ M BAR 10K`
    : brand.description || `รวมสินค้า${brand.name_th || brand.name} ทุกรุ่น พร้อมดูรายละเอียดและสถานะล่าสุด`;
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
  const isMarboFamily = brand.slug === "marbo" || brand.slug === "mbar";
  const heading = brand.slug === "marbo"
    ? "MARBO มาโบ มาร์โบ และ M BAR"
    : brand.slug === "mbar"
      ? "M BAR 10K (mbar / มาโบ 10K)"
      : displayName;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "หน้าแรก", item: APP_URL },
      { "@type": "ListItem", position: 2, name: "แบรนด์", item: `${APP_URL}/brands` },
      { "@type": "ListItem", position: 3, name: heading, item: getCanonical(`/brands/${brand.slug}`) },
    ],
  };

  const faqJsonLd = isMarboFamily
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: marboFaqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      }
    : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />
      )}
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
            <h1 className="text-3xl sm:text-4xl font-black text-white">{heading}</h1>
          </div>
          {brand.description && (
            <p className="text-white/60 text-base max-w-2xl">{brand.description}</p>
          )}
          <p className="text-white/40 text-sm mt-2">{products.length} รุ่นสินค้า</p>
        </header>

        <ProductGridServer products={products} emptyMessage="ยังไม่มีสินค้าจากแบรนด์นี้" />

        {isMarboFamily && (
          <section className="mt-16 grid gap-8 lg:grid-cols-[1.2fr_1fr]" aria-labelledby="marbo-guide">
            <div className="navy-card rounded-2xl border border-white/10 p-6 sm:p-8">
              <h2 id="marbo-guide" className="text-2xl font-black text-white mb-4">
                รู้จักชื่อ MARBO, มาโบ และ M BAR
              </h2>
              <p className="text-white/70 leading-relaxed mb-4">
                MARBO เป็นชื่อแบรนด์ที่ผู้ค้นชาวไทยอาจพิมพ์ว่า มาโบ หรือมาร์โบ ขณะที่ M BAR และ mbar มักใช้ในชื่อสายผลิตภัณฑ์ การรวมชื่อเรียกเหล่านี้ไว้ในบริบทเดียวกันช่วยให้ค้นหารุ่นที่ต้องการได้ง่ายขึ้นโดยไม่ทำให้เป็นคนละแบรนด์โดยไม่จำเป็น
              </p>
              <p className="text-white/70 leading-relaxed mb-6">
                รายการด้านบนดึงจากข้อมูลสินค้าที่เปิดใช้งานจริง เลือกหน้ารุ่นเพื่อดูจำนวนพัฟที่ผู้ผลิตระบุ รสชาติ ราคา และสถานะสต็อกล่าสุด
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/products/marbo-m-bar-9k" className="text-acid-lime font-semibold hover:underline">ข้อมูล MARBO M BAR 9K</Link>
                <Link href="/products/mbar-10k" className="text-acid-lime font-semibold hover:underline">ข้อมูล M BAR 10K</Link>
                <Link href="/blog/marbo-9k-vs-mbar-10k" className="text-acid-lime font-semibold hover:underline">เปรียบเทียบ 9K กับ 10K</Link>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-black text-white">คำถามที่พบบ่อย</h2>
              {marboFaqs.map((faq) => (
                <details key={faq.question} className="navy-card rounded-xl border border-white/10 p-5">
                  <summary className="cursor-pointer font-bold text-white">{faq.question}</summary>
                  <p className="mt-3 text-sm leading-relaxed text-white/70">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
    </>
  );
}
