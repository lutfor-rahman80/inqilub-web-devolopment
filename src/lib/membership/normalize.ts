import { toAsciiDigits } from "@/lib/format";

/**
 * Input normalisation shared by the browser and the server. Every function is
 * pure (no server-only imports) so the same rules run on both sides.
 */

/** "+880 1712-345678" / "০১৭১২ ৩৪৫৬৭৮" → "01712345678" (other input returned cleaned, for validation). */
export function normalizeMobile(value: string): string {
  let v = toAsciiDigits(value).replace(/[\s\-().‐–—]/g, "");
  if (v.startsWith("+880")) v = v.slice(3);
  else if (v.startsWith("+88")) v = v.slice(3);
  else if (v.startsWith("880") && v.length === 13) v = v.slice(2);
  else if (v.startsWith("88") && v.length === 13) v = v.slice(2);
  return v;
}

/** NID / birth-registration number: Bengali digits → ASCII, spaces and dashes removed. */
export function normalizeIdNumber(value: string): string {
  return toAsciiDigits(value).replace(/[\s\-‐–—.]/g, "");
}

/** Single-line text: whitespace collapsed and trimmed. */
export function cleanLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * A person's name as typed → cleaned line. Two friendly fixes:
 *  - an ASCII colon typed after a Bengali letter becomes the Bengali visarga
 *    ("মো:" → "মোঃ", a very common way of typing "মোঃ");
 *  - a dot directly followed by a letter gets a space ("Md.Abdul" → "Md. Abdul").
 *    This also means a name can never contain a domain such as "example.com"
 *    that mail clients would turn into a link.
 */
export function cleanPersonName(value: string): string {
  return cleanLine(value)
    .replace(/([ঀ-৿])\s*:/g, "$1ঃ")
    .replace(/\.(?=\p{L})/gu, ". ");
}

/** Letters (any script) with their combining marks, ZWJ/ZWNJ, spaces and . - ' ’ only. */
export const PERSON_NAME_CHARS_RE = /^[\p{L}\p{M}‌‍ .'’-]+$/u;

/** Multi-line text (addresses, notes): line breaks kept, extra spaces/blank lines removed. */
export function cleanMultiline(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .filter((line, i, all) => line !== "" || (i > 0 && all[i - 1] !== ""))
    .join("\n")
    .trim();
}

/**
 * Date typed or picked by the user → "YYYY-MM-DD" when it looks like a date.
 * Accepts the native date input value and, for browsers without a date
 * picker, "DD/MM/YYYY" or "DD-MM-YYYY" (Bengali digits allowed).
 */
export function normalizeDateInput(value: string): string {
  const v = toAsciiDigits(value).trim();
  const dmy = v.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  return v;
}

/** True for a real calendar date in "YYYY-MM-DD" form. */
export function isCalendarDate(value: string): boolean {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** Today's date in Bangladesh as "YYYY-MM-DD". */
export function todayInDhaka(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Completed years between a "YYYY-MM-DD" birth date and today (Asia/Dhaka). */
export function ageOn(dob: string, today: string = todayInDhaka()): number | null {
  if (!isCalendarDate(dob) || !isCalendarDate(today)) return null;
  const [by, bm, bd] = dob.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age >= 0 ? age : null;
}

/**
 * Tracking number as typed → canonical "IJS-A-2026-0001": Bengali digits,
 * lower case, spaces and missing/odd dashes are tolerated.
 */
export function normalizeTrackingNo(value: string): string {
  const v = toAsciiDigits(value).toUpperCase().replace(/[\s‐–—−_]/g, (c) => (/\s/.test(c) ? "" : "-"));
  const m = v.match(/^IJS-?A-?(\d{4})-?(\d{4,})$/);
  return m ? `IJS-A-${m[1]}-${m[2]}` : v;
}

/** Member number as typed → canonical "IJS-2026-0001" (same tolerance as tracking numbers). */
export function normalizeMemberNo(value: string): string {
  const v = toAsciiDigits(value).toUpperCase().replace(/[\s‐–—−_]/g, (c) => (/\s/.test(c) ? "" : "-"));
  const m = v.match(/^IJS-?(\d{4})-?(\d{4,})$/);
  return m ? `IJS-${m[1]}-${m[2]}` : v;
}

export const TRACKING_NO_RE = /^IJS-A-\d{4}-\d{4,}$/;
export const MEMBER_NO_RE = /^IJS-\d{4}-\d{4,}$/;
export const BD_MOBILE_RE = /^01[3-9]\d{8}$/;

/**
 * Search text for PostgREST `ilike`: LIKE wildcards (% and _) and the escape
 * character are escaped, PostgREST's own wildcard (*) and the characters that
 * delimit `or=(...)` filters are dropped, length is capped.
 */
export function cleanSearch(value: string | string[] | undefined | null, max = 80): string {
  const raw = Array.isArray(value) ? value[0] ?? "" : value ?? "";
  return raw
    .replace(/[*,()"'`:;\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();
}

/** Escapes LIKE wildcards in an already-cleaned search string. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** `%term%` for `.ilike()` (cleaned and escaped). Returns null for an empty search. */
export function ilikePattern(value: string | string[] | undefined | null): string | null {
  const q = cleanSearch(value);
  return q ? `%${escapeLike(q)}%` : null;
}

/** Positive integer from a query-string value (ASCII or Bengali digits), else the fallback. */
export function parsePositiveInt(value: string | string[] | undefined, fallback = 1, max = 100000): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return fallback;
  const ascii = toAsciiDigits(raw.trim());
  if (!/^\d{1,7}$/.test(ascii)) return fallback;
  const n = Number(ascii);
  return n >= 1 && n <= max ? n : fallback;
}
