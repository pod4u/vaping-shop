# SEO Foundation — สรุปการทำงาน

> วันที่: 2026-09-06
> สถานะ: ✅ Build 43/43 — ผ่าน Critical Bug Fix — พร้อม Deploy

---

## 1. ไฟล์ที่เพิ่มและแก้

### เพิ่มใหม่ (14 ไฟล์)
| ไฟล์ | วัตถุประสงค์ |
|------|-------------|
| `src/lib/seo.ts` | SEO helper — APP_URL, title template, canonical, **safeJsonLd()** |
| `src/lib/catalog-aggregate.ts` | **Shared aggregate helper** — 1 entry/product slug, ใช้ร่วมกันทุกหน้า |
| `src/components/ProductGridServer.tsx` | **Server-rendered product grid** — ใช้ร่วมกัน /products, Category, Brand |
| `src/app/sitemap.ts` | Dynamic sitemap — products, categories, brands (Supabase), blog (revalidate 1 ชม.) |
| `src/app/robots.ts` | Robots.txt — allow สาธารณะ, disallow admin/api/register |
| `src/app/(public)/products/[slug]/page.tsx` | Server-rendered product page + Product/Breadcrumb JSON-LD + UUID redirect |
| `src/app/(public)/categories/[slug]/page.tsx` | Category landing (aggregate per product) + Breadcrumb JSON-LD |
| `src/app/(public)/brands/[slug]/page.tsx` | Brand page — **Supabase source of truth** + aggregate products |
| `src/app/(public)/products/ProductFilterClient.tsx` | Client filter UI (search + category pills) — แยกจาก grid |
| `src/app/(public)/blog/page.tsx` | Blog listing page |
| `src/app/(public)/blog/[slug]/page.tsx` | Blog post page + BlogPosting JSON-LD |
| `public/images/placeholder.svg` | Fallback image (400×400) |
| `public/images/og-default.svg` | Default OG image (1200×630) |
| `public/grid.svg` | Grid background pattern |

### ลบออก (4 ไฟล์)
| ไฟล์ | เหตุผล |
|------|--------|
| `src/app/(public)/products/[id]/` | Conflict กับ [slug] — UUID redirect ย้ายไป [slug] |
| `src/app/(public)/products/ProductsClient.tsx` | แทนที่ด้วย server-rendered page + ProductFilterClient |
| `src/app/(public)/brands/[slug]/BrandPage.tsx` | แทนที่ด้วย inline server component |
| `src/app/(public)/brand/[slug]/BrandPage.tsx` | Legacy — ไม่ถูก import แล้ว |

### แก้ไข (25+ ไฟล์)

#### Pages & Layouts
| ไฟล์ | การเปลี่ยนแปลง |
|------|---------------|
| `src/app/layout.tsx` | metadata ครบ + Organization JSON-LD (safeJsonLd) |
| `src/app/(public)/products/page.tsx` | **Server Component** — fetch aggregate → render grid ใน HTML |
| `src/app/(public)/stock/page.tsx` | Server wrapper + metadata |
| `src/app/(public)/register/page.tsx` | Server wrapper + noindex metadata |
| `src/app/(public)/brands/page.tsx` | **Server Component** — Supabase brands |
| `src/app/(public)/brand/[slug]/page.tsx` | permanentRedirect → `/brands/[slug]` |

#### Components — Internal Links (14 fixes)
| ไฟล์ | การเปลี่ยนแปลง |
|------|---------------|
| `HeaderNavy.tsx`, `Header.tsx` | Category → `/categories/[slug]` |
| `Footer.tsx`, `FooterNavy.tsx` | Category → `/categories/[slug]` |
| `ProductCard.tsx`, `ProductCardNavy.tsx`, `ProductCardHybrid.tsx` | slug link, fallback → `/products` |
| `BestSellersNavy.tsx` | fallback → `/products` |
| `Categories.tsx`, `CategoriesNavy.tsx`, `CategoriesHybrid.tsx` | → `/categories/[slug]` |
| `ReadyToShipProducts*.tsx` (3 ไฟล์) | brand → `/brands/`, placeholder → `.svg` |

