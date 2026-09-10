/**
 * Pure functions for Bangkok timezone calculations.
 * Bangkok is UTC+7 with no DST.
 * All calculations are independent of host/server timezone.
 */

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Get Bangkok calendar date components from a timestamp.
 * Uses getUTC* methods to avoid host timezone dependency.
 */
export function getBangkokDateComponents(
  date: Date | string,
): {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hours: number; // 0-23
  minutes: number; // 0-59
} {
  const d = typeof date === "string" ? new Date(date) : date;
  // Date.getTime() is always absolute UTC - no timezone offset needed
  const bangkok = new Date(d.getTime() + BANGKOK_OFFSET_MS);
  return {
    year: bangkok.getUTCFullYear(),
    month: bangkok.getUTCMonth() + 1,
    day: bangkok.getUTCDate(),
    hours: bangkok.getUTCHours(),
    minutes: bangkok.getUTCMinutes(),
  };
}

/**
 * Get the next scheduled run at 03:00 Bangkok time.
 * Schedule is always 03:00 Bangkok (20:00 UTC previous day).
 *
 * Rules:
 * - Before 03:00 Bangkok today → next run is today 03:00 Bangkok
 * - At or after 03:00 Bangkok today → next run is tomorrow 03:00 Bangkok
 *
 * Returns ISO UTC timestamp.
 */
export function getNextScheduledRun(now: Date = new Date()): string {
  const { year, month, day, hours, minutes } = getBangkokDateComponents(now);

  // Today's 03:00 Bangkok in UTC
  const today03Bangkok = Date.UTC(year, month - 1, day, 3, 0, 0, 0);
  const today03Utc = today03Bangkok - BANGKOK_OFFSET_MS;

  // Current time in Bangkok as ms since epoch
  const nowBangkokMs = now.getTime() + BANGKOK_OFFSET_MS;

  // Before 03:00 Bangkok today → next run is today 03:00 Bangkok
  if (nowBangkokMs < today03Bangkok) {
    return new Date(today03Utc).toISOString();
  }

  // At or after 03:00 Bangkok today → next run is tomorrow 03:00 Bangkok
  const tomorrow03Bangkok = Date.UTC(year, month - 1, day + 1, 3, 0, 0, 0);
  const tomorrow03Utc = tomorrow03Bangkok - BANGKOK_OFFSET_MS;
  return new Date(tomorrow03Utc).toISOString();
}

/**
 * Check if it's currently before 03:30 Bangkok time.
 */
export function isBeforeBangkok0330(now: Date = new Date()): boolean {
  const { hours, minutes } = getBangkokDateComponents(now);
  if (hours < 3) return true;
  if (hours === 3 && minutes < 30) return true;
  return false;
}

/**
 * Check if a successful run timestamp is on the current Bangkok calendar date.
 * Any success on the current Bangkok day (including at 03:01, 03:02) counts.
 */
export function isSuccessOnCurrentBangkokDay(
  successStartedAt: string,
  now: Date = new Date(),
): boolean {
  const nowComps = getBangkokDateComponents(now);
  const successComps = getBangkokDateComponents(successStartedAt);
  return (
    nowComps.year === successComps.year &&
    nowComps.month === successComps.month &&
    nowComps.day === successComps.day
  );
}

/**
 * Check if there is no successful run after 03:30 Bangkok for the current operating day.
 *
 * Rules:
 * - Before 03:30 Bangkok → do NOT show the warning
 * - At or after 03:30 Bangkok → show warning if no success on current Bangkok day
 */
export function shouldShowNoSuccessAfter0330Warning(
  lastSuccessfulRun: { started_at: string } | null,
  now: Date = new Date(),
): boolean {
  // Before 03:30 Bangkok → no deadline warning
  if (isBeforeBangkok0330(now)) return false;

  // At or after 03:30 Bangkok → check if there's a success today
  if (!lastSuccessfulRun) return true;
  return !isSuccessOnCurrentBangkokDay(lastSuccessfulRun.started_at, now);
}

/**
 * Format a timestamp for display in Bangkok timezone.
 */
export function formatBangkokDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}