import { toAsciiDigits } from "@/lib/format";

/**
 * Pure input-normalisation helpers for the admin panel (shared by browser
 * and server code; no server-only imports).
 */

/** Single-line text: whitespace collapsed and trimmed. */
export function oneLine(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

/** Multi-line text: CRLF → LF, trailing spaces removed, 3+ blank lines collapsed to one blank line. */
export function multiLine(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Bangladeshi phone as typed → digits only, +880/880 prefix → 0 ("+880 1712-345678" → "01712345678"). */
export function normalizePhone(value: string): string {
  let v = toAsciiDigits(value).replace(/[\s\-().‐–—]/g, "");
  if (v.startsWith("+880")) v = `0${v.slice(4)}`;
  else if (v.startsWith("880") && v.length >= 12) v = `0${v.slice(3)}`;
  else if (v.startsWith("+88")) v = v.slice(3);
  return v;
}

export const BD_MOBILE_RE = /^01[3-9]\d{8}$/;
/** Landline / IP phone: 0 + area code + number, 9–11 digits in all (mobile prefixes 01x excluded). */
export const BD_LANDLINE_RE = /^0[2-9]\d{7,9}$/;

export function isBdPhone(value: string): boolean {
  return BD_MOBILE_RE.test(value) || BD_LANDLINE_RE.test(value);
}

/** Latin role key from free text: "Vice President" → "vice_president". */
export function slugifyRoleKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\x00-\x7f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^[^a-z]+/, "")
    .replace(/_+$/g, "")
    .replace(/_{2,}/g, "_")
    .slice(0, 41)
    .replace(/_+$/g, "");
}

export const ROLE_KEY_RE = /^[a-z][a-z0-9_]{1,40}$/;

/**
 * Map URL as pasted: either the embed URL itself or Google Maps' whole
 * "<iframe src=…>" snippet (the src is extracted).
 */
export function extractMapUrl(value: string): string {
  const v = value.trim();
  const m = v.match(/<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i);
  return (m ? m[1] : v).replace(/&amp;/g, "&").trim();
}

/** https://www.google.com/maps/embed… only (anything else could embed a foreign page). */
export function isMapEmbedUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "www.google.com" &&
      !url.username &&
      !url.password &&
      !url.port &&
      url.pathname.startsWith("/maps/embed")
    );
  } catch {
    return false;
  }
}

/** https://facebook.com/…, https://www.facebook.com/… or https://m.facebook.com/… with a path. */
export function isFacebookUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      /^(?:www\.|m\.)?facebook\.com$/i.test(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.port &&
      url.pathname.length > 1
    );
  } catch {
    return false;
  }
}

/** Positive integer from a query-string value (ASCII or Bengali digits), else the fallback. */
export function parsePageParam(value: string | string[] | undefined, fallback = 1, max = 100000): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return fallback;
  const ascii = toAsciiDigits(raw.trim());
  if (!/^\d{1,7}$/.test(ascii)) return fallback;
  const n = Number(ascii);
  return n >= 1 && n <= max ? n : fallback;
}

/** First value of a query-string parameter. */
export function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: unknown): value is string => typeof value === "string" && UUID_RE.test(value);

/**
 * A UUID in its canonical (lower-case) spelling, else null. Postgres and Auth
 * accept any letter case, so ids from requests must be canonicalised before
 * they are compared with ids we hold (e.g. "is this my own account?").
 */
export function canonicalUuid(value: unknown): string | null {
  return isUuid(value) ? value.toLowerCase() : null;
}

/** "YYYY-MM-DD" that is a real calendar date. */
export function isIsoDate(value: string): boolean {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** Start of a Bangladesh calendar day as a UTC ISO timestamp (Asia/Dhaka is UTC+6, no DST). */
export function dhakaDayStart(date: string): string {
  return new Date(`${date}T00:00:00+06:00`).toISOString();
}

/** Start of the NEXT Bangladesh calendar day (exclusive upper bound). */
export function dhakaDayEnd(date: string): string {
  return new Date(new Date(`${date}T00:00:00+06:00`).getTime() + 24 * 3600 * 1000).toISOString();
}