#### Data & Types
| ไฟล์ | การเปลี่ยนแปลง |
|------|---------------|
| `src/lib/catalog.ts` | เพิ่ม slug, brandSlug |
| `src/app/api/stock/route.ts` | เพิ่ม product slug |
| `src/types/product.ts` | เพิ่ม slug?, brandSlug? |
| `src/types/blog.ts` | เพิ่ม content? |
| `src/data/blog.ts` | เพิ่มเนื้อหาบทความเต็ม 3 บทความ |

#### Config
| ไฟล์ | การเปลี่ยนแปลง |
|------|---------------|
| `next.config.js` | เพิ่ม Supabase image domain |
| `.env.local` | เพิ่ม `NEXT_PUBLIC_APP_URL` |

---

## 2. URL Structure — ก่อนและหลัง

| ก่อน | หลัง | หมายเหตุ |
|------|------|---------|
| `/products/{uuid}` | `/products/{product-slug}` | Semantic URL + UUID → slug 308 redirect |
| `/products?category=x` | `/categories/{slug}` | Landing page + server-rendered |
| `/brand/{slug}` | `/brands/{slug}` | 308 redirect |
| — | `/blog`, `/blog/{slug}` | Blog system |
| — | `/sitemap.xml`, `/robots.txt` | Auto-generated |

---

## 3. Redirect

| จาก | ไป | ประเภท |
|-----|-----|--------|
| `/brand/{slug}` | `/brands/{slug}` | 308 |
| `/products/{uuid}` | `/products/{slug}` | 308 (Supabase lookup) |

---

## 4. Metadata / Schema

| หน้า | Title | OG | Twitter | Canonical | JSON-LD |
|------|-------|----|---------|-----------|---------|
| Home | ✅ | ✅ | ✅ | ✅ | Organization/Store |
| Products | ✅ | ✅ | — | ✅ | — |
| Product [slug] | ✅ | ✅ | ✅ | ✅ | Product + BreadcrumbList |
| Category [slug] | ✅ | ✅ | ✅ | ✅ | BreadcrumbList |
| Brands | ✅ | ✅ | — | ✅ | — |
| Brand [slug] | ✅ | ✅ | ✅ | ✅ | — |
| Blog | ✅ | ✅ | — | ✅ | — |
| Blog [slug] | ✅ | ✅ | ✅ | ✅ | BlogPosting |
| Stock | ✅ | ✅ | — | ✅ | — |
| Register | ✅ | — | — | ✅ | noindex |

### Title Template
- Root: `%s | Pod4U` — child ส่งเฉพาะชื่อหน้า
- **ไม่มี** title ซ้ำ `| Pod4U | Pod4U`

### JSON-LD — safeJsonLd()
- ทุก JSON-LD ใช้ `safeJsonLd()` — escape `<` → `\u003c` ป้องกัน XSS

---

## 5. Pre-Deploy Fix Round (12 ข้อ) — ผล

| # | ข้อ | ผล |
|---|-----|-----|
| 1 | Sitemap | ✅ ไม่มี /register, มี blog, ไม่มี noindex/disallow/404 |
| 2 | /products Server Render | ✅ HTML มี product cards ตั้งแต่แรก |
| 3 | Title ไม่ซ้ำ | ✅ ทุกหน้าใช้ template เดียว |
| 4 | Internal Links | ✅ ไม่มี UUID, ไม่มี `/products?category=` |
| 5 | Brand Architecture | ✅ Supabase source of truth |
| 6 | Category Aggregate | ✅ 1 card/1 product slug |
| 7 | Fallback Assets | ✅ placeholder.svg, og-default.svg, grid.svg = 200 |
| 8 | UUID Redirect | ✅ ตรวจจับ → lookup → 308 |
| 9 | safeJsonLd | ✅ ทุก JSON-LD |
| 10 | Revalidation | ✅ 3600s (product/category/sitemap) |
| 11 | Deployment Checklist | ✅ ในเอกสารนี้ |
| 12 | Build + Verify | ✅ 44/44, exit 0 |

