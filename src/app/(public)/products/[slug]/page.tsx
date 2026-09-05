import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase";
import { APP_URL, getCanonical, safeJsonLd } from "@/lib/seo";
import { storeConfig, categories } from "@/lib/config";

interface ProductVariant {
  id: string;
  flavor_name: string;
  flavor_name_th: string | null;
  flavor_color: string;
  flavor_slug: string;
  price: number;
  sale_price: number | null;
  stock_quantity: number;
  is_available: boolean;
  image_url: string | null;
  nicotine_level: string | null;
}

interface ProductData {
  id: string;
  slug: string;
  name: string;
  name_th: string | null;
  description: string | null;
  puff_count: number | null;
  image_url: string | null;
  price: number;
  sale_price: number | null;
  brand: { id: string; slug: string; name: string; name_th: string | null; color: string };
  category: { id: string; slug: string; name: string; name_th: string | null; icon: string } | null;
  variants: ProductVariant[];
}

async function getProductBySlug(slug: string): Promise<ProductData | null> {
  const supabase = getServerSupabase();

  const { data: product, error } = await supabase
    .from("products")
    .select(
      `
      id, slug, name, name_th, description, puff_count, image_url, price, sale_price,
      brand:brands(id, slug, name, name_th, color),
      category:categories(id, slug, name, name_th, icon),
      variants:product_flavors(
        id, price, sale_price, stock_quantity, is_available, is_active, image_url, nicotine_level,
        flavor:flavors(id, slug, name, name_th, color, is_active)
      )
    `
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !product) return null;

  const variants: ProductVariant[] = (product.variants || [])
    .filter((v: any) => v.is_active && v.flavor?.is_active && v.flavor)
    .map((v: any) => ({
      id: v.id,
      flavor_name: v.flavor.name,
      flavor_name_th: v.flavor.name_th,
      flavor_color: v.flavor.color,
      flavor_slug: v.flavor.slug,
      price: Number(v.sale_price ?? v.price),
      sale_price: v.sale_price ? Number(v.price) : null,
      stock_quantity: v.stock_quantity || 0,
      is_available: v.is_available,
      image_url: v.image_url,
      nicotine_level: v.nicotine_level,
    }));

  const hasStock = variants.some((v) => v.is_available && v.stock_quantity > 0);
  const variantPrices = variants.map((v) => v.price);
  const minPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : 0;
  const maxPrice = variantPrices.length > 0 ? Math.max(...variantPrices) : 0;

  return {
    ...product,
    price: minPrice,
    sale_price: product.sale_price ? Number(product.price) : null,
    variants,
    brand: Array.isArray(product.brand) ? product.brand[0] : product.brand,
    category: Array.isArray(product.category) ? product.category[0] : product.category,
  } as ProductData;
}

export const revalidate = 3600; // Revalidate every hour for stock/price freshness

function getProductSeoName(product: ProductData) {
  if (product.slug === "marbo-m-bar-9k") return "MARBO M BAR 9K (มาโบ 9K / มาร์โบ 9K)";
  if (product.slug === "mbar-10k") return "M BAR 10K (mbar / มาโบ 10K)";
  return product.name_th || product.name;
}

function getProductFaqs(product: ProductData) {
  const seoName = getProductSeoName(product);
  const puffText = product.puff_count
    ? `${Number(product.puff_count).toLocaleString()} พัฟตามข้อมูลที่ผู้ผลิตระบุ โดยจำนวนใช้งานจริงอาจต่างกันตามลักษณะการใช้งาน`
    : "โปรดตรวจรายละเอียดของรุ่นและข้อมูลจากผู้ผลิตในหน้าสินค้า";

  return [
    {
      question: `${seoName} มีกี่พัฟ?`,
      answer: puffText,
    },
    {
      question: `${seoName} มีรสชาติอะไรบ้าง?`,
      answer: `หน้านี้แสดงรสชาติที่เปิดใช้งานในระบบล่าสุดจำนวน ${product.variants.length} ตัวเลือก รายการอาจเปลี่ยนได้เมื่อข้อมูลสินค้าหรือสต็อกอัปเดต`,
    },
    {
      question: `จะดูราคาและสถานะของ ${seoName} ได้อย่างไร?`,
      answer: "ตรวจราคาเริ่มต้นและสถานะพร้อมส่งจากข้อมูลบนหน้าสินค้านี้ แล้วเลือกรสชาติเพื่อดูตัวเลือกที่เปิดใช้งานล่าสุด",
    },
  ];
}

