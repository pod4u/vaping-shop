import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
import { createClient } from "@supabase/supabase-js";

const projectRoot = process.cwd();
const require = createRequire(import.meta.url);

async function loadEnv(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

async function loadBrands() {
  const source = await fs.readFile(path.join(projectRoot, "src/lib/brands.ts"), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { module, exports: module.exports, require, console });
  return module.exports.brands;
}

const catalogMeta = {
  alfa: { brandName: "ALFA", brandNameTh: "อัลฟา", model: "Duo Mesh 20K", modelTh: "ดูโอเมช 20K", category: "disposable-pod", price: 400 },
  eskobar: { brandName: "ESKO BAR", brandNameTh: "เอสโกบาร์", model: "Switch 20K", modelTh: "สวิตช์ 20K", category: "disposable-pod", price: 480 },
  marbo: { brandName: "MARBO", brandNameTh: "มาร์โบ", model: "M BAR 9K", modelTh: "เอ็มบาร์ 9K", category: "disposable-pod", price: 390 },
  mbar: { brandName: "M BAR", brandNameTh: "เอ็มบาร์", model: "10K", modelTh: "10K", category: "disposable-pod", price: 350 },
  mood: { brandName: "MOOOD", brandNameTh: "มูด", model: "Monster Series 14K", modelTh: "มอนสเตอร์ซีรีส์ 14K", category: "disposable-pod", price: 350 },
  relx: { brandName: "RELX", brandNameTh: "รีแล็กซ์", model: "Pod Pro 2", modelTh: "พอดโปร 2", category: "flavor-pod", price: 200 },
  vplus: { brandName: "VPLUS", brandNameTh: "วีพลัส", model: "16K", modelTh: "16K", category: "disposable-pod", price: 340 },
};

const categoryRows = [
  { slug: "disposable-pod", name: "DISPOSABLE POD", name_th: "พอตใช้แล้วทิ้ง", description: "พอตใช้แล้วทิ้งพร้อมใช้งาน", icon: "💨", sort_order: 1 },
  { slug: "flavor-pod", name: "FLAVOR POD", name_th: "หัวน้ำยา หัวพอต", description: "หัวพอตและหัวน้ำยาสำเร็จรูป", icon: "🍒", sort_order: 2 },
];

function slugify(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeAlias(value) {
  return value.toLowerCase().normalize("NFKC").replace(/[่้๊๋์]/g, "").replace(/[^a-z0-9ก-๙]+/g, " ").trim();
}

function aliasesFor(brand, meta, flavor, nicotine) {
  const nicotineAliases = nicotine ? [`${flavor.name} ${nicotine}%`, `${flavor.nameTh} ${nicotine}%`, `${flavor.nameTh} น.${nicotine}`, `${flavor.nameTh} น${nicotine}`] : [];
  const common = {
    marbo: ["marbo m switch", "msw", "หัวเปลี่ยน msw", "มาโบ", "มาร์โบ"],
    mood: ["mood", "moood", "มูด", "มู๊ด", "หมูด"],
    alfa: ["alfa", "alpha", "อัลฟา"],
    vplus: ["vplus", "v-plus", "v plus", "วีพลัส"],
    eskobar: ["esko", "esko bar", "เอสโกบาร์"],
    mbar: ["mbar", "m bar", "เอ็มบาร์"],
    relx: ["relx", "รีแล็กซ์", "รีแลกซ์"],
  }[brand.id] || [];
  return [...new Set([
    brand.id, meta.brandName, meta.brandNameTh, flavor.id, flavor.name, flavor.nameTh,
    `${meta.brandName} ${flavor.name}`, `${meta.brandNameTh} ${flavor.nameTh}`,
    `${meta.brandName} ${meta.model} ${flavor.name}`, `${meta.brandNameTh} ${meta.modelTh} ${flavor.nameTh}`,
    ...nicotineAliases, ...common.map((value) => `${value} ${flavor.nameTh}`), ...common,
  ].map(normalizeAlias).filter(Boolean))];
}

function contentType(filePath) {
  if (filePath.endsWith(".webp")) return "image/webp";
  if (filePath.endsWith(".png")) return "image/png";
  return "image/jpeg";
}

await loadEnv(path.join(projectRoot, ".env.local"));
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase environment variables are missing");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const brands = await loadBrands();
const stockData = JSON.parse(await fs.readFile(path.join(projectRoot, "src/data/stock.json"), "utf8"));
const initialStock = new Map();
for (const stockBrand of stockData.brands || []) {
  for (const product of stockBrand.products || []) {
    for (const flavor of product.flavors || []) {
      initialStock.set(`${stockBrand.id}:${flavor.id}`, flavor.stock || 0);
    }
  }
}

const { data: existingBucket } = await supabase.storage.getBucket("product-images");
if (!existingBucket) {
  const { error } = await supabase.storage.createBucket("product-images", {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  if (error) throw error;
} else {
  const { error } = await supabase.storage.updateBucket("product-images", {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  if (error) throw error;
}

const categoryIds = new Map();
for (const category of categoryRows) {
  const { data, error } = await supabase.from("categories").upsert({ ...category, is_active: true }, { onConflict: "slug" }).select("id").single();
  if (error) throw error;
  categoryIds.set(category.slug, data.id);
}

let uploaded = 0;
let variantCount = 0;
for (let brandIndex = 0; brandIndex < brands.length; brandIndex += 1) {
  const brand = brands[brandIndex];
  const meta = catalogMeta[brand.id];
  if (!meta) throw new Error(`Missing catalog metadata for ${brand.id}`);

  const { data: brandRow, error: brandError } = await supabase.from("brands").upsert({
    slug: brand.id,
    name: meta.brandName,
    name_th: meta.brandNameTh,
    description: brand.description,
    color: brand.color,
    banner_url: brand.banner || null,
    sort_order: brandIndex + 1,
    is_active: true,
  }, { onConflict: "slug" }).select("id").single();
  if (brandError) throw brandError;

  const productKey = `${brand.id}-${slugify(meta.model)}`;
  const { data: productRow, error: productError } = await supabase.from("products").upsert({
    product_key: productKey,
    sku: productKey.toUpperCase(),
    slug: productKey,
    name: `${meta.brandName} ${meta.model}`,
    name_th: `${meta.brandNameTh} ${meta.modelTh}`,
    brand_id: brandRow.id,
    category_id: categoryIds.get(meta.category),
    description: brand.description,
    price: meta.price,
    sale_price: null,
    puff_count: brand.puffCount || 0,
    sort_order: brandIndex + 1,
    is_active: true,
  }, { onConflict: "product_key" }).select("id").single();
  if (productError) throw productError;

  let primaryImageUrl = null;
  for (let flavorIndex = 0; flavorIndex < brand.flavors.length; flavorIndex += 1) {
    const flavor = brand.flavors[flavorIndex];
    const { data: flavorRow, error: flavorError } = await supabase.from("flavors").upsert({
      slug: flavor.id,
      name: flavor.name,
      name_th: flavor.nameTh,
      color: flavor.color || null,
      is_active: true,
    }, { onConflict: "slug" }).select("id").single();
    if (flavorError) throw flavorError;

    const localPath = path.join(projectRoot, "public", flavor.image.replace(/^\//, ""));
    const storagePath = flavor.image.replace(/^\/images\/products\//, "");
    const bytes = await fs.readFile(localPath);
    const { error: uploadError } = await supabase.storage.from("product-images").upload(storagePath, bytes, {
      contentType: contentType(localPath),
      cacheControl: "31536000",
      upsert: true,
    });
    if (uploadError) throw uploadError;
    uploaded += 1;

    const { data: publicUrlData } = supabase.storage.from("product-images").getPublicUrl(storagePath);
    const imageUrl = publicUrlData.publicUrl;
    primaryImageUrl ||= imageUrl;
    const nicotine = flavor.nicotinePercent ?? (brand.id === "relx" ? 5 : null);
    const variantKey = [productKey, flavor.id, nicotine ? `n${nicotine}` : null].filter(Boolean).join("-");
    const { data: existingVariant } = await supabase.from("product_flavors").select("stock_quantity").eq("variant_key", variantKey).maybeSingle();
    const { data: variantRow, error: variantError } = await supabase.from("product_flavors").upsert({
      product_id: productRow.id,
      flavor_id: flavorRow.id,
      variant_key: variantKey,
      sku: variantKey.toUpperCase(),
      nicotine_level: nicotine,
      price: meta.price,
      sale_price: null,
      image_path: storagePath,
      image_url: imageUrl,
      image_alt_en: `${meta.brandName} ${meta.model} - ${flavor.name}`,
      image_alt_th: `${meta.brandNameTh} ${meta.modelTh} - ${flavor.nameTh}`,
      stock_quantity: existingVariant?.stock_quantity ?? initialStock.get(`${brand.id}:${flavor.id}`) ?? 0,
      is_available: true,
      is_active: true,
      sort_order: flavorIndex + 1,
    }, { onConflict: "variant_key" }).select("id").single();
    if (variantError) throw variantError;

    const aliases = aliasesFor(brand, meta, flavor, nicotine).map((alias) => ({
      product_flavor_id: variantRow.id,
      alias,
      normalized_alias: alias,
      language: /[ก-๙]/.test(alias) ? "th" : "en",
    }));
    const { error: deleteAliasError } = await supabase.from("product_aliases").delete().eq("product_flavor_id", variantRow.id);
    if (deleteAliasError) throw deleteAliasError;
    const { error: aliasError } = await supabase.from("product_aliases").insert(aliases);
    if (aliasError) throw aliasError;
    variantCount += 1;
  }

  const { error: imageError } = await supabase.from("products").update({ image_url: primaryImageUrl }).eq("id", productRow.id);
  if (imageError) throw imageError;
}

console.log(JSON.stringify({ brands: brands.length, categories: categoryRows.length, variants: variantCount, uploaded }));
