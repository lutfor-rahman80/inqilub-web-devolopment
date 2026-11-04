import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/server";
import { PHOTO_COLUMNS, toPhoto, type GalleryPhoto, type PhotoRow } from "@/lib/gallery/types";
import { dhakaToday, type ProgramStatus } from "./status";
import { isProgramSlug, PROGRAMS_PAGE_SIZE, yearRange, yearsOf, type StatusTab } from "./filters";

/** Columns a public program card needs (no internal fields). */
export const PROGRAM_CARD_COLUMNS =
  "id, slug, title_bn, title_en, summary_bn, summary_en, location_bn, location_en, starts_on, ends_on, status_override, category:activity_categories(slug, name_bn, name_en, icon), cover:gallery_images!programs_cover_image_id_fkey(storage_path, thumb_path, width, height, caption)" as const;

/** Thrown for failed reads; the message never contains database details. */
class ProgramsDataError extends Error {
  constructor(what: string, cause: { message?: string } | null) {
    super(`Failed to load ${what}`);
    console.error(`[programs] ${what}:`, cause?.message);
  }
}

/** Published programs with card columns (RLS also hides programs of inactive categories). */
function publishedCards(count = false) {
  return createPublicClient()
    .from("programs")
    .select(PROGRAM_CARD_COLUMNS, count ? { count: "exact" } : undefined)
    .eq("is_published", true);
}
type CardQuery = ReturnType<typeof publishedCards>;

/**
 * Date filters for a computed status (excluding postponed/cancelled), so the
 * database does the work (mirrors programStatus(); see filters.matchesTab):
 *   upcoming  : starts_on > today            (soonest first)
 *   ongoing   : starts_on <= today <= end    (most recent start first)
 *   completed : end < today                  (most recently started first)
 */
function withStatus(q: CardQuery, status: Exclude<ProgramStatus, "postponed" | "cancelled">, today: string): CardQuery {
  q = q.is("status_override", null);
  if (status === "upcoming") return q.gt("starts_on", today).order("starts_on", { ascending: true });
  if (status === "ongoing") {
    return q
      .lte("starts_on", today)
      .or(`ends_on.gte.${today},and(ends_on.is.null,starts_on.eq.${today})`)
      .order("starts_on", { ascending: false });
  }
  return q.or(`ends_on.lt.${today},and(ends_on.is.null,starts_on.lt.${today})`).order("starts_on", { ascending: false });
}

/**
 * Published programs for one computed status (homepage sections): the first
 * `limit` cards plus the total number of published programs with that status
 * (count "exact" on the same filtered query, so the total always matches the
 * cards' status logic — program_status() in Asia/Dhaka).
 */
export async function getProgramsByStatus(status: Exclude<ProgramStatus, "postponed" | "cancelled">, limit = 3) {
  const { data, error, count } = await withStatus(publishedCards(true), status, dhakaToday())
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);
  if (error) throw new ProgramsDataError(`${status} programs`, error);
  const items = data ?? [];
  return { items, total: Math.max(count ?? 0, items.length) };
}
export type ProgramCardRow = Awaited<ReturnType<typeof getProgramsByStatus>>["items"][number];

export type ProgramListFilters = { status: StatusTab; categoryId: string | null; year: number | null; page: number };

/**
 * One page of the public list. "all" also includes postponed/cancelled
 * programs (newest start first); the other tabs use withStatus().
 */
export async function getProgramsPage(
  f: ProgramListFilters,
  pageSize = PROGRAMS_PAGE_SIZE,
): Promise<{ items: ProgramCardRow[]; total: number }> {
  const today = dhakaToday();
  const filtered = () => {
    let q = publishedCards(true);
    if (f.categoryId) q = q.eq("category_id", f.categoryId);
    if (f.year) {
      const { from, to } = yearRange(f.year);
      q = q.gte("starts_on", from).lte("starts_on", to);
    }
    return f.status === "all" ? q.order("starts_on", { ascending: false }) : withStatus(q, f.status, today);
  };
  const start = (Math.max(1, f.page) - 1) * pageSize;
  const { data, error, count } = await filtered()
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true })
    .range(start, start + pageSize - 1);
  // PostgREST answers an out-of-range page with 416 (PGRST103) and no count: count separately.
  if (error && error.code === "PGRST103") {
    const { count: total, error: countError } = await filtered().limit(1);
    if (countError) throw new ProgramsDataError("programs count", countError);
    return { items: [], total: total ?? 0 };
  }
  if (error) throw new ProgramsDataError("programs", error);
  return { items: data ?? [], total: count ?? 0 };
}

