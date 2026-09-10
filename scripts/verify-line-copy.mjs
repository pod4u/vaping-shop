import { readFile } from "node:fs/promises";

const customerCopyFiles = [
  "src/app/api/line/webhook/route.ts",
  "src/app/api/customers/register/route.ts",
  "src/hooks/use-cart.tsx",
];

const violations = [];
for (const file of customerCopyFiles) {
  const source = await readFile(file, "utf8");
  if (source.includes("ครับ/ค่ะ")) {
    violations.push(`${file}: contains mixed-gender customer copy`);
  }
}

if (violations.length > 0) {
  console.error("LINE copy verification failed:\n" + violations.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("✓ Customer-facing LINE copy uses a consistent feminine voice.");
