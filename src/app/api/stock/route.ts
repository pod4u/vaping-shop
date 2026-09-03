import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await getServerSupabase()
      .from("product_flavors")
      .select(`
        id, stock_quantity, price, sale_price, image_url,
        flavor:flavors(id, slug, name, name_th, color),
        product:products(id, name, name_th, puff_count, brand:brands(id, slug, name, name_th, color, banner_url))
      `)
      .eq("is_active", true)
      .eq("is_available", true)
      .gt("stock_quantity", 0)
      .order("stock_quantity", { ascending: false });
    if (error) throw error;

    const grouped = new Map<string, any>();
    for (const variant of data || []) {
      const product = Array.isArray(variant.product) ? variant.product[0] : variant.product;
      const brand = Array.isArray(product?.brand) ? product.brand[0] : product?.brand;
      const flavor = Array.isArray(variant.flavor) ? variant.flavor[0] : variant.flavor;
      if (!product || !brand || !flavor) continue;
      if (!grouped.has(brand.slug)) {
        grouped.set(brand.slug, {
          brand: { id: brand.slug, name: brand.name, name_th: brand.name_th, color: brand.color, banner_url: brand.banner_url },
          products: new Map<string, any>(),
        });
      }
      const brandGroup = grouped.get(brand.slug);
      if (!brandGroup.products.has(product.id)) {
        brandGroup.products.set(product.id, {
          id: product.id,
          name: product.name,
          name_th: product.name_th,
          price: Number(variant.price),
          sale_price: variant.sale_price == null ? null : Number(variant.sale_price),
          puff_count: product.puff_count,
          image_url: variant.image_url,
          availableFlavors: [],
        });
      }
      brandGroup.products.get(product.id).availableFlavors.push({
        id: variant.id,
        stock_quantity: variant.stock_quantity,
        flavor: { id: flavor.slug, name: flavor.name, name_th: flavor.name_th, color: flavor.color, image: variant.image_url },
      });
    }

    const result = [...grouped.values()].map((group) => ({ ...group, products: [...group.products.values()] }));
    return NextResponse.json({ success: true, data: result, lastUpdated: new Date().toISOString() });
  } catch (error) {
    console.error("Error reading Supabase stock", error);
    return NextResponse.json({ success: false, error: "ไม่สามารถอ่านข้อมูลได้", data: [], lastUpdated: new Date().toISOString() }, { status: 500 });
  }
}
