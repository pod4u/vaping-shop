export interface CanonicalStockRow {
  sku: string;
  stock_quantity: number | null;
}

export class StockSheetFormatError extends Error {}

const SKU_HEADERS = new Set(["sku", "รหัสสินค้า", "รหัสsku"]);
const QUANTITY_HEADERS = new Set([
  "stock",
  "stockquantity",
  "currentstock",
  "quantity",
  "qty",
  "คงเหลือ",
  "จำนวนคงเหลือ",
  "จำนวนสต็อก",
  "สต็อก",
]);

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-()]+/gu, "");
}

function parseQuantity(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000 ? value : null;
  }
  if (typeof value !== "string") return null;
  const normalized = value.trim().replaceAll(",", "");
  if (!/^\d+$/u.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed <= 1_000_000 ? parsed : null;
}

export function parseStockSheetValues(values: unknown[][]): CanonicalStockRow[] {
  if (!Array.isArray(values) || values.length < 2) {
    throw new StockSheetFormatError("ชีทไม่มีหัวตารางหรือไม่มีรายการสต็อก");
  }

  let headerIndex = -1;
  let skuColumn = -1;
  let quantityColumn = -1;
  for (let rowIndex = 0; rowIndex < Math.min(values.length, 20); rowIndex += 1) {
    const headers = (values[rowIndex] ?? []).map(normalizeHeader);
    const possibleSku = headers.findIndex((header) => SKU_HEADERS.has(header));
    const possibleQuantity = headers.findIndex((header) => QUANTITY_HEADERS.has(header));
    if (possibleSku >= 0 && possibleQuantity >= 0 && possibleSku !== possibleQuantity) {
      headerIndex = rowIndex;
      skuColumn = possibleSku;
      quantityColumn = possibleQuantity;
      break;
    }
  }

  if (headerIndex < 0) {
    throw new StockSheetFormatError("ไม่พบคอลัมน์ SKU และจำนวนคงเหลือใน 20 แถวแรก");
  }

  const rows: CanonicalStockRow[] = [];
  for (const sourceRow of values.slice(headerIndex + 1)) {
    const skuValue = sourceRow?.[skuColumn];
    const quantityValue = sourceRow?.[quantityColumn];
    const sku = String(skuValue ?? "").trim();
    const isBlankRow = !sku && String(quantityValue ?? "").trim() === "";
    if (isBlankRow) continue;
    rows.push({ sku, stock_quantity: parseQuantity(quantityValue) });
    if (rows.length > 5_000) {
      throw new StockSheetFormatError("ไฟล์มีรายการเกิน 5,000 แถว");
    }
  }

  if (rows.length === 0) throw new StockSheetFormatError("ไม่พบรายการสต็อกใต้หัวตาราง");
  return rows;
}