---

## 6. Pre-Deploy Fixes (6 ข้อ) — ผล

| # | Fix | ผล |
|---|-----|-----|
| 1 | กรอง `product_flavors.is_active=true` ใน [slug] | ✅ `filter(v => v.flavor && v.is_active)` |
| 2 | Guard no active variants — ห้าม Infinity | ✅ `variantPrices.length > 0 ? Math.min(...) : 0` + JSON-LD omit AggregateOffer |
| 3 | `/products?category=x` → noindex, follow | ✅ `<meta name="robots" content="noindex, follow">` + canonical `/products` |
| 4 | ลบ BrandPage legacy | ✅ `brand/[slug]/BrandPage.tsx` ถูกลบ |
| 5 | Build + verify | ✅ 43/43 pages, exit 0 |
| 6 | รายงานตรงผลจริง | ✅ 25 sitemap URLs, 7 brands, 8 products |

### Verification Results
```
BAILOUT:              0
Product cards HTML:   8 slugs
UUID links:           0
Infinity in HTML:     0
Sitemap URLs:         25
Sitemap brands:       7 (Supabase)
Sitemap register:     0
noindex (query URL):  ✅ <meta name="robots" content="noindex, follow">
canonical (query):    ✅ https://www.pod4u.store/products
```

---

## 7. Critical Bug Fix — product_flavors `is_active`

### ปัญหา
- Query `product_flavors` ไม่ได้ select ฟิลด์ `is_active` แต่ filter ใช้ `v.is_active` → filter ไม่ทำงาน
- Flavor `is_active` ไม่ได้เช็ค — service-role bypass RLS อาจดึง flavor ที่ inactive มาแสดง

### แก้ไข
| จุด | ก่อน | หลัง |
|-----|------|------|
| Select variants | `is_available` ไม่มี `is_active` | เพิ่ม `is_active` ทั้ง product_flavors และ flavors |
| Filter variants | `v.flavor && v.is_active` | `v.is_active && v.flavor?.is_active && v.flavor` |
| ไม่มี active variants | แสดง ฿0, Offer ว่าง | ซ่อนราคา, แสดง "สินค้าหมด", JSON-Ld ไม่มี offers, noindex |

### Runtime Verification
| Product | Variants | Price | Stock | JSON-LD |
|---------|----------|-------|-------|---------|
| alfa-duo-mesh-20k | active variants | ฿400 | InStock | AggregateOffer low:400/high:400 |
| marbo-m-bar-9k | active variants | ฿390 | OutOfStock | AggregateOffer low:390/high:390 |
| Infinity check | — | — | — | 0 occurrences |

> จำนวน variants ขึ้นกับ active records ใน Supabase — ไม่ hardcode

---

## 8. SEO Verification Blockers (4 ข้อ) — ผล

| # | Blocker | ผล | หลักฐาน |
|---|---------|-----|---------|
| 1 | /products render cards ใน HTML | ✅ | BAILOUT=0, 8 slugs ใน HTML |
| 2 | Aggregate 1 card/1 slug | ✅ | 8 distinct slugs (ไม่ใช่ 73 variants) |
| 3 | Brand ใช้ Supabase | ✅ | 7 active brands จาก Supabase |
| 4 | Guard no variants | ✅ | `if (!product?.slug \|\| !product.is_active) continue` |

### Rendered HTML — /products
```
BAILOUT: 0
Product cards: 8 (alfa, eskobar, marbo×2, mbar, mood, relx, vplus)
UUID links: 0
```

