export class OrderInputError extends Error {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "OrderInputError";
    this.field = field;
  }
}

type InputRecord = Record<string, unknown>;

export interface DraftOrderInput {
  customerId: number;
  addressId: string;
  sourceCustomerIdentityId: string | null;
  orderSource: "admin_manual" | "line";
  idempotencyKey: string;
  items: Array<{ product_flavor_id: string; quantity: number }>;
  adminNote: string | null;
}

function asRecord(value: unknown): InputRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new OrderInputError("รูปแบบข้อมูลไม่ถูกต้อง");
  }
  return value as InputRecord;
}

function parseUuidValue(value: unknown, label: string, field: string): string {
  if (
    typeof value !== "string"
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new OrderInputError(`${label}ไม่ถูกต้อง`, field);
  }
  return value.toLowerCase();
}

export function parseOrderId(value: string): string {
  return parseUuidValue(value, "รหัสออเดอร์", "order_id");
}

function parsePositiveIntegerValue(value: unknown, label: string, field: string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new OrderInputError(`${label}ไม่ถูกต้อง`, field);
  }
  return parsed;
}

export function parseDraftOrderInput(value: unknown): DraftOrderInput {
  const input = asRecord(value);
  const orderSource = input.order_source;
  if (orderSource !== "admin_manual" && orderSource !== "line") {
    throw new OrderInputError("ช่องทางออเดอร์ไม่ถูกต้อง", "order_source");
  }

  const sourceIdentity = input.source_customer_identity_id;
  const sourceCustomerIdentityId = sourceIdentity === undefined
    || sourceIdentity === null
    || sourceIdentity === ""
    ? null
    : parseUuidValue(sourceIdentity, "LINE identity", "source_customer_identity_id");

  if (orderSource === "line" && !sourceCustomerIdentityId) {
    throw new OrderInputError(
      "ออเดอร์จาก LINE ต้องเลือกบัญชีที่ยืนยันแล้ว",
      "source_customer_identity_id",
    );
  }

  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 100) {
    throw new OrderInputError("กรุณาเลือกสินค้า 1–100 รายการ", "items");
  }

  const items = input.items.map((value, index) => {
    const item = asRecord(value);
    const quantity = parsePositiveIntegerValue(
      item.quantity,
      `จำนวนสินค้ารายการที่ ${index + 1}`,
      "items",
    );
    if (quantity > 999) {
      throw new OrderInputError("จำนวนสินค้าต่อรายการต้องไม่เกิน 999", "items");
    }
    return {
      product_flavor_id: parseUuidValue(
        item.product_flavor_id,
        `สินค้ารายการที่ ${index + 1}`,
        "items",
      ),
      quantity,
    };
  });

  const adminNote = input.admin_note === undefined
    || input.admin_note === null
    || input.admin_note === ""
    ? null
    : String(input.admin_note).trim();
  if (adminNote && adminNote.length > 1000) {
    throw new OrderInputError("หมายเหตุยาวเกินกำหนด", "admin_note");
  }

  return {
    customerId: parsePositiveIntegerValue(input.customer_id, "รหัสลูกค้า", "customer_id"),
    addressId: parseUuidValue(input.address_id, "ที่อยู่", "address_id"),
    sourceCustomerIdentityId,
    orderSource,
    idempotencyKey: parseUuidValue(input.idempotency_key, "รหัสป้องกันรายการซ้ำ", "idempotency_key"),
    items,
    adminNote,
  };
}

export function parseOrderStatus(value: string | null): string | null {
  if (!value) return null;
  const allowed = ["draft", "pending", "confirmed", "shipped", "delivered", "cancelled"];
  if (!allowed.includes(value)) throw new OrderInputError("สถานะออเดอร์ไม่ถูกต้อง", "status");
  return value;
}
