import "server-only";

import { createHash, createSign } from "node:crypto";
import { parseStockSheetValues, type CanonicalStockRow } from "@/lib/stock-import-parser";

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  error_description?: string;
}

interface GoogleSheetResponse {
  values?: unknown[][];
  error?: { message?: string };
}

let cachedAccessToken: { value: string; expiresAt: number } | null = null;

function base64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function getGoogleAccessToken(): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.value;
  }

  const email = requiredEnvironment("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKey = requiredEnvironment("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY").replaceAll("\\n", "\n");
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: issuedAt,
    exp: issuedAt + 3600,
  }));
  const unsignedToken = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const assertion = `${unsignedToken}.${signer.sign(privateKey, "base64url")}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });
  const result = await response.json() as GoogleTokenResponse;
  if (!response.ok || !result.access_token) {
    throw new Error(result.error_description || "Google service account authentication failed");
  }
  cachedAccessToken = {
    value: result.access_token,
    expiresAt: Date.now() + Math.max(60, result.expires_in ?? 3600) * 1000,
  };
  return result.access_token;
}

export async function fetchGoogleStockSheet(): Promise<{
  rows: CanonicalStockRow[];
  checksum: string;
  sourceReference: string;
}> {
  const spreadsheetId = requiredEnvironment("GOOGLE_STOCK_SPREADSHEET_ID");
  const range = process.env.GOOGLE_STOCK_SHEET_RANGE?.trim() || "01_PRODUCTS!A:T";
  const token = await getGoogleAccessToken();
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`,
  );
  url.searchParams.set("majorDimension", "ROWS");
  url.searchParams.set("valueRenderOption", "FORMATTED_VALUE");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const result = await response.json() as GoogleSheetResponse;
  if (!response.ok) throw new Error(result.error?.message || "Google Sheets read failed");

  const rows = parseStockSheetValues(result.values ?? []);
  const checksum = createHash("sha256").update(JSON.stringify(rows)).digest("hex");
  return {
    rows,
    checksum,
    sourceReference: `google-sheet:${spreadsheetId}:${range}`,
  };
}
