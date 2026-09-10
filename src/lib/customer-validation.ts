export class CustomerInputError extends Error {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "CustomerInputError";
    this.field = field;
  }
}

type InputRecord = Record<string, unknown>;

export interface RegistrationInput {
  fullName: string;
  phone: string;
  lineId: string | null;
  email: string | null;
  legacyAddress: string;
  district: string | null;
  subDistrict: string;
  province: string;
  postalCode: string | null;
  shippingAddress: string;
  acceptedMarketing: boolean;
}

export interface CustomerAddressInput {
  recipientName: string;
  phone: string;
  address: string;
  province: string;
  postalCode: string | null;
  isDefault: boolean | null;
}

export interface LineIdentityLinkInput {
  providerUserId: string;
}

export interface MemberProfileInput {
  fullName: string;
  phone: string;
  recipientName: string;
  address: string;
  province: string;
  postalCode: string | null;
}

export interface MemberLoginInput {
  phone: string;
  password: string;
}

export function asInputRecord(value: unknown): InputRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CustomerInputError("รูปแบบข้อมูลไม่ถูกต้อง");
  }
  return value as InputRecord;
}

function requiredString(
  input: InputRecord,
  key: string,
  label: string,
  maxLength: number,
  minLength = 1,
): string {
  const value = input[key];
  if (typeof value !== "string") {
    throw new CustomerInputError(`กรุณากรอก${label}`, key);
  }

  const trimmed = value.trim();
  if (trimmed.length < minLength) {
    throw new CustomerInputError(`กรุณากรอก${label}`, key);
  }
  if (trimmed.length > maxLength) {
    throw new CustomerInputError(`${label}ยาวเกินกำหนด`, key);
  }
  return trimmed;
}

function optionalString(
  input: InputRecord,
  key: string,
  label: string,
  maxLength: number,
): string | null {
  const value = input[key];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new CustomerInputError(`${label}ไม่ถูกต้อง`, key);
  }

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) {
    throw new CustomerInputError(`${label}ยาวเกินกำหนด`, key);
  }
  return trimmed;
}

export function normalizeThaiPhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("66") && digits.length === 11) {
    digits = `0${digits.slice(2)}`;
  }
  if (!/^0\d{9}$/.test(digits)) {
    throw new CustomerInputError("รูปแบบเบอร์โทรไม่ถูกต้อง", "phone");
  }
  return digits;
}

export function parseRegistrationInput(value: unknown): RegistrationInput {
  const input = asInputRecord(value);
  if (input.accepted_terms !== true) {
    throw new CustomerInputError("กรุณายอมรับเงื่อนไขและนโยบายความเป็นส่วนตัว", "accepted_terms");
  }

  const fullName = requiredString(input, "full_name", "ชื่อ-นามสกุล", 120, 2);
  const phone = normalizeThaiPhone(requiredString(input, "phone", "เบอร์โทรศัพท์", 30));
  const lineId = optionalString(input, "line_id", "LINE ID", 100);
  const emailValue = optionalString(input, "email", "อีเมล", 254);
  const legacyAddress = requiredString(input, "address", "ที่อยู่", 500);
  const district = optionalString(input, "district", "เขต/อำเภอ", 100);
  const subDistrict = requiredString(input, "sub_district", "แขวง/ตำบล", 100);
  const province = requiredString(input, "province", "จังหวัด", 100);
  const postalCode = optionalString(input, "postal_code", "รหัสไปรษณีย์", 20);

  const email = emailValue?.toLowerCase() ?? null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new CustomerInputError("รูปแบบอีเมลไม่ถูกต้อง", "email");
  }

  return {
    fullName,
    phone,
    lineId,
    email,
    legacyAddress,
    district,
    subDistrict,
    province,
    postalCode,
    shippingAddress: [legacyAddress, subDistrict, district].filter(Boolean).join(" "),
    acceptedMarketing: input.accepted_marketing === true,
  };
}

