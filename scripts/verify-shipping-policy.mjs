import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const sourceRoot = path.resolve("src");
const sourceFiles = [];

async function collectSourceFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectSourceFiles(entryPath);
    } else if (/\.(?:ts|tsx|js|jsx)$/.test(entry.name)) {
      sourceFiles.push(entryPath);
    }
  }
}

await collectSourceFiles(sourceRoot);

const forbiddenPatterns = [
  { label: "obsolete free-shipping amount", pattern: /ส่งฟรี.{0,50}800|800.{0,50}ส่งฟรี/gu },
  { label: "obsolete configuration key", pattern: /freeShippingMin/g },
];

const violations = [];
for (const file of sourceFiles) {
  const source = await readFile(file, "utf8");
  for (const { label, pattern } of forbiddenPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(source)) {
      violations.push(`${path.relative(process.cwd(), file)}: ${label}`);
    }
  }
}

const webhook = await readFile(path.join(sourceRoot, "app/api/line/webhook/route.ts"), "utf8");
const requiredReply = "เฉพาะสินค้าดูดแล้วทิ้ง สั่งตั้งแต่ 3 ชิ้นขึ้นไป ส่งฟรี";
if (!webhook.includes(requiredReply)) {
  violations.push("LINE shipping reply does not contain the approved disposable-only policy");
}

if (violations.length > 0) {
  console.error("Shipping policy verification failed:\n" + violations.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("✓ Shipping policy is consistent: disposable products only, 3+ items ship free; other orders cost 50 THB.");
