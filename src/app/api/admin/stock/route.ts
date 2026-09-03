import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function readStock() {
  const { data, error } = await getServerSupabase()
    .from("product_flavors")
    .select(`
      id, stock_quantity, price, sale_price, image_url,
      flavor:flavors(slug, name, name_th, color),
      product:products(id, name, name_th, puff_count, brand:brands(slug, name, name_th, color))
    `)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;

  const brands = new Map<string, any>();
  for (const variant of data || []) {
    const product = Array.isArray(variant.product) ? variant.product[0] : variant.product;
    const brand = Array.isArray(product?.brand) ? product.brand[0] : product?.brand;
    const flavor = Array.isArray(variant.flavor) ? variant.flavor[0] : variant.flavor;
    if (!product || !brand || !flavor) continue;
    if (!brands.has(brand.slug)) brands.set(brand.slug, { id: brand.slug, name: brand.name, nameTh: brand.name_th, color: brand.color, products: new Map() });
    const brandRow = brands.get(brand.slug);
    if (!brandRow.products.has(product.id)) {
      brandRow.products.set(product.id, { id: product.id, name: product.name, nameTh: product.name_th, price: Number(variant.price), salePrice: variant.sale_price == null ? null : Number(variant.sale_price), puffCount: product.puff_count, flavors: [] });
    }
    brandRow.products.get(product.id).flavors.push({ id: flavor.slug, variantId: variant.id, name: flavor.name, nameTh: flavor.name_th, color: flavor.color, image: variant.image_url, stock: variant.stock_quantity });
  }
  return [...brands.values()].map((brand) => ({ ...brand, products: [...brand.products.values()] }));
}

export async function GET() {
  try {
    return NextResponse.json({ success: true, data: await readStock(), lastUpdated: new Date().toISOString() });
  } catch (error) {
    console.error("Error reading Supabase stock", error);
    return NextResponse.json({ success: false, error: "ไม่สามารถอ่านข้อมูลได้" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { brands } = await request.json();
    const updates = (brands || []).flatMap((brand: any) => (brand.products || []).flatMap((product: any) => (product.flavors || []).map((flavor: any) => ({ id: flavor.variantId, brandId: brand.id, productId: product.id, flavorId: flavor.id, stock: Math.max(0, Number(flavor.stock) || 0) }))));
    const supabase = getServerSupabase();
    for (const item of updates) {
      let query = supabase.from("product_flavors").update({ stock_quantity: item.stock });
      query = item.id ? query.eq("id", item.id) : query.eq("product_id", item.productId).eq("flavor_id", item.flavorId);
      const { error } = await query;
      if (error) throw error;
    }
    return NextResponse.json({ success: true, message: "บันทึกข้อมูลสำเร็จ", lastUpdated: new Date().toISOString() });
  } catch (error) {
    console.error("Error writing Supabase stock", error);
    return NextResponse.json({ success: false, error: "ไม่สามารถบันทึกข้อมูลได้" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { variantId, productId, flavorId, stock } = await request.json();
    let query = getServerSupabase().from("product_flavors").update({ stock_quantity: Math.max(0, Number(stock) || 0) });
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
