import { Metadata } from "next";
import { notFound } from "next/navigation";
import { APP_URL, getCanonical, safeJsonLd } from "@/lib/seo";
import { getServerSupabase } from "@/lib/supabase";
import { getAggregatedProductsByBrand, type AggregatedProduct } from "@/lib/catalog-aggregate";
import ProductGridServer from "@/components/ProductGridServer";
import Link from "next/link";
import { bilingualPrimary, bilingualName, formatPuffs } from "@/lib/bilingual";

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

function getMarboFaqs(products: AggregatedProduct[]): FaqItem[] {
  const modelNames = products.map((product) => product.name).filter(Boolean);
  const modelsAnswer = modelNames.length
    ? `รุ่นที่เปิดใช้งานในแคตตาล็อกขณะนี้คือ ${modelNames.join(" และ ")} รายการอาจเปลี่ยนได้เมื่อมีการอัปเดตสินค้า`
    : "รุ่นที่เปิดใช้งานจะแสดงในหน้าแบรนด์นี้โดยอัตโนมัติเมื่อข้อมูลสินค้าอัปเดต";

  return [
    {
      question: "MARBO หรือ มาโบ คืออะไร?",
      answer: "MARBO คือชื่อแบรนด์ที่คนไทยมักเรียกว่า มาโบหรือมาร์โบ ควรดูชื่อรุ่นเต็มและจำนวนพัฟกำกับเพื่อเลือกรุ่นได้ถูกต้อง",
    },
    {
      question: "MARBO มีรุ่นอะไรบ้าง?",
      answer: modelsAnswer,
    },
    {
      question: "MARBO กับ M BAR ต่างกันอย่างไร?",
      answer: "เว็บไซต์แยก MARBO และ M BAR ตามชื่อแบรนด์และชื่อรุ่นในแคตตาล็อก เนื่องจากชื่อบางรุ่นมีคำว่า M BAR อยู่ด้วย จึงควรตรวจชื่อเต็ม เช่น MARBO M BAR 9K หรือ M BAR 10K ก่อนเลือกสินค้า",
    },
    {
      question: "จำนวนรสชาติ ราคา และสต็อกอัปเดตจากที่ไหน?",
      answer: "การ์ดสินค้าและหน้าสินค้าอ่านข้อมูลจากแคตตาล็อกปัจจุบัน จึงแสดงเฉพาะตัวเลือกที่เปิดใช้งาน พร้อมราคาและสถานะสต็อกล่าสุดในระบบ",
    },
  ];
}