/** Years that have published programs (by start date), newest first. */
export const getProgramYears = cache(async (): Promise<number[]> => {
  const { data, error } = await createPublicClient()
    .from("programs")
    .select("starts_on")
    .eq("is_published", true)
    .order("starts_on", { ascending: false })
    .limit(5000);
  if (error) throw new ProgramsDataError("program years", error);
  return yearsOf((data ?? []).map((r) => r.starts_on));
});

export type ProgramCategory = { id: string; slug: string; name_bn: string; name_en: string | null; icon: string };

/** Active categories (display order) for the list filter. */
export const getProgramCategories = cache(async (): Promise<ProgramCategory[]> => {
  const { data, error } = await createPublicClient()
    .from("activity_categories")
    .select("id, slug, name_bn, name_en, icon")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name_bn", { ascending: true });
  if (error) throw new ProgramsDataError("categories", error);
  return data ?? [];
});

const DETAIL_COLUMNS =
  "id, slug, title_bn, title_en, summary_bn, summary_en, body_bn, body_en, location_bn, location_en, starts_on, ends_on, status_override, first_published_at, updated_at, category:activity_categories(id, slug, name_bn, name_en, icon), cover:gallery_images!programs_cover_image_id_fkey(id, storage_path, thumb_path, width, height, caption, is_published)" as const;

/** One published program by slug (null for unknown, unpublished or malformed slugs). */
export const getProgramBySlug = cache(async (slug: string) => {
  if (!isProgramSlug(slug)) return null;
  const { data, error } = await createPublicClient()
    .from("programs")
    .select(DETAIL_COLUMNS)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw new ProgramsDataError("program", error);
  return data;
});
export type ProgramDetail = NonNullable<Awaited<ReturnType<typeof getProgramBySlug>>>;

export const PROGRAM_PHOTO_LIMIT = 60;

/** Published photos linked to a program (display order, then newest). */
export async function getProgramPhotos(programId: string, limit = PROGRAM_PHOTO_LIMIT): Promise<{ items: GalleryPhoto[]; total: number }> {
  const { data, error, count } = await createPublicClient()
    .from("gallery_images")
    .select(PHOTO_COLUMNS, { count: "exact" })
    .eq("program_id", programId)
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(limit);
  if (error) throw new ProgramsDataError("program photos", error);
  return { items: (data as unknown as PhotoRow[]).map(toPhoto), total: count ?? 0 };
}

/**
 * Published programs of one category for its /activities/<slug> page: ongoing
 * and upcoming first (soonest first), then the most recent past ones.
 * Postponed/cancelled programs are included (their cards show the badge).
 */
export async function getProgramsForCategory(categoryId: string, limit = 6): Promise<ProgramCardRow[]> {
  const today = dhakaToday();
  const [current, past] = await Promise.all([
    publishedCards()
      .eq("category_id", categoryId)
      .or(`starts_on.gte.${today},ends_on.gte.${today}`)
      .order("starts_on", { ascending: true })
      .order("id", { ascending: true })
      .limit(limit),
    publishedCards()
      .eq("category_id", categoryId)
      .lt("starts_on", today)
      .or(`ends_on.is.null,ends_on.lt.${today}`)
      .order("starts_on", { ascending: false })
      .order("id", { ascending: true })
      .limit(limit),
  ]);
  if (current.error) throw new ProgramsDataError("category programs", current.error);
  if (past.error) throw new ProgramsDataError("category programs", past.error);
  return [...(current.data ?? []), ...(past.data ?? [])].slice(0, limit);
}

/**
 * Published programs for the sitemap (slug + last change), newest first.
 * For src/app/sitemap.ts: add /programs, /notice and /programs/<slug> in both
 * languages (localePath("bn"|"en", …)) with lastModified = updated_at.
 */
export async function getProgramSitemapEntries(limit = 5000): Promise<{ slug: string; updated_at: string }[]> {
  const { data, error } = await createPublicClient()
    .from("programs")
    .select("slug, updated_at")
    .eq("is_published", true)
    .order("starts_on", { ascending: false })
    .limit(limit);
  if (error) throw new ProgramsDataError("program sitemap", error);
  return data ?? [];
}
