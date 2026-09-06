import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase";
import { APP_URL, getCanonical, safeJsonLd } from "@/lib/seo";
import { getAggregatedProductsByCategory } from "@/lib/catalog-aggregate";
import ProductGridServer from "@/components/ProductGridServer";
import { bilingualNameThai, bilingualPrimaryThai } from "@/lib/bilingual";

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

const disposableFaqs = [
  {
    question: "พอตใช้ทิ้ง คือสินค้าแบบใด?",
    answer: "พอตใช้ทิ้ง หรือที่ค้นกันว่า พอตใช้แล้วทิ้ง พอดใช้แล้วทิ้ง และดูดทิ้ง เป็นอุปกรณ์ประเภท disposable pod ที่ออกแบบมาเป็นชุดพร้อมใช้งาน เมื่อเลือกสินค้าให้ดูชื่อรุ่น จำนวนพัฟโดยประมาณ และตัวเลือกรสชาติที่ยังเปิดใช้งานอยู่",
  },
  {
    question: "ตัวเลข 9K, 10K หรือ 20K หมายถึงอะไร?",
    answer: "ตัวเลขบนชื่อรุ่นเป็นค่าจำนวนพัฟที่ผู้ผลิตระบุโดยประมาณ การใช้งานจริงอาจแตกต่างตามความยาวและความถี่ในการใช้งาน",
  },
  {
    question: "จะตรวจรสชาติและสต็อกล่าสุดได้จากที่ไหน?",
    answer: "เปิดหน้าสินค้าของรุ่นที่สนใจเพื่อดูรสชาติที่เปิดใช้งาน ราคา และสถานะสต็อกล่าสุดของแต่ละตัวเลือก",
  },
];

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const category = await getCategoryBySlug(params.slug);
  if (!category) return { title: "ไม่พบหมวดหมู่" };

  const isDisposable = category.slug === "disposable-pod";
  const title = isDisposable
    ? "พอตใช้ทิ้ง - Disposable Pods"
    : `${category.name_th || category.name}`;
  const description = isDisposable
    ? "รวมพอตใช้แล้วทิ้งและพอดใช้แล้วทิ้งจากแบรนด์ยอดนิยม พร้อมเปรียบเทียบรุ่น 9K 10K 15K และ 20K จากสินค้าที่มีจริง"
    : category.description || `รวมสินค้า${category.name_th || category.name} ทุกแบรนด์ พร้อมดูรายละเอียดและสถานะล่าสุด`;
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
  const isDisposable = category.slug === "disposable-pod";

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "หน้าแรก", item: APP_URL },
      { "@type": "ListItem", position: 2, name: "สินค้า", item: `${APP_URL}/products` },
      { "@type": "ListItem", position: 3, name: bilingualNameThai(category.name_th, category.name), item: getCanonical(`/categories/${category.slug}`) },
    ],
  };

  const faqJsonLd = isDisposable
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: disposableFaqs.map((faq) => ({
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
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-mono text-white/50 mb-6">
            <Link href="/" className="hover:text-acid-lime transition-colors">หน้าแรก</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-acid-lime transition-colors">สินค้า</Link>
            <span>/</span>
            <span className="text-acid-lime font-bold">{bilingualNameThai(category.name_th, category.name)}</span>
          </nav>

          <header className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{category.icon}</span>
              <h1 className="text-3xl sm:text-4xl font-black text-white">
                {bilingualPrimaryThai(category.name_th, category.name).primary}
              </h1>
            </div>
            <p className="text-white/50 text-sm font-mono tracking-widest uppercase mb-3">
              {bilingualPrimaryThai(category.name_th, category.name).secondary || category.name}
            </p>
            {category.description && (
              <p className="text-white/60 text-base max-w-2xl">{category.description}</p>
            )}
            <p className="text-white/40 text-sm mt-2">{products.length} รุ่นสินค้า</p>
          </header>

          <ProductGridServer products={products} emptyMessage="ยังไม่มีสินค้าในหมวดนี้" />

          {isDisposable && (
            <section className="mt-16 grid gap-8 lg:grid-cols-[1.2fr_1fr]" aria-labelledby="disposable-guide">
              <div className="navy-card rounded-2xl border border-white/10 p-6 sm:p-8">
                <h2 id="disposable-guide" className="text-2xl font-black text-white mb-4">
                  พอตใช้ทิ้งคืออะไร?
                </h2>
                <p className="text-white/70 leading-relaxed mb-4">
                  พอตใช้ทิ้ง หรือที่ค้นกันว่า พอตใช้แล้วทิ้ง พอดใช้แล้วทิ้ง และดูดทิ้ง เป็นชื่อเรียกหมวด disposable pod ที่ออกแบบมาเป็นชุดพร้อมใช้งาน เมื่อเลือกสินค้าให้ดูชื่อรุ่น จำนวนพัฟโดยประมาณ และตัวเลือกรสชาติที่ยังเปิดใช้งานอยู่
                </p>
                <p className="text-white/70 leading-relaxed mb-6">
                  รุ่นในหมวดนี้มีตั้งแต่ 9K, 10K, 15K ไปจนถึง 20K ตามข้อมูลที่ผู้ผลิตระบุ ตัวเลขดังกล่าวไม่ใช่การรับประกันจำนวนครั้งใช้งานจริง เพราะขึ้นอยู่กับลักษณะการใช้งานของแต่ละคน
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/products?category=disposable-pod" className="text-acid-lime font-semibold hover:underline">ดูสินค้าพอตใช้ทิ้งทั้งหมด</Link>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black text-white">คำถามที่พบบ่อย</h2>
                {disposableFaqs.map((faq) => (
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
