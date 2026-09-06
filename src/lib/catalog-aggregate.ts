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
  /** Unique flavor names (English) for search */
  flavor_names: string[];
  /** Unique flavor names (Thai) for search */
  flavor_names_th: string[];
  /** Bilingual flavor pairs for human-facing product summaries */
  flavors: Array<{ name: string; name_th: string | null }>;
}

/**
 * Normalize text for search matching.
 * - trim
 * - lowercase
 * - Unicode normalize NFKC
 * - collapse whitespace
 */
export function normalizeSearch(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, " ");
}

/**
 * Compact form for flexible matching.
 * Removes spaces, commas, periods, underscores, and hyphens.
 * Used for comparing "M BAR" vs "mbar", "20K" vs "20 K", etc.
 */
export function compactSearch(text: string): string {
  return normalizeSearch(text).replace(/[\s,._-]+/g, "");
}

/**
 * Check if a query matches text (case-insensitive, normalized).
 * Also checks compact form when query has no spaces (e.g., "mbar" matches "M BAR").
 */
export function matchText(text: string | null | undefined, query: string): boolean {
  if (!text) return false;
  const normalizedText = normalizeSearch(text);
  const normalizedQuery = normalizeSearch(query);

  // Normal match
  if (normalizedText.includes(normalizedQuery)) return true;

  // Compact match: if query has no spaces after normalization, check compact form
  // This allows "mbar" to match "M BAR"
  if (!normalizedQuery.includes(" ")) {
    const compactText = compactSearch(text);
    const compactQuery = compactSearch(query);
    if (compactText.includes(compactQuery)) return true;
  }

  return false;
}

/**
 * Check if a query matches any item in an array.
 */
export function matchArray(items: string[], query: string): boolean {
  return items.some((item) => matchText(item, query));
}

/**
 * Parse puff count from various formats:
 * - "20K" / "20k" / "20 K" → 20000
 * - "20000" / "20,000" → 20000
 * Returns null if not parseable as a puff count.
 */
export function parsePuffQuery(query: string): number | null {
  const compact = compactSearch(query);

  // Match K format: "20k" → 20000
  const kMatch = compact.match(/^(\d+)k$/i);
  if (kMatch) {
    return parseInt(kMatch[1], 10) * 1000;
  }

  // Match number format: "20000" → 20000
  const numMatch = compact.match(/^(\d+)$/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }

  return null;
}

/**
 * Check if puff count matches query.
 * Handles: 20K, 20k, 20 K, 20000, 20,000
 */
export function matchPuffCount(puffCount: number | null, query: string): boolean {
  if (!puffCount) return false;

  const parsed = parsePuffQuery(query);
  if (parsed !== null) {
    return puffCount === parsed;
  }

  // Fallback: partial match on compact forms
  const compactQuery = compactSearch(query);
  const compactPuffK = `${puffCount / 1000}k`;
  const compactPuffNum = puffCount.toString();

  return compactPuffK.includes(compactQuery) || compactPuffNum.includes(compactQuery);
}

function relation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

/**
 * Deduplicate and clean string array.
 * - Trim whitespace
 * - Filter empty strings
 * - Case-insensitive deduplication
 */
function dedupeStrings(items: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    if (!item) continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
  }

  return result;
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
        brand:brands(id, slug, name, name_th, color, is_active),
        category:categories(id, slug, name, name_th, is_active)
      ),
      flavor:flavors(id, slug, name, name_th, color, is_active)
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

    // Skip if referenced flavor is missing or inactive
    if (!flavor || flavor.is_active !== true) continue;

    // Skip if brand is inactive (if is_active field exists)
    if (brand && brand.is_active === false) continue;

    // Skip if category is inactive (if is_active field exists)
    if (category && category.is_active === false) continue;

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
        flavor_names: flavor.name ? [flavor.name] : [],
        flavor_names_th: flavor.name_th ? [flavor.name_th] : [],
        flavors: [{ name: flavor.name, name_th: flavor.name_th }],
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
      // Add flavor names for search
      if (flavor.name) {
        agg.flavor_names.push(flavor.name);
      }
      if (flavor.name_th) {
        agg.flavor_names_th.push(flavor.name_th);
      }
      agg.flavors.push({ name: flavor.name, name_th: flavor.name_th });
    }
  }

  // Deduplicate flavor names
  for (const agg of map.values()) {
    agg.flavor_names = dedupeStrings(agg.flavor_names);
    agg.flavor_names_th = dedupeStrings(agg.flavor_names_th);
    const seenFlavors = new Set<string>();
    agg.flavors = agg.flavors.filter((flavor) => {
      const key = normalizeSearch(flavor.name || flavor.name_th || "");
      if (!key || seenFlavors.has(key)) return false;
      seenFlavors.add(key);
      return true;
    });
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