export async function generateStaticParams() {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from("products")
    .select("slug")
    .eq("is_active", true);
  return (data || []).map((p: any) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: "ไม่พบสินค้า" };

  const hasActiveVariants = product.variants.length > 0;
  const seoName = getProductSeoName(product);
  const title = `${seoName} - ${product.brand?.name || ""}`;
  const description = product.slug === "marbo-m-bar-9k"
    ? "ข้อมูล MARBO M BAR 9K หรือมาโบ 9K พอตใช้ทิ้ง 9,000 พัฟ พร้อมรสชาติ ราคา และสถานะสต็อกล่าสุด"
    : product.slug === "mbar-10k"
      ? "ข้อมูล M BAR 10K, mbar หรือมาโบ 10K พอตใช้ทิ้ง 10,000 พัฟ พร้อมรสชาติ ราคา และสถานะสต็อกล่าสุด"
      : product.description || `${product.brand?.name || ""} ${product.name_th || product.name} พร้อมรายละเอียดและสถานะล่าสุด`;
  const canonical = getCanonical(`/products/${product.slug}`);
  const imageUrl = product.image_url || `${APP_URL}/images/og-default.svg`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: [{ url: imageUrl, width: 1200, height: 630 }],
      siteName: "Pod4U",
      locale: "th_TH",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    robots: hasActiveVariants
      ? { index: true, follow: true }
      : { index: false, follow: true },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  // Handle legacy UUID URLs — redirect to canonical slug
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(params.slug)) {
    const supabase = getServerSupabase();
    const { data } = await supabase
      .from("product_flavors")
      .select("product:products(slug)")
      .eq("id", params.slug)
      .single();
    const product = Array.isArray(data?.product) ? data?.product[0] : data?.product;
    if (product?.slug) {
      permanentRedirect(`/products/${product.slug}`);
    }
    notFound();
  }

  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  const category = categories.find((c) => c.id === product.category?.slug) || null;
  const displayName = product.name_th || product.name;
  const seoName = getProductSeoName(product);
  const brandName = product.brand?.name_th || product.brand?.name || "";
  const productFaqs = getProductFaqs(product);
  const isMarboTarget = product.slug === "marbo-m-bar-9k" || product.slug === "mbar-10k";

  // JSON-LD Product Schema
  const variantPrices = product.variants.map((v) => v.price);
  const hasActiveVariants = variantPrices.length > 0;
  const productJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: displayName,
    description: product.description || displayName,
    brand: { "@type": "Brand", name: brandName },
  };
  if (hasActiveVariants) {
    productJsonLd.offers = {
      "@type": "AggregateOffer",
      priceCurrency: "THB",
      lowPrice: Math.min(...variantPrices),
      highPrice: Math.max(...variantPrices),
      availability: product.variants.some((v) => v.is_available && v.stock_quantity > 0)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    };
  }
  productJsonLd.url = getCanonical(`/products/${product.slug}`);
  productJsonLd.image = product.image_url || undefined;

  // JSON-LD BreadcrumbList
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "หน้าแรก", item: APP_URL },
      { "@type": "ListItem", position: 2, name: "สินค้า", item: `${APP_URL}/products` },
      ...(product.category
        ? [{ "@type": "ListItem", position: 3, name: product.category.name_th || product.category.name, item: `${APP_URL}/categories/${product.category.slug}` }]
        : []),
      { "@type": "ListItem", position: product.category ? 4 : 3, name: displayName, item: getCanonical(`/products/${product.slug}`) },
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: productFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
      />

      <div className="pt-28 pb-16 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-mono text-white/50 mb-8">
            <Link href="/" className="hover:text-acid-lime transition-colors">หน้าแรก</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-acid-lime transition-colors">สินค้า</Link>
            {product.category && (
              <>
                <span>/</span>
                <Link href={`/categories/${product.category.slug}`} className="hover:text-acid-lime transition-colors">
                  {product.category.name_th || product.category.name}
                </Link>
              </>
            )}
            <span>/</span>
            <span className="text-acid-lime font-bold">{displayName}</span>
          </nav>

          {/* Product Main */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 mb-20">
            {/* Image */}
            <div>
              <div className="relative aspect-square vapor-card rounded-3xl overflow-hidden border border-brand-border bg-brand-void/80 flex items-center justify-center">
                <img
                  src={product.image_url || "https://placehold.co/600x600/120d20/5b13ec?text=Pod4U"}
                  alt={`${displayName} ${brandName}`}
                  className="w-full h-full object-cover"
                  width={600}
                  height={600}
                />
                {product.sale_price && (
                  <div className="absolute top-6 left-6 bg-acid-lime text-black text-xs font-black px-3.5 py-1.5 rounded-lg shadow-acid uppercase tracking-wider">
                    ลด {Math.round((1 - product.price / product.sale_price) * 100)}%
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex flex-col justify-center">
              {category && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-brand-surface border border-brand-border w-fit mb-4">
                  <span>{category.icon}</span>
                  <span className="text-acid-lime text-xs font-mono font-bold uppercase">{category.nameTh}</span>
                </div>
              )}

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-2 tracking-tight leading-tight">
                {seoName}
              </h1>
              <p className="text-white/50 text-sm mb-4">{brandName}</p>

              {product.description && (
                <p className="text-white/70 text-base mb-6 leading-relaxed">{product.description}</p>
              )}

              {/* Specs */}
              <div className="flex flex-wrap gap-2 mb-6">
                {product.puff_count && (
                  <span className="px-3 py-1.5 rounded-lg bg-brand-surface border border-brand-border text-white/80 text-xs">
                    {Number(product.puff_count).toLocaleString()} Puffs
                  </span>
                )}
                <span className="px-3 py-1.5 rounded-lg bg-brand-surface border border-brand-border text-white/80 text-xs">
                  {product.variants.length} รสชาติ
                </span>
              </div>

              {/* Price */}
              {product.variants.length > 0 ? (
                <div className="vapor-card rounded-2xl p-5 mb-8 border-brand-border">
                  <div className="text-xs text-white/40 font-mono mb-1">ราคาเริ่มต้น</div>
                  <div className="flex items-baseline gap-4">
                    <span className="text-4xl sm:text-5xl font-black text-acid-lime tracking-tight">
                      ฿{product.price.toLocaleString()}
                    </span>
                    {product.sale_price && (
                      <span className="text-xl text-white/30 line-through font-mono">
                        ฿{Number(product.sale_price).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="vapor-card rounded-2xl p-5 mb-8 border-brand-border text-center">
                  <div className="text-white/50 text-sm font-medium">สินค้าหมด — ไม่มีรสชาติพร้อมส่ง</div>
                </div>
              )}

              {/* Flavors */}
              <div className="mb-8">
                <h2 className="text-white font-bold text-sm uppercase font-mono tracking-wider mb-3">
                  รสชาติที่มี ({product.variants.length})
                </h2>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-2">
                  {product.variants.map((variant) => (
                    <div
                      key={variant.id}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-brand-surface/50 border border-brand-border/50 text-xs"
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: variant.flavor_color }}
                      />
                      <span className="text-white/80">{variant.flavor_name_th || variant.flavor_name}</span>
                      {variant.is_available && variant.stock_quantity > 0 && (
                        <span className="text-acid-lime text-[10px] font-mono">({variant.stock_quantity})</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Stock Status */}
              <div className="mb-8">
                {product.variants.some((v) => v.is_available && v.stock_quantity > 0) ? (
                  <div className="inline-flex items-center gap-2 text-xs font-mono text-acid-lime">
                    <span className="w-2 h-2 rounded-full bg-acid-lime animate-pulse" />
                    มีสินค้าพร้อมส่ง
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 text-xs font-mono text-red-400">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    สินค้าหมดชั่วคราว
                  </div>
                )}
              </div>

              {/* CTA */}
              <a
                href={storeConfig.lineLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-acid px-8 py-4 rounded-full text-base font-extrabold flex items-center justify-center gap-3 tracking-wide shadow-acid w-fit"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 5.58 2 10c0 2.12.92 4.04 2.42 5.44L3 22l6.4-3.2c.84.13 1.71.2 2.6.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
                </svg>
                สั่งซื้อผ่าน LINE
              </a>
            </div>
          </div>

          <section className="grid gap-8 lg:grid-cols-[1.2fr_1fr]" aria-labelledby="product-guide">
            <div className="navy-card rounded-2xl border border-white/10 p-6 sm:p-8">
              <h2 id="product-guide" className="text-2xl font-black text-white mb-4">
                ข้อมูล {seoName}
              </h2>
              <p className="text-white/70 leading-relaxed mb-4">
                {product.description || `${displayName} เป็นหนึ่งในสินค้าที่เปิดใช้งานอยู่ในแคตตาล็อก Pod4U`}
              </p>
              <p className="text-white/70 leading-relaxed mb-6">
                รุ่นนี้ระบุจำนวนพัฟโดยประมาณ {product.puff_count ? Number(product.puff_count).toLocaleString() : "ตามข้อมูลผู้ผลิต"} พัฟ และมีรสชาติที่เปิดใช้งานในระบบขณะนี้ {product.variants.length} ตัวเลือก จำนวนพัฟและระยะเวลาใช้งานจริงอาจต่างกันตามรูปแบบการใช้งาน
              </p>
              <div className="flex flex-wrap gap-3">
                {isMarboTarget && (
                  <>
                    <Link href="/brands/marbo" className="text-acid-lime font-semibold hover:underline">รวมข้อมูล MARBO และมาโบ</Link>
                    <Link href="/blog/marbo-9k-vs-mbar-10k" className="text-acid-lime font-semibold hover:underline">เปรียบเทียบ MARBO 9K กับ M BAR 10K</Link>
                  </>
                )}
                <Link href="/categories/disposable-pod" className="text-acid-lime font-semibold hover:underline">ดูหมวดพอตใช้ทิ้ง</Link>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-black text-white">คำถามที่พบบ่อย</h2>
              {productFaqs.map((faq) => (
                <details key={faq.question} className="navy-card rounded-xl border border-white/10 p-5">
                  <summary className="cursor-pointer font-bold text-white">{faq.question}</summary>
                  <p className="mt-3 text-sm leading-relaxed text-white/70">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