const mbarFaqs: FaqItem[] = [
  {
    question: "M BAR หรือ mbar คืออะไร?",
    answer: "M BAR เป็นชื่อรุ่นสินค้าที่มักเขียนติดกันว่า mbar หรืออ่านว่า เอ็มบาร์ ควรดูจำนวนพัฟและชื่อรุ่นเต็มเพื่อไม่ให้สับสนกับสินค้า MARBO รุ่นอื่น",
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
  return "MARBO (มาโบ) รวมรุ่น รสชาติ และข้อมูลสินค้า";
}

function getMarboDescription(): string {
  return "รวมข้อมูลสินค้า MARBO หรือมาโบ ดูรุ่น MARBO M BAR 9K และ MARBO M SWITCH 15K พร้อมรสชาติ ราคา และสถานะสินค้าล่าสุด";
}

function formatPriceRange(product: AggregatedProduct): string {
  return product.min_price === product.max_price
    ? `฿${product.min_price.toLocaleString()}`
    : `฿${product.min_price.toLocaleString()}–฿${product.max_price.toLocaleString()}`;
}

function getMbarTitle(): string {
  return "M BAR 10K (เอ็มบาร์) รุ่น รสชาติ และข้อมูลสินค้า";
}

function getMbarDescription(): string {
  return "รวมข้อมูล M BAR 10K หรือเอ็มบาร์ ดูรสชาติ ราคา และสถานะสินค้า พร้อมข้อมูลชื่อรุ่นสำหรับคนที่พิมพ์ค้นหาว่า mbar";
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
  const marboModels = isMarbo
    ? products
        .filter((product) => ["marbo-m-bar-9k", "marbo-m-switch-15k"].includes(product.slug))
        .sort((a, b) => (a.puff_count ?? 0) - (b.puff_count ?? 0))
    : [];

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "หน้าแรก", item: APP_URL },
      { "@type": "ListItem", position: 2, name: "แบรนด์", item: `${APP_URL}/brands` },
      { "@type": "ListItem", position: 3, name: displayNameFull, item: getCanonical(`/brands/${brand.slug}`) },
    ],
  };

  const faqs: FaqItem[] = isMarbo ? getMarboFaqs(products) : (isMbar ? mbarFaqs : []);

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
              <h1 className="text-3xl sm:text-4xl font-black text-white">{isMarbo ? "MARBO (มาโบ)" : namePrimary}</h1>
            </div>
            {nameSecondary && !isMarbo && (
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

          {isMarbo && marboModels.length > 0 && (
            <section id="compare-marbo-models" className="mt-16 scroll-mt-28" aria-labelledby="compare-marbo-heading">
              <div className="mb-6 max-w-3xl">
                <p className="text-xs font-mono uppercase tracking-[0.2em] text-acid-lime">CHOOSE A MARBO MODEL</p>
                <h2 id="compare-marbo-heading" className="mt-2 text-2xl font-black text-white sm:text-3xl">MARBO 9K กับ 15K ต่างกันอย่างไร</h2>
                <p className="mt-3 leading-7 text-white/60">จุดต่างที่ควรดูคือชื่อรุ่น จำนวนพัฟที่ผู้ผลิตระบุ ตัวเลือกรส ราคา และสถานะพร้อมส่ง ข้อมูลด้านล่างอ่านจากแคตตาล็อกปัจจุบันโดยตรง</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {marboModels.map((product) => (
                  <article key={product.slug} className="navy-card rounded-2xl border border-white/10 p-5 sm:p-6">
                    <p className="text-xs font-mono text-acid-lime">{formatPuffs(product.puff_count) ? `${formatPuffs(product.puff_count)} PUFFS` : "MARBO"}</p>
                    <h3 className="mt-2 text-xl font-black text-white">{bilingualName(product.name, product.name_th)}</h3>
                    <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-white/[0.035] p-3"><dt className="text-white/40">รสในรายการ</dt><dd className="mt-1 font-bold text-white">{product.variant_count} รส</dd></div>
                      <div className="rounded-xl bg-white/[0.035] p-3"><dt className="text-white/40">ราคาเริ่มต้น</dt><dd className="mt-1 font-bold text-white">{formatPriceRange(product)}</dd></div>
                      <div className="col-span-2 rounded-xl bg-white/[0.035] p-3"><dt className="text-white/40">สถานะล่าสุด</dt><dd className={`mt-1 font-bold ${product.has_stock ? "text-emerald-300" : "text-white/60"}`}>{product.has_stock ? "มีตัวเลือกพร้อมส่ง" : "ยังไม่มีตัวเลือกพร้อมส่ง"}</dd></div>
                    </dl>
                    <Link href={`/products/${product.slug}`} className="mt-5 inline-flex text-sm font-bold text-acid-lime hover:underline">ดูรายละเอียด {product.name} →</Link>
                  </article>
                ))}
              </div>
              <p className="mt-4 text-xs leading-6 text-white/40">จำนวนพัฟเป็นค่าประมาณตามข้อมูลผู้ผลิต ส่วนจำนวนรส ราคา และสต็อกอาจเปลี่ยนตามการอัปเดตสินค้า</p>
            </section>
          )}

          {/* MARBO-specific content section */}
          {isMarbo && (
            <section className="mt-16 grid gap-8 lg:grid-cols-[1.2fr_1fr]" aria-labelledby="marbo-guide">
              <div className="navy-card rounded-2xl border border-white/10 p-6 sm:p-8">
                <h2 id="marbo-guide" className="text-2xl font-black text-white mb-4">
                  เกี่ยวกับ MARBO
                </h2>
                <p className="text-white/70 leading-relaxed mb-4">
                  MARBO คือชื่อแบรนด์ที่หลายคนเรียกว่า มาโบหรือมาร์โบ ส่วน M BAR เป็นชื่อที่ใช้กับสินค้าบางรุ่น การดูชื่อเต็มจะช่วยให้เลือกรุ่นและจำนวนพัฟได้ตรงกับที่ต้องการ
                </p>
                <p className="text-white/70 leading-relaxed mb-6">
                  เลือกรุ่นเพื่อดูรายละเอียดจำนวนพัฟที่ผู้ผลิตระบุ ตัวเลือกรสชาติที่เปิดใช้งาน ราคา และสถานะสต็อกล่าสุด
                </p>
                <nav aria-label="ข้อมูลสินค้าและคู่มือ MARBO" className="grid gap-3 sm:grid-cols-2">
                  <Link href="/products/marbo-m-bar-9k" className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-acid-lime hover:border-acid-lime/40 hover:bg-acid-lime/5">
                    ดูสินค้า MARBO M BAR 9K
                  </Link>
                  <Link href="/blog/marbo-9k-flavors" className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-acid-lime hover:border-acid-lime/40 hover:bg-acid-lime/5">
                    ดูรสชาติ MARBO 9K
                  </Link>
                  <Link href="/products/marbo-m-switch-15k" className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-acid-lime hover:border-acid-lime/40 hover:bg-acid-lime/5">
                    ดูสินค้า MARBO M SWITCH 15K
                  </Link>
                  <Link href="/brands/mbar" className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-acid-lime hover:border-acid-lime/40 hover:bg-acid-lime/5">
                    ดูสินค้า M BAR
                  </Link>
                  <Link href="/blog/marbo-9k-vs-mbar-10k" className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-acid-lime hover:border-acid-lime/40 hover:bg-acid-lime/5">
                    เปรียบเทียบ MARBO 9K กับ M BAR 10K
                  </Link>
                </nav>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black text-white">คำถามที่พบบ่อย</h2>
                {faqs.map((faq) => (
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
                  M BAR 10K เป็นชื่อเต็มของรุ่นที่หลายคนเขียนติดกันว่า mbar หรือเรียกว่า เอ็มบาร์ 10K การดูชื่อเต็มและจำนวนพัฟจะช่วยแยกรุ่นนี้ออกจากสินค้า MARBO รุ่นอื่นได้ง่ายขึ้น
                </p>
                <p className="text-white/70 leading-relaxed mb-6">
                  เลือกรุ่นเพื่อดูรายละเอียดจำนวนพัฟที่ผู้ผลิตระบุ ตัวเลือกรสชาติที่เปิดใช้งาน ราคา และสถานะสต็อกล่าสุด
                </p>
                <nav aria-label="ข้อมูลสินค้าและคู่มือ M BAR" className="grid gap-3 sm:grid-cols-2">
                  <Link href="/products/mbar-10k" className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-acid-lime hover:border-acid-lime/40 hover:bg-acid-lime/5">
                    ดูสินค้า M BAR 10K
                  </Link>
                  <Link href="/blog/mbar-10k-flavors" className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-acid-lime hover:border-acid-lime/40 hover:bg-acid-lime/5">
                    ดูรสชาติ M BAR 10K
                  </Link>
                  <Link href="/brands/marbo" className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-acid-lime hover:border-acid-lime/40 hover:bg-acid-lime/5">
                    ดูสินค้า MARBO
                  </Link>
                  <Link href="/blog/marbo-9k-vs-mbar-10k" className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-acid-lime hover:border-acid-lime/40 hover:bg-acid-lime/5">
                    เปรียบเทียบ MARBO 9K กับ M BAR 10K
                  </Link>
                </nav>
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
