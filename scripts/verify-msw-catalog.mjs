import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const envText = await fs.readFile(path.join(process.cwd(), ".env.local"), "utf8");
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase
  .from("product_flavors")
  .select("variant_key, sku, price, stock_quantity, is_available, image_path, image_url, flavor:flavors(slug,name,name_th), product:products!inner(product_key,name,name_th,brand:brands!inner(slug))")
  .eq("product.product_key", "marbo-m-switch-15k")
  .eq("product.brand.slug", "marbo")
  .order("sort_order");

if (error) throw error;

const rows = (data || []).map((row) => ({
  variant_key: row.variant_key,
  price: Number(row.price),
  stock: row.stock_quantity,
  available: row.is_available,
  image_path: row.image_path,
  image_url_ok: row.image_url.includes("/storage/v1/object/public/product-images/"),
}));

const invalid = rows.filter((row) => row.price !== 390 || !row.image_url_ok || !row.image_path || !row.variant_key.startsWith("marbo-m-switch-15k-"));
console.log(JSON.stringify({ count: rows.length, invalid: invalid.length, rows }, null, 2));
if (rows.length !== 12 || invalid.length > 0) process.exitCode = 1;
