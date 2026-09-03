import { getServerSupabase } from "@/lib/supabase";

export interface ProductSearchResult {
  id: string;
  brandId: string;
  brandName: string;
  brandNameTh: string;
  flavorId: string;
  flavorName: string;
  flavorNameTh: string;
  nicotinePercent?: number;
  color: string;
  image: string;
  price: number;
  stock: number;
  aliases: string[];
}

const searchSelect = `
  id, nicotine_level, price, sale_price, image_url, stock_quantity,
  flavor:flavors(id, slug, name, name_th, color),
  product:products(id, brand:brands(id, slug, name, name_th)),
  aliases:product_aliases(alias, normalized_alias)
`;

function relation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function normalizeQuery(text: string): string {
  return text.toLowerCase().normalize("NFKC").replace(/[่้๊๋์]/g, "").replace(/[^a-z0-9ก-๙]+/g, " ").trim();
}

function toSearchResult(row: any): ProductSearchResult {
  const product = relation<any>(row.product);
  const brand = relation<any>(product?.brand);
  const flavor = relation<any>(row.flavor);
  return {
    id: row.id,
    brandId: brand?.slug,
    brandName: brand?.name,
    brandNameTh: brand?.name_th,
    flavorId: flavor?.slug,
    flavorName: flavor?.name,
    flavorNameTh: flavor?.name_th,
    nicotinePercent: row.nicotine_level == null ? undefined : Number(row.nicotine_level),
    color: flavor?.color || "#6B7280",
    image: row.image_url,
    price: Number(row.sale_price ?? row.price),
    stock: row.stock_quantity,
    aliases: (row.aliases || []).flatMap((item: any) => [item.alias, item.normalized_alias]).filter(Boolean),
  };
}

function levenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1], matrix[i][j - 1], matrix[i - 1][j]) + 1;
    }
  }
  return matrix[b.length][a.length];
}

function calculateScore(query: string, product: ProductSearchResult): number {
  let best = 0;
  for (const rawAlias of product.aliases) {
    const alias = normalizeQuery(rawAlias);
    if (!alias) continue;
    if (alias === query) return 100;
    if (alias.includes(query) || query.includes(alias)) best = Math.max(best, 80);
    const maxLength = Math.max(query.length, alias.length);
    if (maxLength) {
      const similarity = 1 - levenshteinDistance(query, alias) / maxLength;
      if (similarity > 0.6) best = Math.max(best, Math.round(similarity * 70));
    }
  }
  return best;
}

async function loadProducts(availableOnly = false): Promise<ProductSearchResult[]> {
  let query = getServerSupabase().from("product_flavors").select(searchSelect).eq("is_active", true).eq("is_available", true);
  if (availableOnly) query = query.gt("stock_quantity", 0);
  const { data, error } = await query.order("sort_order", { ascending: true });
  if (error) throw error;
  return (data || []).map(toSearchResult);
}

export async function fuzzySearchProducts(query: string, limit = 5): Promise<ProductSearchResult[]> {
  const normalized = normalizeQuery(query);
  const products = await loadProducts(false);
  return products
    .map((product) => ({ product, score: calculateScore(normalized, product) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.product.stock - a.product.stock)
    .slice(0, limit)
    .map(({ product }) => product);
}

export async function getAvailableProducts(limit = 20): Promise<ProductSearchResult[]> {
  return (await loadProducts(true)).slice(0, limit);
}

export function parseQuantity(text: string): number {
  const explicit = text.match(/(\d+)\s*(?:ตัว|ชิ้น|อัน)/);
  if (explicit) return Math.max(1, Number(explicit[1]));
  const thaiQuantities: Array<[RegExp, number]> = [
    [/สอง(?:ตัว|ชิ้น|อัน)?/, 2], [/สาม(?:ตัว|ชิ้น|อัน)?/, 3],
    [/สี่(?:ตัว|ชิ้น|อัน)?/, 4], [/ห้า(?:ตัว|ชิ้น|อัน)?/, 5],
    [/ครึ่งโหล/, 6], [/โหล/, 12],
  ];
  return thaiQuantities.find(([pattern]) => pattern.test(text))?.[1] ?? 1;
}
