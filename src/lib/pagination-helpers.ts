/**
 * Pagination validation helper
 * Accepts only values matching /^[1-9]\d*$/
 * Rejects: 2.5, 2abc, 0, negative, blank, Infinity, NaN, letters
 */

export function parsePositiveInt(
  value: string | null,
  defaultValue: number,
  maxValue?: number,
): number {
  if (value === null || value === "") {
    return defaultValue;
  }

  // Must match positive integer pattern: starts with 1-9, followed by zero or more digits
  if (!/^[1-9]\d*$/.test(value)) {
    return defaultValue;
  }

  const parsed = Number(value);

  // Check for Infinity (which would pass regex but shouldn't be allowed)
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }

  // Apply maximum if specified
  if (maxValue !== undefined && parsed > maxValue) {
    return maxValue;
  }

  return parsed;
}

export function validatePagination(
  pageParam: string | null,
  pageSizeParam: string | null,
): { page: number; pageSize: number } {
  return {
    page: parsePositiveInt(pageParam, 1),
    pageSize: parsePositiveInt(pageSizeParam, 20, 100),
  };
}