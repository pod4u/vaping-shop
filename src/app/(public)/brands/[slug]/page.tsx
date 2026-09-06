import { Metadata } from "next";
import { notFound } from "next/navigation";
import { APP_URL, getCanonical, safeJsonLd } from "@/lib/seo";
import { getServerSupabase } from "@/lib/supabase";
import { getAggregatedProductsByBrand } from "@/lib/catalog-aggregate";
import ProductGridServer from "@/components/ProductGridServer";
import Link from "next/link";
import { bilingualPrimary, bilingualName } from "@/lib/bilingual";

interface BrandData {
  slug: string;
  name: string;
  name_th: string | null;
  description: string | null;
  color: string | null;
  banner_url: string | null;
}

interface FaqItem {
  question: string;
  answer: string;
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

function isMarboOrMbar(slug: string): boolean {
  return slug === "marbo" || slug === "mbar";
}

const marboFaqs: FaqItem[] = [
  {
    question: "MARBO หรือ มาโบ คืออะไร?",
    answer: "ผู้ค้นอาจใช้คำว่า MARBO, มาโบ หรือ มาร์โบ เพื่อค้นหารุ่นที่เกี่ยวข้องบน Pod4U ควรตรวจชื่อรุ่นเต็มบนหน้าสินค้าก่อนเลือกสินค้า",
  },
  {
    question: "MARBO M BAR 9K มีกี่พัฟ?",
    answer: "MARBO M BAR 9K ระบุจำนวนพัฟประมาณ 9,000 พัฟตามข้อมูลผู้ผลิต การใช้งานจริงต่างกันตามลักษณะการใช้งาน สามารถดูรายละเอียดเพิ่มเติมได้จากหน้าสินค้า",
  },
  {
    question: "จำนวนรสชาติอัปเดตจากที่ไหน?",
    answer: "หน้าสินค้าแต่ละรุ่นแสดงเฉพาะตัวเลือกรสชาติที่เปิดใช้งานในระบบ จำนวนจึงเปลี่ยนได้ตามข้อมูลสินค้าและสต็อกล่าสุด",
  },
];

const mbarFaqs: FaqItem[] = [
  {
    question: "M BAR หรือ mbar คืออะไร?",
    answer: "ผู้ค้นอาจใช้คำว่า M BAR, mbar หรือ เอ็มบาร์ เพื่อค้นหารุ่นที่เกี่ยวข้องบน Pod4U ควรตรวจชื่อรุ่นเต็มบนหน้าสินค้าก่อนเลือกสินค้า",
  },
  {
    question: "M BAR 10K มีกี่พัฟ?",
    answer: "M BAR 10K ระบุจำนวนพัฟประมาณ 10,000 พัฟตามข้อมูลผู้ผลิต การใช้งานจริงต่างกันตามลักษณะการใช้งาน สามารถดูรายละเอียดเพิ่มเติมได้จากหน้าสินค้า",
  },
  {
    question: "ทำไมบางคนค้นหาว่า มาโบ 10K?",
    answer: "คำว่า มาโบ 10K เป็นคำค้นที่ผู้ใช้บางคนใช้ ชื่อรุ่นที่เว็บไซต์ใช้คือ M BAR 10K ควรตรวจชื่อรุ่นเต็มบนหน้าสินค้าก่อนเลือกสินค้า",
  },
];

function getMarboTitle(): string {
  return "MARBO (มาโบ/มาร์โบ) และ M BAR";
}

function getMarboDescription(): string {
  return "รวมสินค้า MARBO หรือที่ค้นกันว่า มาโบและมาร์โบ พร้อมข้อมูลรุ่น MARBO M BAR 9K และ M BAR 10K รสชาติ ราคา และสถานะล่าสุด";
}

function getMbarTitle(): string {
  return "M BAR (mbar/เอ็มบาร์) และรุ่น 10K";
}

function getMbarDescription(): string {
  return "รวมสินค้า M BAR หรือ mbar พร้อมข้อมูล M BAR 10K ที่ผู้ค้นอาจเรียกว่า มาโบ 10K ดูรสชาติ ราคา และสถานะล่าสุด";
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const brand = await getBrandBySlug(params.slug);
  if (!brand) return { title: "ไม่พบแบรนด์" };

  const displayName = bilingualName(brand.name, brand.name_th);

  let title: string;
  let description: string;

  if (brand.slug === "marbo") {
    title = getMarboTitle();
    description = getMarboDescription();
  } else if (brand.slug === "mbar") {
    title = getMbarTitle();
    description = getMbarDescription();
  } else {
    title = `${displayName}`;
    description = brand.description || `รวมสินค้า${displayName} ทุกรุ่น พร้อมดูรายละเอียดและสถานะล่าสุด`;
  }

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
  const { primary: namePrimary, secondary: nameSecondary } = bilingualPrimary(brand.name, brand.name_th);
  const displayNameFull = bilingualName(brand.name, brand.name_th);
  const isMarboOrMbarBrand = isMarboOrMbar(brand.slug);
  const isMarbo = brand.slug === "marbo";
  const isMbar = brand.slug === "mbar";

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "หน้าแรก", item: APP_URL },
      { "@type": "ListItem", position: 2, name: "แบรนด์", item: `${APP_URL}/brands` },
      { "@type": "ListItem", position: 3, name: displayNameFull, item: getCanonical(`/brands/${brand.slug}`) },
    ],
  };

  const faqs: FaqItem[] = isMarbo ? marboFaqs : (isMbar ? mbarFaqs : []);

  const faqJsonLd = faqs.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
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
            <span className="text-acid-lime font-bold">{namePrimary}</span>
          </nav>

          {/* Brand Header */}
          <header className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              {brand.color && (
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: brand.color }} />
              )}
              <h1 className="text-3xl sm:text-4xl font-black text-white">{namePrimary}</h1>
            </div>
            {nameSecondary && (
              <p className="text-white/60 text-lg mb-2">{nameSecondary}</p>
            )}
            {isMarbo && (
              <p className="text-white/60 text-base max-w-2xl">
                {getMarboDescription()}
              </p>
            )}
            {isMbar && (
              <p className="text-white/60 text-base max-w-2xl">
                {getMbarDescription()}
              </p>
            )}
            {!isMarboOrMbarBrand && brand.description && (
              <p className="text-white/60 text-base max-w-2xl">{brand.description}</p>
            )}
            <p className="text-white/40 text-sm mt-2">{products.length} รุ่นสินค้า</p>
          </header>

          <ProductGridServer products={products} emptyMessage="ยังไม่มีสินค้าจากแบรนด์นี้" />

          {/* MARBO-specific content section */}
          {isMarbo && (
            <section className="mt-16 grid gap-8 lg:grid-cols-[1.2fr_1fr]" aria-labelledby="marbo-guide">
              <div className="navy-card rounded-2xl border border-white/10 p-6 sm:p-8">
                <h2 id="marbo-guide" className="text-2xl font-black text-white mb-4">
                  เกี่ยวกับ MARBO
                </h2>
                <p className="text-white/70 leading-relaxed mb-4">
                  ผู้ค้นอาจใช้คำว่า MARBO, มาโบ, มาร์โบ, M BAR หรือ mbar เพื่อค้นหารุ่นที่เกี่ยวข้องบน Pod4U ควรตรวจชื่อรุ่นเต็มบนหน้าสินค้าก่อนเลือกสินค้า
                </p>
                <p className="text-white/70 leading-relaxed mb-6">
                  เลือกรุ่นเพื่อดูรายละเอียดจำนวนพัฟที่ผู้ผลิตระบุ ตัวเลือกรสชาติที่เปิดใช้งาน ราคา และสถานะสต็อกล่าสุด
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/products/marbo-m-bar-9k" className="text-acid-lime font-semibold hover:underline">
                    MARBO M BAR 9K
                  </Link>
                  <span className="text-white/20">|</span>
                  <Link href="/products/mbar-10k" className="text-acid-lime font-semibold hover:underline">
                    M BAR 10K
                  </Link>
                  <span className="text-white/20">|</span>
                  <Link href="/brands/mbar" className="text-acid-lime font-semibold hover:underline">
                    M BAR
                  </Link>
                  <span className="text-white/20">|</span>
                  <Link href="/blog/marbo-9k-vs-mbar-10k" className="text-acid-lime font-semibold hover:underline">
                    เปรียบเทียบ MARBO 9K กับ M BAR 10K
                  </Link>
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

          {/* M BAR-specific content section */}
          {isMbar && (
            <section className="mt-16 grid gap-8 lg:grid-cols-[1.2fr_1fr]" aria-labelledby="mbar-guide">
              <div className="navy-card rounded-2xl border border-white/10 p-6 sm:p-8">
                <h2 id="mbar-guide" className="text-2xl font-black text-white mb-4">
                  เกี่ยวกับ M BAR
                </h2>
                <p className="text-white/70 leading-relaxed mb-4">
                  ผู้ค้นอาจใช้คำว่า M BAR, mbar, เอ็มบาร์ หรือมาโบ 10K เพื่อค้นหารุ่นที่เกี่ยวข้องบน Pod4U ชื่อรุ่นที่เว็บไซต์ใช้คือ M BAR 10K
                </p>
                <p className="text-white/70 leading-relaxed mb-6">
                  เลือกรุ่นเพื่อดูรายละเอียดจำนวนพัฟที่ผู้ผลิตระบุ ตัวเลือกรสชาติที่เปิดใช้งาน ราคา และสถานะสต็อกล่าสุด
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/products/mbar-10k" className="text-acid-lime font-semibold hover:underline">
                    M BAR 10K
                  </Link>
                  <span className="text-white/20">|</span>
                  <Link href="/products/marbo-m-bar-9k" className="text-acid-lime font-semibold hover:underline">
                    MARBO M BAR 9K
                  </Link>
                  <span className="text-white/20">|</span>
                  <Link href="/brands/marbo" className="text-acid-lime font-semibold hover:underline">
                    MARBO
                  </Link>
                  <span className="text-white/20">|</span>
                  <Link href="/blog/marbo-9k-vs-mbar-10k" className="text-acid-lime font-semibold hover:underline">
                    เปรียบเทียบ MARBO 9K กับ M BAR 10K
                  </Link>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black text-white">คำถามที่พบบ่อย</h2>
                {mbarFaqs.map((faq) => (
                  <details key={faq.question} className="navy-card rounded-xl border border-white/10 p-5">
                    <summary className="cursor-pointer font-bold text-white">{faq.question}</summary>
                    <p className="mt-3 text-sm leading-relaxed text-white/70">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* Non-MARBO/M BAR: simple about section without FAQ */}
          {!isMarboOrMbarBrand && (
            <section className="mt-16">
              <div className="navy-card rounded-2xl border border-white/10 p-6 sm:p-8">
                <h2 id="brand-guide" className="text-2xl font-black text-white mb-4">
                  เกี่ยวกับ {displayNameFull}
                </h2>
                <p className="text-white/70 leading-relaxed mb-6">
                  {brand.description || `${displayNameFull} เป็นแบรนด์ที่มีสินค้าเปิดใช้งานอยู่ในแคตตาล็อก Pod4U เลือกรุ่นเพื่อดูรายละเอียดจำนวนพัฟ รสชาติ ราคา และสถานะสต็อกล่าสุด`}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href={`/products?brand=${brand.slug}`} className="text-acid-lime font-semibold hover:underline">
                    ดูสินค้า {namePrimary} ทั้งหมด
                  </Link>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}