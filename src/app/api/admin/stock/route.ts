import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { requireAdminApiPermission } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

const MAX_PRICE = 99_999_999.99;

type StockUpdate = {
  productId: string;
  price: number;
  salePrice: number | null;
  flavors: Array<{ variantId: string; stock: number }>;
};

function normalizeMoney(value: unknown, label: string): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_PRICE) {
    throw new Error(`${label}ไม่ถูกต้อง`);
  }
  return Math.round(amount * 100) / 100;
}

function normalizeStock(value: unknown): number {
  const stock = Number(value);
  if (!Number.isInteger(stock) || stock < 0) {
    throw new Error("จำนวนสต็อกไม่ถูกต้อง");
  }
  return stock;
}

function normalizeUpdates(brands: unknown): StockUpdate[] {
  if (!Array.isArray(brands)) throw new Error("รูปแบบข้อมูลไม่ถูกต้อง");

  return brands.flatMap((brand: any) => {
    if (!Array.isArray(brand?.products)) throw new Error("รูปแบบสินค้าไม่ถูกต้อง");

    return brand.products.map((product: any) => {
      if (typeof product?.id !== "string" || !product.id) {
        throw new Error("ไม่พบรหัสสินค้า");
      }

      const price = normalizeMoney(product.price, "ราคาหลัก");
      const salePrice = product.salePrice === null || product.salePrice === "" || product.salePrice === undefined
        ? null
        : normalizeMoney(product.salePrice, "ราคาโปรโมชั่น");

      if (salePrice !== null && salePrice > price) {
        throw new Error("ราคาโปรโมชั่นต้องไม่สูงกว่าราคาหลัก");
      }
      if (!Array.isArray(product.flavors)) throw new Error("รูปแบบตัวเลือกสินค้าไม่ถูกต้อง");

      return {
        productId: product.id,
        price,
        salePrice,
        flavors: product.flavors.map((flavor: any) => {
          if (typeof flavor?.variantId !== "string" || !flavor.variantId) {
            throw new Error("ไม่พบรหัสตัวเลือกสินค้า");
          }
          return { variantId: flavor.variantId, stock: normalizeStock(flavor.stock) };
        }),
      };
    });
  });
}

async function readStock() {
  const { data, error } = await getServerSupabase()
    .from("product_flavors")
    .select(`
      id, variant_key, sku, stock_quantity, price, sale_price, image_url,
      flavor:flavors(slug, name, name_th, color),
      product:products(id, name, name_th, puff_count, category:categories(slug, name, name_th), brand:brands(slug, name, name_th, color))
    `)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;

  const brands = new Map<string, any>();
  for (const variant of data || []) {
    const product = Array.isArray(variant.product) ? variant.product[0] : variant.product;
    const brand = Array.isArray(product?.brand) ? product.brand[0] : product?.brand;
    const flavor = Array.isArray(variant.flavor) ? variant.flavor[0] : variant.flavor;
    const category = Array.isArray(product?.category) ? product.category[0] : product?.category;
    if (!product || !brand || !flavor) continue;
    if (!brands.has(brand.slug)) brands.set(brand.slug, { id: brand.slug, name: brand.name, nameTh: brand.name_th, color: brand.color, products: new Map() });
    const brandRow = brands.get(brand.slug);
    if (!brandRow.products.has(product.id)) {
      brandRow.products.set(product.id, { 
        id: product.id, 
        name: product.name, 
        nameTh: product.name_th, 
        price: Number(variant.price), 
        salePrice: variant.sale_price == null ? null : Number(variant.sale_price), 
        puffCount: product.puff_count, 
        category: category ? { id: category.slug, name: category.name, nameTh: category.name_th } : null,
        flavors: [] 
      });
    }
    brandRow.products.get(product.id).flavors.push({ id: flavor.slug, variantId: variant.id, variantKey: variant.variant_key, sku: variant.sku, name: flavor.name, nameTh: flavor.name_th, color: flavor.color, image: variant.image_url, stock: variant.stock_quantity });
  }
  return [...brands.values()].map((brand) => ({ ...brand, products: [...brand.products.values()] }));
}

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminApiPermission(request, "stock.view");
  if (unauthorized) return unauthorized;
  try {
    return NextResponse.json({ success: true, data: await readStock(), lastUpdated: new Date().toISOString() });
  } catch (error) {
    console.error("Error reading Supabase stock", error);
    return NextResponse.json({ success: false, error: "ไม่สามารถอ่านข้อมูลได้" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminApiPermission(request, "stock.manage");
  if (unauthorized) return unauthorized;

  let updates: StockUpdate[];
  try {
    const { brands } = await request.json();
    updates = normalizeUpdates(brands);
  } catch (error) {
    const message = error instanceof Error ? error.message : "รูปแบบข้อมูลไม่ถูกต้อง";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }

  try {
    const supabase = getServerSupabase();
    for (const product of updates) {
      const { data: updatedProduct, error: productError } = await supabase
        .from("products")
        .update({ price: product.price, sale_price: product.salePrice })
        .eq("id", product.productId)
        .select("id")
        .maybeSingle();
      if (productError) throw productError;
      if (!updatedProduct) throw new Error(`Product not found: ${product.productId}`);

      const { error: priceError } = await supabase
        .from("product_flavors")
        .update({ price: product.price, sale_price: product.salePrice })
        .eq("product_id", product.productId);
      if (priceError) throw priceError;

      for (const flavor of product.flavors) {
        const { data: updatedFlavor, error: stockError } = await supabase
          .from("product_flavors")
          .update({
            stock_quantity: flavor.stock,
            is_available: flavor.stock > 0,
          })
          .eq("id", flavor.variantId)
          .eq("product_id", product.productId)
          .select("id")
          .maybeSingle();
        if (stockError) throw stockError;
        if (!updatedFlavor) throw new Error(`Variant not found: ${flavor.variantId}`);
      }
    }
    return NextResponse.json({ success: true, message: "บันทึกราคาและสต็อกสำเร็จ", lastUpdated: new Date().toISOString() });
  } catch (error) {
    console.error("Error writing Supabase stock", error);
    return NextResponse.json({ success: false, error: "ไม่สามารถบันทึกข้อมูลได้" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const unauthorized = await requireAdminApiPermission(request, "stock.manage");
  if (unauthorized) return unauthorized;
  try {
    const { variantId, productId, flavorId, stock } = await request.json();
    let query = getServerSupabase().from("product_flavors").update({ 
      stock_quantity: Math.max(0, Number(stock) || 0),
      is_available: stock > 0  // Update is_available based on stock
    });
    query = variantId ? query.eq("id", variantId) : query.eq("product_id", productId).eq("flavor_id", flavorId);
    const { data, error } = await query.select("id").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ success: false, error: "ไม่พบสินค้า" }, { status: 404 });
    return NextResponse.json({ success: true, message: "อัปเดต stock สำเร็จ", lastUpdated: new Date().toISOString() });
  } catch (error) {
    console.error("Error updating Supabase stock", error);
    return NextResponse.json({ success: false, error: "ไม่สามารถอัปเดตข้อมูลได้" }, { status: 500 });
  }
}
