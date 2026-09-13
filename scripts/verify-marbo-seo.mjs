import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const read = (path) => readFileSync(resolve(root, path), "utf8");
const brandPage = read("src/app/(public)/brands/[slug]/page.tsx");
const productPage = read("src/app/(public)/products/[slug]/page.tsx");
const productsPage = read("src/app/(public)/products/page.tsx");
const homeBlogSection = read("src/components/BlogSectionNavy.tsx");
const blogData = read("src/data/blog.ts");

const checks = [
  ["MARBO brand title has one natural Thai alias", brandPage.includes('return "MARBO (มาโบ) รวมรุ่น รสชาติ และข้อมูลสินค้า";')],
  ["MARBO brand H1 is focused", brandPage.includes('isMarbo ? "MARBO (มาโบ)" : namePrimary')],
  ["MARBO brand links to its product", brandPage.includes('href="/products/marbo-m-bar-9k"')],
  ["MARBO brand links to M SWITCH 15K", brandPage.includes('href="/products/marbo-m-switch-15k"')],
  ["MARBO brand compares current models", brandPage.includes('id="compare-marbo-models"') && brandPage.includes("marboModels.map")],
  ["MARBO FAQ lists current catalog models", brandPage.includes('question: "MARBO มีรุ่นอะไรบ้าง?"') && brandPage.includes("products.map")],
  ["MARBO FAQ explains MARBO and M BAR", brandPage.includes('question: "MARBO กับ M BAR ต่างกันอย่างไร?"')],
  ["MARBO brand links to the flavor guide", brandPage.includes('href="/blog/marbo-9k-flavors"')],
  ["M BAR brand links to the flavor guide", brandPage.includes('href="/blog/mbar-10k-flavors"')],
  ["brand pages link to the comparison guide", brandPage.includes('href="/blog/marbo-9k-vs-mbar-10k"')],
  ["product pages link to the flavor guides", productPage.includes('href: "/blog/marbo-9k-flavors"') && productPage.includes('href: "/blog/mbar-10k-flavors"')],
  ["product pages link to the comparison guide", productPage.includes('href: "/blog/marbo-9k-vs-mbar-10k"')],
  ["M SWITCH 15K has focused metadata", productPage.includes('title = "MARBO M SWITCH 15K - มาโบ 15K"')],
  ["M SWITCH 15K links back to comparison", productPage.includes('href: "/brands/marbo#compare-marbo-models"')],
  ["catalog landing links to the MARBO brand", productsPage.includes('href="/brands/marbo"')],
  ["catalog landing links to MARBO 9K", productsPage.includes('href="/products/marbo-m-bar-9k"')],
  ["home links to the MARBO brand", homeBlogSection.includes('href="/brands/marbo"')],
  ["home links to the MARBO flavor guide", homeBlogSection.includes('href="/blog/marbo-9k-flavors"')],
  ["comparison guide links back to the MARBO brand", blogData.includes('{ href: "/brands/marbo", label: "ดูสินค้าแบรนด์ MARBO" }')],
  ["comparison guide links back to the M BAR brand", blogData.includes('{ href: "/brands/mbar", label: "ดูสินค้าแบรนด์ M BAR" }')],
  ["old keyword-list title is gone", !brandPage.includes("MARBO (มาโบ/มาร์โบ) และ M BAR")],
  ["product guide uses buyer-facing language", !productPage.includes("ผู้ค้นอาจใช้คำว่า")],
  ["brand guide uses buyer-facing language", !brandPage.includes("ผู้ค้นอาจใช้คำว่า")],
  ["MARBO article image alts describe visible products", blogData.includes('imageAlt: "MARBO M BAR 9K รสองุ่นลิ้นจี่ พร้อมกล่องและตัวเครื่อง"') && blogData.includes('imageAlt: "M BAR 10K รสองุ่นเคียวโฮ พร้อมกล่องและตัวเครื่อง"')],
];

for (const [name, condition] of checks) {
  assert.equal(condition, true, name);
  console.log(`PASS ${name}`);
}

console.log(`${checks.length} MARBO SEO checks passed.`);
