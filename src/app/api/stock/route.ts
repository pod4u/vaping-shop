import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getServerSupabase();

    const { data, error } = await supabase
      .from("product_flavors")
      .select(`
        id, stock_quantity, price, sale_price, image_url,
        flavor:flavors(id, slug, name, name_th, color, is_active),
        product:products(
          id, slug, name, name_th, puff_count, price, sale_price, is_active,
          brand:brands(id, slug, name, name_th, color, banner_url, is_active),
          category:categories(slug, name, name_th, is_active)
        )
      `)
      .eq("is_active", true)
      .eq("is_available", true)
      .gt("stock_quantity", 0)
      .order("stock_quantity", { ascending: false });

    if (error) throw error;

    const grouped = new Map<string, any>();
    let totalVariants = 0;

    for (const variant of data || []) {
      const product = Array.isArray(variant.product) ? variant.product[0] : variant.product;
      const brand = Array.isArray(product?.brand) ? product.brand[0] : product?.brand;
      const flavor = Array.isArray(variant.flavor) ? variant.flavor[0] : variant.flavor;
      const category = Array.isArray(product?.category) ? product.category[0] : product?.category;

      // Skip if any required relation is missing
      if (!product || !brand || !flavor) continue;

      // Active relation guards (fail-closed)
      if (product.is_active !== true) continue;
      if (flavor.is_active !== true) continue;
      if (brand.is_active !== true) continue;
      if (category && category.is_active !== true) continue;

      totalVariants++;

      if (!grouped.has(brand.slug)) {
        grouped.set(brand.slug, {
          brand: {
            id: brand.slug,
            name: brand.name,
            name_th: brand.name_th,
            color: brand.color,
            banner_url: brand.banner_url,
          },
          products: new Map<string, any>(),
        });
      }

      const brandGroup = grouped.get(brand.slug);

      if (!brandGroup.products.has(product.id)) {
        brandGroup.products.set(product.id, {
          id: product.id,
          slug: product.slug,
          name: product.name,
          name_th: product.name_th,
          price: product.price != null ? Number(product.price) : null,
          sale_price: product.sale_price != null ? Number(product.sale_price) : null,
          puff_count: product.puff_count,
          image_url: variant.image_url,
          category: category
            ? { slug: category.slug, name: category.name, name_th: category.name_th }
            : null,
          availableFlavors: [],
        });
      }

      // Variant-level prices only - no fallback to product or 0
      brandGroup.products.get(product.id).availableFlavors.push({
        id: variant.id,
        stock_quantity: variant.stock_quantity,
        price: variant.price != null ? Number(variant.price) : null,
        sale_price: variant.sale_price != null ? Number(variant.sale_price) : null,
        flavor: {
          id: flavor.slug,
          name: flavor.name,
          name_th: flavor.name_th,
          color: flavor.color,
          image: variant.image_url,
        },
      });
    }

    const result = [...grouped.values()].map((group) => ({
      ...group,
      products: [...group.products.values()],
    }));

    return NextResponse.json(
      {
        success: true,
        data: result,
        totalVariants,
        lastUpdated: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "CDN-Cache-Control": "no-store",
          "Vercel-CDN-Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error reading Supabase stock", error);
    return NextResponse.json(
      {
        success: false,
        error: "ไม่สามารถอ่านข้อมูลได้",
        data: [],
        totalVariants: 0,
        lastUpdated: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}