export const GHANA_TIME_ZONE = 'Africa/Accra';
const CLOCK_OFFSET_STORAGE_KEY = 'sst_ghana_clock_offset_ms';

let cachedOffsetMs: number | null = null;
let syncInFlight: Promise<number> | null = null;

function readStoredOffsetMs(): number {
  if (cachedOffsetMs !== null) return cachedOffsetMs;
  try {
    const raw = localStorage.getItem(CLOCK_OFFSET_STORAGE_KEY);
    if (raw !== null) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        cachedOffsetMs = parsed;
        return parsed;
      }
    }
  } catch {
    // Ignore storage errors
  }
  cachedOffsetMs = 0;
  return 0;
}

function saveStoredOffsetMs(offsetMs: number): void {
  cachedOffsetMs = offsetMs;
  try {
    localStorage.setItem(CLOCK_OFFSET_STORAGE_KEY, String(Math.round(offsetMs)));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Returns the current Date corrected against server UTC time so Ghana time
 * stays accurate even if the device's local OS timezone/clock is misconfigured.
 */
export function getGhanaNow(): Date {
  return new Date(Date.now() + readStoredOffsetMs());
}

/**
 * Syncs the Ghana clock offset using the server's HTTP Date response header
 * (persisted in localStorage so it remains accurate in offline mode).
 */
export async function syncGhanaClock(): Promise<number> {
  if (typeof window === 'undefined' || typeof navigator !== 'undefined' && !navigator.onLine) {
    return readStoredOffsetMs();
  }
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    try {
      const t0 = Date.now();
      let res = await fetch(`/?__ghana_time=${t0}`, {
        method: 'HEAD',
        cache: 'no-store',
      });
      let t1 = Date.now();
      let dateHeader = res.headers.get('date');

      if (!dateHeader) {
        const t2 = Date.now();
        res = await fetch(`/icon.svg?__ghana_time=${t2}`, {
          method: 'GET',
          cache: 'no-store',
        });
        t1 = Date.now();
        dateHeader = res.headers.get('date');
      }

      if (dateHeader) {
        const serverMs = Date.parse(dateHeader);
        if (!isNaN(serverMs)) {
          // Account for half the HTTP round-trip; if within 15s of device clock, treat offset as 0
          const approxServerNow = serverMs + (t1 - t0) / 2;
          const rawOffset = approxServerNow - t1;
          const nextOffset = Math.abs(rawOffset) > 15_000 ? rawOffset : 0;
          const prevOffset = readStoredOffsetMs();
          saveStoredOffsetMs(nextOffset);
          if (Math.abs(nextOffset - prevOffset) > 1000) {
            window.dispatchEvent(new Event('ghana-time-synced'));
          }
          return nextOffset;
        }
      }
    } catch {
      // Ignore network errors (offline)
    } finally {
      syncInFlight = null;
    }
    return readStoredOffsetMs();
  })();

  return syncInFlight;
}

function toValidDate(input?: Date | string | number): Date {
  if (input === undefined || input === null) {
    return getGhanaNow();
  }
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? getGhanaNow() : input;
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    // Anchor bare YYYY-MM-DD strings to midday UTC so day formatting never shifts
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return new Date(`${trimmed}T12:00:00.000Z`);
    }
    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? getGhanaNow() : parsed;
  }
  const parsed = new Date(input);
  return isNaN(parsed.getTime()) ? getGhanaNow() : parsed;
}

function getGhanaParts(date: Date): Record<string, string> {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: GHANA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') {
      parts[part.type] = part.value;
    }
  }
  if (parts.hour === '24') {
    parts.hour = '00';
  }
  return parts;
}

/**
 * Returns YYYY-MM-DD in Ghana time (Africa/Accra).
 */
export function getGhanaDateKey(input?: Date | string | number): string {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
  }
  const d = toValidDate(input);
  const p = getGhanaParts(d);
  return `${p.year}-${p.month}-${p.day}`;
}

export function getGhanaYear(input?: Date | string | number): string {
  const d = toValidDate(input);
  return getGhanaParts(d).year;
}

export function getGhanaHour(input?: Date | string | number): number {
  const d = toValidDate(input);
  return Number(getGhanaParts(d).hour || 0);
}

/**
 * Formats a date as "MMM dd, yyyy" in Ghana time (Africa/Accra).
 */
export function formatGhanaDate(input?: Date | string | number): string {
  const d = toValidDate(input);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: GHANA_TIME_ZONE,
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Formats "h:mm AM/PM" in Ghana time (Africa/Accra).
 */
export function formatGhanaShortTime(input?: Date | string | number): string {
  const d = toValidDate(input);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: GHANA_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/**
 * Formats a date & time as "MMM dd, yyyy{separator}h:mm AM/PM" in Ghana time (Africa/Accra).
 */
export function formatGhanaDateTime(
  input?: Date | string | number,
  separator = ' '
): string {
  const d = toValidDate(input);
  return `${formatGhanaDate(d)}${separator}${formatGhanaShortTime(d)}`;
}

/**
 * Formats "yyyy-MM-dd hh:mm AM/PM" in Ghana time for thermal & printed receipts.
 */
export function formatGhanaReceiptDateTime(input?: Date | string | number): string {
  const d = toValidDate(input);
  const p = getGhanaParts(d);
  return `${p.year}-${p.month}-${p.day} ${formatGhanaShortTime(d)}`;
}

/**
 * Formats "hh:mm:ss AM/PM" in Ghana time (Africa/Accra).
 */
export function formatGhanaTime(input?: Date | string | number): string {
  const d = toValidDate(input);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: GHANA_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(d);
}

/**
 * Returns milliseconds remaining until the next 00:00:00 in Ghana (Africa/Accra).
 */
export function getMsUntilNextGhanaMidnight(now: Date = getGhanaNow()): number {
  const p = getGhanaParts(now);
  const hours = Number(p.hour || 0);
  const minutes = Number(p.minute || 0);
  const seconds = Number(p.second || 0);
  const elapsedTodayMs =
    ((hours * 60 + minutes) * 60 + seconds) * 1000 + now.getMilliseconds();
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(1000, dayMs - elapsedTodayMs);
}
