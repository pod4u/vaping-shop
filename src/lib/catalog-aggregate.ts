import { getServerSupabase } from "@/lib/supabase";

/**
 * Aggregated product model — one entry per product slug.
 * Combines all product_flavors (variants) into a single record
 * with price range, stock status, and variant count.
 */
export interface AggregatedProduct {
  slug: string;
  name: string;
  name_th: string | null;
  description: string | null;
  puff_count: number | null;
  image_url: string | null;
  brand_slug: string;
  brand_name: string;
  brand_name_th: string | null;
  brand_color: string | null;
  category_slug: string | null;
  category_name: string | null;
  category_name_th: string | null;
  min_price: number;
  max_price: number;
  sale_price: number | null; // lowest sale price if any variant has one
  total_stock: number;
  has_stock: boolean;
  variant_count: number;
}

const productSelect = `
  id, slug, name, name_th, description, puff_count, image_url, price, sale_price,
  brand:brands(id, slug, name, name_th, color),
  category:categories(id, slug, name, name_th)
`;

const variantSelect = `
  id, price, sale_price, stock_quantity, is_available, image_url,
  flavor:flavors(id, slug, name, name_th, color)
`;

function relation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

/**
 * Fetch all active products aggregated by slug.
 * One entry per product model — not per flavor variant.
 */
export async function getAggregatedProducts(): Promise<AggregatedProduct[]> {
  const supabase = getServerSupabase();

  const { data: variants, error } = await supabase
    .from("product_flavors")
    .select(`
      id, price, sale_price, stock_quantity, is_available, image_url,
      product:products(
        id, slug, name, name_th, description, puff_count, image_url, price, sale_price, is_active,
        brand:brands(id, slug, name, name_th, color),
        category:categories(id, slug, name, name_th)
      ),
      flavor:flavors(id, slug, name, name_th, color)
    `)
    .eq("is_active", true);

  if (error) throw error;

  // Group by product slug
  const map = new Map<string, AggregatedProduct>();

  for (const row of variants || []) {
    const product = relation<any>(row.product);
    if (!product?.slug || !product.is_active) continue;

    const brand = relation<any>(product.brand);
    const category = relation<any>(product.category);
    const flavor = relation<any>(row.flavor);

    const stock = Number(row.stock_quantity || 0);
    const isAvailable = row.is_available && stock > 0;
    const price = Number(row.sale_price ?? row.price);

    if (!map.has(product.slug)) {
      map.set(product.slug, {
        slug: product.slug,
        name: product.name,
        name_th: product.name_th,
        description: product.description,
        puff_count: product.puff_count,
        image_url: product.image_url || row.image_url,
        brand_slug: brand?.slug || "",
        brand_name: brand?.name || "",
        brand_name_th: brand?.name_th || null,
        brand_color: brand?.color || null,
        category_slug: category?.slug || null,
        category_name: category?.name || null,
        category_name_th: category?.name_th || null,
        min_price: price,
        max_price: price,
        sale_price: row.sale_price != null ? Number(product.price) : null,
        total_stock: isAvailable ? stock : 0,
        has_stock: isAvailable,
        variant_count: 1,
      });
    } else {
      const agg = map.get(product.slug)!;
      agg.min_price = Math.min(agg.min_price, price);
      agg.max_price = Math.max(agg.max_price, price);
      if (row.sale_price != null && (agg.sale_price == null || Number(product.price) < agg.sale_price)) {
        agg.sale_price = Number(product.price);
      }
      if (isAvailable) {
        agg.total_stock += stock;
        agg.has_stock = true;
      }
      agg.variant_count++;
      // Use first available image
      if (!agg.image_url && row.image_url) {
        agg.image_url = row.image_url;
      }
    }
  }

  return [...map.values()].sort((a, b) =>
    (a.name_th || a.name).localeCompare(b.name_th || b.name, "en", { sensitivity: "base" })
  );
}

/**
 * Fetch aggregated products filtered by category slug.
 */
export async function getAggregatedProductsByCategory(categorySlug: string): Promise<AggregatedProduct[]> {
  const all = await getAggregatedProducts();
  return all.filter((p) => p.category_slug === categorySlug);
}

/**
 * Fetch aggregated products filtered by brand slug.
 */
export async function getAggregatedProductsByBrand(brandSlug: string): Promise<AggregatedProduct[]> {
  const all = await getAggregatedProducts();
  return all.filter((p) => p.brand_slug === brandSlug);
}

/**
 * Fetch a single aggregated product by slug.
 */
export async function getAggregatedProductBySlug(slug: string): Promise<AggregatedProduct | null> {
  const all = await getAggregatedProducts();
  return all.find((p) => p.slug === slug) || null;
}
