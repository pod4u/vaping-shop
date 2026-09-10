export class LineOrderParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LineOrderParseError";
  }
}

export interface ParsedLineOrderItem {
  identifier: string;
  quantity: number;
}

const ORDER_HEADER = "รายการขอเช็กสินค้า Pod4U";
const MAX_MESSAGE_LENGTH = 10_000;
const MAX_ITEMS = 100;

export function parseLineOrderSummary(text: string): ParsedLineOrderItem[] | null {
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  if (!normalized.startsWith(ORDER_HEADER)) return null;
  if (normalized.length > MAX_MESSAGE_LENGTH) {
    throw new LineOrderParseError("ข้อความรายการยาวเกินกำหนด");
  }

  const lines = normalized.split("\n");
  if (lines[0].trim() !== ORDER_HEADER) {
    throw new LineOrderParseError("หัวข้อรายการไม่ถูกต้อง");
  }

  const items: ParsedLineOrderItem[] = [];
  for (let index = 1; index < lines.length; index += 1) {
    const itemMatch = lines[index].match(/^\s*(\d+)\.\s+\[([^\]\r\n]{1,200})\]/);
    if (!itemMatch) continue;

    const expectedNumber = items.length + 1;
    if (Number(itemMatch[1]) !== expectedNumber) {
      throw new LineOrderParseError("ลำดับสินค้าไม่ต่อเนื่อง");
    }

    const quantityLine = lines[index + 1] ?? "";
    const quantityMatch = quantityLine.match(/^\s*จำนวน\s+(\d{1,3})\s+ชิ้น\s*$/);
    if (!quantityMatch) {
      throw new LineOrderParseError(`ไม่พบจำนวนของสินค้ารายการที่ ${expectedNumber}`);
    }

    const identifier = itemMatch[2].trim();
    const quantity = Number(quantityMatch[1]);
    if (!identifier || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999) {
      throw new LineOrderParseError(`สินค้ารายการที่ ${expectedNumber} ไม่ถูกต้อง`);
    }

    items.push({ identifier, quantity });
    index += 1;
  }

  if (items.length < 1 || items.length > MAX_ITEMS) {
    throw new LineOrderParseError("กรุณาส่งรายการสินค้า 1–100 รายการ");
  }

  const totals = new Map<string, number>();
  for (const item of items) {
    const nextQuantity = (totals.get(item.identifier) ?? 0) + item.quantity;
    if (nextQuantity > 999) {
      throw new LineOrderParseError(`จำนวนรวมของ ${item.identifier} เกินกำหนด`);
    }
    totals.set(item.identifier, nextQuantity);
  }

  return [...totals].map(([identifier, quantity]) => ({ identifier, quantity }));
}
