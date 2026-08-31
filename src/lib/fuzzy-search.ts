// Fuzzy Search สำหรับจับคู่ชื่อสินค้าที่พิมพ์ผิด
// ใช้กับ LINE Bot เมื่อลูกค้าสั่งซื้อ

import { brands } from '@/lib/brands';

// สร้าง product list จาก brands
export interface Product {
  id: string;
  brandId: string;
  brandName: string;
  brandNameTh: string;
  flavorId: string;
  flavorName: string;
  flavorNameTh: string;
  color: string;
  image: string;
  price: number;
  aliases: string[]; // ชื่อที่อาจพิมพ์ผิด
}

// สร้าง product list
export const productList: Product[] = brands.flatMap(brand =>
  brand.flavors.map(flavor => ({
    id: `${brand.id}-${flavor.id}`,
    brandId: brand.id,
    brandName: brand.name,
    brandNameTh: brand.nameTh,
    flavorId: flavor.id,
    flavorName: flavor.name,
    flavorNameTh: flavor.nameTh,
    color: flavor.color || '#6B7280',
    image: flavor.image,
    price: getPriceByBrand(brand.id),
    aliases: generateAliases(brand.name, brand.nameTh, flavor.name, flavor.nameTh)
  }))
);

// ราคาตามแบรนด์
function getPriceByBrand(brandId: string): number {
  const prices: Record<string, number> = {
    alfa: 450, marbo: 280, mood: 320, vplus: 380,
    eskobar: 480, mbar: 350, relx: 450
  };
  return prices[brandId] || 350;
}

// สร้าง aliases สำหรับ fuzzy search
function generateAliases(
  brandName: string,
  brandNameTh: string,
  flavorName: string,
  flavorNameTh: string
): string[] {
  const aliases: string[] = [];

  // Brand aliases
  aliases.push(brandName.toLowerCase()); // marbo
  aliases.push(brandNameTh); // มาโบโล่
  aliases.push(simplifyThai(brandNameTh)); // มาโบโล

  // Common misspellings
  if (brandName === 'Marbo') {
    aliases.push('marbolo', 'มาร์โบโล', 'มาโบโล', 'มาโบ', 'marble', 'mobolo');
  }
  if (brandName === 'Mood') {
    aliases.push('มูด', 'หมูด', 'mmods');
  }
  if (brandName === 'Alfa') {
    aliases.push('alpha', 'อัลฟา', 'อาลฟา');
  }
  if (brandName === 'Vplus') {
    aliases.push('v-plus', 'วีพลัส', 'วีพลัส');
  }

  // Flavor aliases
  aliases.push(flavorName.toLowerCase());
  aliases.push(flavorNameTh);
  aliases.push(simplifyThai(flavorNameTh));

  // Combined: brand + flavor
  aliases.push(`${brandName} ${flavorName}`.toLowerCase());
  aliases.push(`${brandNameTh} ${flavorNameTh}`);

  return [...new Set(aliases)]; // ลบซ้ำ
}

// ลบวรรณยุกต์ภาษาไทย เพื่อ fuzzy matching
function simplifyThai(text: string): string {
  return text
    .replace(/[่้๊๋]/g, '') // ลบวรรณยุกต์
    .replace(/[ืึัิีๅํ์]/g, '') // ลบสระบน/ล่าง
    .replace(/ะ/g, 'า') // ะ → า
    .replace(/ๅ/g, 'า'); // ๅ → า
}

// Fuzzy Search Algorithm
export function fuzzySearchProducts(query: string, limit: number = 5): Product[] {
  const normalizedQuery = normalizeQuery(query);

  // คะแนนสำหรับแต่ละ product
  const scores: { product: Product; score: number }[] = [];

  for (const product of productList) {
    const score = calculateScore(normalizedQuery, product);
    if (score > 0) {
      scores.push({ product, score });
    }
  }

  // เรียงตามคะแนน
  scores.sort((a, b) => b.score - a.score);

  return scores.slice(0, limit).map(s => s.product);
}

// Normalize query
function normalizeQuery(text: string): string {
  return simplifyThai(text)
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙\s]/g, '') // เก็บแค่ตัวอักษรและตัวเลข
    .trim();
}

// คำนวณคะแนน
function calculateScore(query: string, product: Product): number {
  let maxScore = 0;

  // ตรวจสอบทุก alias
  for (const alias of product.aliases) {
    const normalizedAlias = normalizeQuery(alias);

    // Exact match
    if (normalizedAlias === query) {
      return 100;
    }

    // Contains
    if (normalizedAlias.includes(query) || query.includes(normalizedAlias)) {
      const score = 80;
      if (score > maxScore) maxScore = score;
      continue;
    }

    // Levenshtein distance
    const distance = levenshteinDistance(query, normalizedAlias);
    const maxLength = Math.max(query.length, normalizedAlias.length);
    const similarity = 1 - (distance / maxLength);

    if (similarity > 0.6) { // 60% ความคล้ายคลึง
      const score = Math.round(similarity * 70);
      if (score > maxScore) maxScore = score;
    }
  }

  return maxScore;
}

// Levenshtein Distance Algorithm
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Parse quantity จากข้อความ
export function parseQuantity(text: string): number {
  // หาตัวเลขในข้อความ
  const numbers = text.match(/\d+/g);
  if (numbers) {
    return parseInt(numbers[0]) || 1;
  }

  // คำที่แทนจำนวน
  if (text.includes('สอง') || text.includes('2ตัว') || text.includes('สองตัว')) {
    return 2;
  }
  if (text.includes('สาม') || text.includes('3ตัว') || text.includes('สามตัว')) {
    return 3;
  }
  if (text.includes('สี่') || text.includes('4ตัว') || text.includes('สี่ตัว')) {
    return 4;
  }
  if (text.includes('ห้า') || text.includes('5ตัว') || text.includes('ห้าตัว')) {
    return 5;
  }
  if (text.includes('ครึ่งโหล') || text.includes('6ตัว')) {
    return 6;
  }
  if (text.includes('โหล') || text.includes('12ตัว')) {
    return 12;
  }

  return 1; // default
}

// ตัวอย่างการใช้งาน
/*
// เมื่อลูกค้าพิมพ์ใน LINE
const userMessage = "มาโบโล บลูเบอร์รี่ 2 ตัว";

// ค้นหาสินค้า
const products = fuzzySearchProducts(userMessage);
// → จะได้ [{ id: 'marbo-blueberry', ... }]

// ดึงจำนวน
const quantity = parseQuantity(userMessage);
// → 2

// ส่ง Quick Reply ให้ลูกค้ายืนยัน
const quickReply = {
  type: 'quickReply',
  items: products.map(p => ({
    type: 'action',
    action: {
      type: 'postback',
      label: `${p.brandNameTh} ${p.flavorNameTh}`,
      data: `order:${p.id}:${quantity}`
    }
  }))
};
*/