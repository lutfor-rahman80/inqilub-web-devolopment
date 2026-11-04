import { toAsciiDigits } from "@/lib/format";
import { HOME_STATUS_ORDER, programStatus, type ProgramStatus } from "./status";

/**
 * /programs list filters (pure; unit tested): status tab, category, year and
 * page come from the query string and are validated here.
 */

export const PROGRAMS_PAGE_SIZE = 12;

/** "all" first, then the organization's status order (ongoing → completed → upcoming). */
export const STATUS_TABS = ["all", ...HOME_STATUS_ORDER] as const;
export type StatusTab = (typeof STATUS_TABS)[number];

export const PROGRAM_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const PROGRAM_SLUG_MAX = 80;
export const isProgramSlug = (v: string) => v.length <= PROGRAM_SLUG_MAX && PROGRAM_SLUG_RE.test(v);

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** ?status=ongoing|completed|upcoming|all → tab (anything else → "all"). */
export function parseStatusTab(value: string | string[] | undefined): StatusTab {
  const v = first(value).trim().toLowerCase();
  return (STATUS_TABS as readonly string[]).includes(v) ? (v as StatusTab) : "all";
}

/** ?year=2026 (Bengali digits accepted) → year between 2000 and 2100, else null. */
export function parseYear(value: string | string[] | undefined): number | null {
  const v = toAsciiDigits(first(value).trim());
  if (!/^\d{4}$/.test(v)) return null;
  const n = Number(v);
  return n >= 2000 && n <= 2100 ? n : null;
}

/** ?category=<slug> → slug when well-formed, else null (unknown slugs are resolved by the caller). */
export function parseCategorySlug(value: string | string[] | undefined): string | null {
  const v = first(value).trim().toLowerCase();
  return v && v.length <= 60 && PROGRAM_SLUG_RE.test(v) ? v : null;
}

/** First and last day of a year as YYYY-MM-DD (for starts_on filters). */
export function yearRange(year: number): { from: string; to: string } {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

/** Does a program belong in a tab? (Same rule as the database query; postponed/cancelled only in "all".) */
export function matchesTab(
  p: { starts_on: string; ends_on: string | null; status_override: string | null },
  tab: StatusTab,
  today: string,
): boolean {
  if (tab === "all") return true;
  return programStatus(p, today) === tab;
}

/** Year options for the filter: distinct start years, newest first. */
export function yearsOf(dates: string[]): number[] {
  const years = new Set<number>();
  for (const d of dates) {
    const y = Number(d.slice(0, 4));
    if (Number.isInteger(y) && y >= 2000 && y <= 2100) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}

/** Query string for the list (defaults omitted): ?status=…&category=…&year=…&page=… */
export function programsQuery(f: { status?: StatusTab; category?: string | null; year?: number | null; page?: number }): string {
  const q = new URLSearchParams();
  if (f.status && f.status !== "all") q.set("status", f.status);
  if (f.category) q.set("category", f.category);
  if (f.year) q.set("year", String(f.year));
  if (f.page && f.page > 1) q.set("page", String(f.page));
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** Status values a program can show (for typing badge maps). */
export type { ProgramStatus };