### Category / Brand
```
/categories/disposable-pod → 6 cards
/brands/alfa → 1 card
```

### Sitemap
```
Total: 25 URLs
Brands: 7 entries (Supabase — active brands only)
Products: 8 entries
Categories: 2 entries
Blog: 4 entries (listing + 3 posts)
Static: 4 entries (/, /products, /stock, /brands)
Register: 0 entries
```

---

## 9. สถาปัตยกรรมใหม่

### Shared Aggregate Helper (`src/lib/catalog-aggregate.ts`)
```
getAggregatedProducts()          → ทั้งหมด
getAggregatedProductsByCategory() → ตามหมวด
getAggregatedProductsByBrand()    → ตามแบรนด์
getAggregatedProductBySlug()      → เดียว
```
- 1 entry ต่อ 1 product slug (ไม่ใช่ per flavor variant)
- คำนวณ min_price, max_price, total_stock, has_stock, variant_count
- **ใช้ร่วมกัน** โดย /products, Category, Brand pages

### Server Product Grid (`src/components/ProductGridServer.tsx`)
- Server component — render `<a href="/products/{slug}">` ใน HTML
- ใช้โดย /products, Category, Brand pages
- ไม่ต้องรอ JavaScript

### Filter UI แยก (`ProductFilterClient.tsx`)
- Client component — search input + category pills
- อัปเดต URL params → server re-renders
- **ไม่ครอบ product grid** → ไม่มี BAILOUT

---

## 10. สิ่งที่ยังต้องใช้ข้อมูลจริง

| รายการ | สถานะ |
|--------|-------|
| Organization telephone | ⏳ ว่าง |
| Organization sameAs (social) |  ว่าง |
| Blog images | ⏳ ใช้รูปสินค้าแทน |
| Product descriptions |  บางรายการว่างใน DB |
| Product image alt | ⏳ บางรายการว่างใน DB |

---

## 11. Deployment Checklist

### Environment Variables (Vercel Dashboard)
| Variable | ค่า | หมายเหตุ |
|----------|-----|---------|
| `NEXT_PUBLIC_APP_URL` | `https://www.pod4u.store` | canonical, sitemap, JSON-LD |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://puslxgriozubqlpoxrqo.supabase.co` | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | _(จาก Dashboard)_ | Public key |
| `SUPABASE_SERVICE_ROLE_KEY` | _(จาก Dashboard)_ | Server-side only |
| `ADMIN_PASSWORD` | _(ค่าเดิม)_ | Admin panel |
| `ADMIN_SESSION_SECRET` | _(ค่าเดิม)_ | Session |

### Supabase Checks
- [ ] `products.slug` ครบทุกรายการ (ไม่ null)
- [ ] `categories.slug` + `is_active` ถูกต้อง
- [ ] `brands.slug` + `is_active` ถูกต้อง
- [ ] `product_flavors` — `is_active`, `is_available`, `stock_quantity`

### Post-Deploy
- [ ] Submit sitemap: `https://www.pod4u.store/sitemap.xml`
- [ ] Google Search Console — ไม่มี crawl errors
- [ ] Rich Results Test — Product schema ถูกต้อง
- [ ] robots.txt: `https://www.pod4u.store/robots.txt`

---

## 12. Build Result

```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (43/43)

○  (Static)   prerendered as static content
●  (SSG)      prerendered as static HTML
ƒ  (Dynamic)  server-rendered on demand

/products        ƒ  Dynamic (searchParams)
/products/[slug] ●  SSG (8 products, revalidate 3600s)
/categories/[slug] ● SSG (2 categories)
/brands          ○  Static (Supabase)
/brands/[slug]   ●  SSG (from Supabase)
/blog            ○  Static
/blog/[slug]     ●  SSG (3 posts)
/sitemap.xml     ○  Auto (revalidate 3600s)
/robots.txt      ○  Auto
```
