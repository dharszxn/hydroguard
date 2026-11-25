/**
 * HYDROGUARD Centralized Date & Time Utility
 * Timezone: Asia/Kolkata (Indian Standard Time - IST, UTC+05:30)
 * Format: DD/MM/YYYY, HH:mm:ss IST (24-hour time)
 */

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Normalizes input date string/number/Date to ensure UTC timestamps
 * without timezone designators are properly interpreted as UTC.
 */
function parseToUTCDate(dateInput: string | Date | number | null | undefined): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }

  let str = String(dateInput).trim();
  if (!str) return null;

  // If string is purely ISO without timezone info (e.g., '2026-11-24 15:55:33' or '2026-11-24T15:55:33')
  // attach 'Z' because the backend SQLite datetimes are authoritative UTC records.
  if (!str.includes('Z') && !str.includes('+') && !/[-+]\d{2}:\d{2}$/.test(str)) {
    if (str.includes(' ') && !str.includes('T')) {
      str = str.replace(' ', 'T') + 'Z';
    } else if (str.includes('T')) {
      str = str + 'Z';
    }
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formats a timestamp into authoritative IST: "DD/MM/YYYY, HH:mm:ss IST"
 * If timestamp has not occurred or is null/empty, returns "Not yet recorded".
 */
export function formatIST(
  dateInput: string | Date | number | null | undefined,
  fallback: string = 'Not yet recorded'
): string {
  const d = parseToUTCDate(dateInput);
  if (!d) return fallback;

  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: IST_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(d);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

    const day = getPart('day');
    const month = getPart('month');
    const year = getPart('year');
    const hour = getPart('hour');
    const minute = getPart('minute');
    const second = getPart('second');

    return `${day}/${month}/${year}, ${hour}:${minute}:${second} IST`;
  } catch (e) {
    return fallback;
  }
}

/**
 * Formats a timestamp into IST Time-only: "HH:mm:ss IST" (24-hour time)
 */
export function formatISTTimeOnly(
  dateInput: string | Date | number | null | undefined,
  fallback: string = 'Not yet recorded'
): string {
  const d = parseToUTCDate(dateInput);
  if (!d) return fallback;

  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: IST_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(d);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

    const hour = getPart('hour');
    const minute = getPart('minute');
    const second = getPart('second');

    return `${hour}:${minute}:${second} IST`;
  } catch (e) {
    return fallback;
  }
}

/**
 * Formats a timestamp into IST Date-only: "DD/MM/YYYY"
 */
export function formatISTDateOnly(
  dateInput: string | Date | number | null | undefined,
  fallback: string = 'Not yet recorded'
): string {
  const d = parseToUTCDate(dateInput);
  if (!d) return fallback;

  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: IST_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const parts = formatter.formatToParts(d);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

    const day = getPart('day');
    const month = getPart('month');
    const year = getPart('year');

    return `${day}/${month}/${year}`;
  } catch (e) {
    return fallback;
  }
}

