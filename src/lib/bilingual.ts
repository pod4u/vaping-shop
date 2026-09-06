/**
 * Bilingual display helpers — show English + Thai names without duplication.
 * 
 * Standards:
 * - Product: English primary, Thai secondary
 * - Brand: English primary, Thai secondary
 * - Category: Thai primary, English secondary
 * - Flavor: Thai primary, English secondary
 * 
 * If either name is missing, show only the available one.
 * If both are identical (case-insensitive, NFKC normalized), show only once.
 */

/**
 * Check if two strings are the same (case-insensitive, NFKC normalized).
 */
function isSameText(a: string, b: string): boolean {
  return a.toLowerCase().normalize("NFKC") === b.toLowerCase().normalize("NFKC");
}

/**
 * Clean a text value: trim and return null if empty.
 */
function cleanText(text: string | null | undefined): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  return trimmed || null;
}

/** "EN · TH" inline — for brands, product names */
export function bilingualName(
  en: string | null | undefined,
  th: string | null | undefined,
  separator = " · "
): string {
  const enClean = cleanText(en);
  const thClean = cleanText(th);

  if (!enClean && !thClean) return "";
  if (!enClean) return thClean!;
  if (!thClean) return enClean;
  if (isSameText(enClean, thClean)) return enClean;

  return `${enClean}${separator}${thClean}`;
}

/** "TH · EN" inline — for categories, flavors */
export function bilingualNameThai(
  th: string | null | undefined,
  en: string | null | undefined,
  separator = " · "
): string {
  const thClean = cleanText(th);
  const enClean = cleanText(en);

  if (!thClean && !enClean) return "";
  if (!thClean) return enClean!;
  if (!enClean) return thClean;
  if (isSameText(thClean, enClean)) return thClean;

  return `${thClean}${separator}${enClean}`;
}

/** Primary (EN) + secondary (TH) — returns { primary, secondary | null } */
export function bilingualPrimary(
  en: string | null | undefined,
  th: string | null | undefined
): { primary: string; secondary: string | null } {
  const enClean = cleanText(en);
  const thClean = cleanText(th);

  if (!enClean && !thClean) return { primary: "", secondary: null };
  if (!enClean) return { primary: thClean!, secondary: null };
  if (!thClean) return { primary: enClean, secondary: null };
  if (isSameText(enClean, thClean)) return { primary: enClean, secondary: null };

  return { primary: enClean, secondary: thClean };
}

/** Primary (TH) + secondary (EN) — for categories, flavors */
export function bilingualPrimaryThai(
  th: string | null | undefined,
  en: string | null | undefined
): { primary: string; secondary: string | null } {
  const thClean = cleanText(th);
  const enClean = cleanText(en);

  if (!thClean && !enClean) return { primary: "", secondary: null };
  if (!thClean) return { primary: enClean!, secondary: null };
  if (!enClean) return { primary: thClean, secondary: null };
  if (isSameText(thClean, enClean)) return { primary: thClean, secondary: null };

  return { primary: thClean, secondary: enClean };
}

/** Format puff count: 20000 → "20,000" */
export function formatPuffs(count: number | null | undefined): string | null {
  if (!count) return null;
  return Number(count).toLocaleString();
}

/** Short puff label: 20000 → "20K" */
export function formatPuffsShort(count: number | null | undefined): string | null {
  if (!count) return null;
  if (count >= 1000 && count % 1000 === 0) return `${count / 1000}K`;
  return Number(count).toLocaleString();
}