export function parseCustomerAddressInput(value: unknown): CustomerAddressInput {
  const input = asInputRecord(value);
  const rawDefault = input.is_default;
  if (
    rawDefault !== undefined &&
    rawDefault !== null &&
    typeof rawDefault !== "boolean"
  ) {
    throw new CustomerInputError("สถานะที่อยู่หลักไม่ถูกต้อง", "is_default");
  }

  return {
    recipientName: requiredString(input, "recipient_name", "ชื่อผู้รับ", 120, 2),
    phone: normalizeThaiPhone(requiredString(input, "phone", "เบอร์โทรศัพท์", 30)),
    address: requiredString(input, "address", "ที่อยู่", 700),
    province: requiredString(input, "province", "จังหวัด", 100),
    postalCode: optionalString(input, "postal_code", "รหัสไปรษณีย์", 20),
    isDefault: typeof rawDefault === "boolean" ? rawDefault : null,
  };
}

export function parseMemberProfileInput(value: unknown): MemberProfileInput {
  const input = asInputRecord(value);
  const postalCode = optionalString(input, "postal_code", "รหัสไปรษณีย์", 5);
  if (postalCode && !/^\d{5}$/.test(postalCode)) {
    throw new CustomerInputError("รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก", "postal_code");
  }

  return {
    fullName: requiredString(input, "full_name", "ชื่อ-นามสกุล", 120, 2),
    phone: normalizeThaiPhone(requiredString(input, "phone", "เบอร์โทรศัพท์", 30)),
    recipientName: requiredString(input, "recipient_name", "ชื่อผู้รับ", 120, 2),
    address: requiredString(input, "address", "ที่อยู่", 700),
    province: requiredString(input, "province", "จังหวัด", 50),
    postalCode,
  };
}

function memberPassword(input: InputRecord, key = "password"): string {
  const value = input[key];
  if (typeof value !== "string" || value.length < 8 || value.length > 72) {
    throw new CustomerInputError("รหัสผ่านต้องมี 8–72 ตัวอักษร", key);
  }
  if (!/\p{L}/u.test(value) || !/\d/.test(value)) {
    throw new CustomerInputError("รหัสผ่านต้องมีทั้งตัวอักษรและตัวเลข", key);
  }
  return value;
}

export function parseMemberLoginInput(value: unknown): MemberLoginInput {
  const input = asInputRecord(value);
  return {
    phone: normalizeThaiPhone(requiredString(input, "phone", "เบอร์โทรศัพท์", 30)),
    password: memberPassword(input),
  };
}

export function parseMemberPasswordInput(value: unknown): string {
  const input = asInputRecord(value);
  const password = memberPassword(input);
  if (input.confirm_password !== password) {
    throw new CustomerInputError("ยืนยันรหัสผ่านไม่ตรงกัน", "confirm_password");
  }
  return password;
}

export function parsePositiveInteger(value: string, label: string): number {
  if (!/^\d+$/.test(value)) throw new CustomerInputError(`${label}ไม่ถูกต้อง`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new CustomerInputError(`${label}ไม่ถูกต้อง`);
  }
  return parsed;
}

export function parseUuid(value: string, label: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new CustomerInputError(`${label}ไม่ถูกต้อง`);
  }
  return value.toLowerCase();
}

export function parseLineProviderUserId(value: unknown): string {
  if (typeof value !== "string") {
    throw new CustomerInputError("LINE user ID ไม่ถูกต้อง", "provider_user_id");
  }
  const trimmed = value.trim();
  if (!/^U[0-9a-f]{32}$/i.test(trimmed)) {
    throw new CustomerInputError("LINE user ID ไม่ถูกต้อง", "provider_user_id");
  }
  return trimmed;
}

export function parseLineIdentityLinkInput(value: unknown): LineIdentityLinkInput {
  const input = asInputRecord(value);
  return {
    providerUserId: parseLineProviderUserId(input.provider_user_id),
  };
}

export function extractLineLinkCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^\s*(?:รหัส\s*)?(\d{6})\s*$/u);
  return match?.[1] ?? null;
}
