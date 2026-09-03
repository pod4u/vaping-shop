import { supabase } from "@/lib/supabase";
import type { Product } from "@/types/product";

const catalogSelect = `
  id,
  variant_key,
  sku,
  nicotine_level,
  price,
  sale_price,
  image_url,
  image_alt_en,
  image_alt_th,
  stock_quantity,
  is_available,
  sort_order,
  flavor:flavors(id, slug, name, name_th, color),
  product:products(
    id, product_key, slug, name, name_th, description, puff_count,
    brand:brands(id, slug, name, name_th),
    category:categories(id, slug, name, name_th, icon)
  )
`;

function relation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function toProduct(row: any): Product {
  const product = relation<any>(row.product);
  const flavor = relation<any>(row.flavor);
  const category = relation<any>(product?.category);
  const brand = relation<any>(product?.brand);
  const currentPrice = Number(row.sale_price ?? row.price);
  const originalPrice = row.sale_price ? Number(row.price) : undefined;
  const features = [
    brand?.name,
    product?.puff_count ? `${Number(product.puff_count).toLocaleString()} Puffs` : null,
    flavor?.name,
    row.nicotine_level ? `${row.nicotine_level}% Nicotine` : null,
  ].filter(Boolean) as string[];

  return {
    id: row.id,
    name: `${product?.name ?? ""} - ${flavor?.name ?? ""}`,
    nameTh: `${product?.name_th ?? ""} - ${flavor?.name_th ?? ""}`,
    category: category?.slug ?? "disposable-pod",
    price: currentPrice,
    originalPrice,
    image: row.image_url,
    imageAlt: row.image_alt_th || row.image_alt_en || undefined,
    description: product?.description || `${brand?.name ?? ""} ${flavor?.name ?? ""}`,
    features,
    inStock: row.is_available && row.stock_quantity > 0,
    isFeatured: false,
    sku: row.sku,
    variantKey: row.variant_key,
  };
}

export async function getCatalogProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("product_flavors")
    .select(catalogSelect)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data || []).map(toProduct);
}

export async function getCatalogProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("product_flavors")
    .select(catalogSelect)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data ? toProduct(data) : null;
}
