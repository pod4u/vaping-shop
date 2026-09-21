import "server-only";

import { APP_URL } from "@/lib/seo";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const INDEXNOW_KEY_PATTERN = /^[A-Za-z0-9-]{8,128}$/;
const MAX_URLS_PER_REQUEST = 10_000;

export class IndexNowError extends Error {
  constructor(message: string, public readonly status = 500) {
    super(message);
    this.name = "IndexNowError";
  }
}

export function getIndexNowKey(): string | null {
  const key = process.env.INDEXNOW_KEY?.trim();
  return key && INDEXNOW_KEY_PATTERN.test(key) ? key : null;
}

export function getIndexNowKeyLocation(): string {
  return new URL("/indexnow-key.txt", APP_URL).toString();
}

export function normalizeIndexNowUrls(input: unknown): string[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new IndexNowError("กรุณาระบุ URL ที่เพิ่ม แก้ไข หรือลบอย่างน้อย 1 URL", 400);
  }
  if (input.length > MAX_URLS_PER_REQUEST) {
    throw new IndexNowError(`ส่งได้ไม่เกิน ${MAX_URLS_PER_REQUEST.toLocaleString()} URL ต่อครั้ง`, 400);
  }

  const siteOrigin = new URL(APP_URL).origin;
  const urls = input.map((value) => {
    if (typeof value !== "string") {
      throw new IndexNowError("URL ทุกรายการต้องเป็นข้อความ", 400);
    }
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new IndexNowError(`URL ไม่ถูกต้อง: ${value}`, 400);
    }
    if (url.origin !== siteOrigin) {
      throw new IndexNowError(`ส่งได้เฉพาะ URL ของ ${siteOrigin}`, 400);
    }
    return url.toString();
  });

  return [...new Set(urls)];
}

export async function submitIndexNow(input: unknown) {
  const key = getIndexNowKey();
  if (!key) {
    throw new IndexNowError("ยังไม่ได้ตั้งค่า INDEXNOW_KEY หรือรูปแบบ key ไม่ถูกต้อง", 503);
  }

  const urlList = normalizeIndexNowUrls(input);
  const site = new URL(APP_URL);
  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: site.host,
      key,
      keyLocation: getIndexNowKeyLocation(),
      urlList,
    }),
    cache: "no-store",
  });

  if (!response.ok && response.status !== 202) {
    const message = response.status === 403
      ? "IndexNow ตรวจไม่พบ key ที่เว็บไซต์"
      : response.status === 429
        ? "ส่ง URL ถี่เกินไป กรุณารอแล้วลองใหม่"
        : `IndexNow ตอบกลับด้วยสถานะ ${response.status}`;
    throw new IndexNowError(message, response.status);
  }

  return { accepted: urlList.length, status: response.status };
}
