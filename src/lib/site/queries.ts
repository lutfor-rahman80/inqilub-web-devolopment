import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/server";
import { isUuid } from "./urls";

/**
 * Public-site reads. Everything goes through the cookie-less anonymous client,
 * so Row-Level Security limits results to public data and pages stay cacheable.
 */

export type PublicCategory = {
  id: string;
  slug: string;
  name_bn: string;
  name_en: string | null;
  summary: string;
  summary_en: string | null;
  icon: string;
};

/** A published announcement; the English fields are optional (null = Bengali is shown). */
export type PublicAnnouncement = {
  id: string;
  title: string;
  title_en: string | null;
  body: string;
  body_en: string | null;
  is_pinned: boolean;
  published_at: string | null;
  updated_at: string;
};

/** Thrown for failed reads; the message never contains database details. */
class PublicDataError extends Error {
  constructor(what: string, cause: { message?: string } | null) {
    super(`Failed to load ${what}`);
    console.error(`[site] ${what}:`, cause?.message);
  }
}

const ANNOUNCEMENT_COLUMNS = "id, title, title_en, body, body_en, is_pinned, published_at, updated_at";

export const getActiveCategories = cache(async (): Promise<PublicCategory[]> => {
  const { data, error } = await createPublicClient()
    .from("activity_categories")
    .select("id, slug, name_bn, name_en, summary, summary_en, icon")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name_bn", { ascending: true });
  if (error) throw new PublicDataError("activity categories", error);
  return data;
});

export const ANNOUNCEMENTS_PER_PAGE = 10;

/** One page of published announcements: pinned first, then newest. */
export async function getAnnouncementsPage(page: number): Promise<{ items: PublicAnnouncement[]; total: number }> {
  const from = (page - 1) * ANNOUNCEMENTS_PER_PAGE;
  const { data, error, count } = await createPublicClient()
    .from("announcements")
    .select(ANNOUNCEMENT_COLUMNS, { count: "exact" })
    .eq("is_published", true)
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true })
    .range(from, from + ANNOUNCEMENTS_PER_PAGE - 1);
  // PostgREST answers an out-of-range page with 416 (code PGRST103).
  if (error && error.code === "PGRST103") return { items: [], total: count ?? 0 };
  if (error) throw new PublicDataError("announcements", error);
  return { items: data, total: count ?? 0 };
}

/** A single published announcement, or null for unknown/unpublished/invalid ids. */
export const getAnnouncement = cache(async (id: string): Promise<PublicAnnouncement | null> => {
  if (!isUuid(id)) return null;
  const { data, error } = await createPublicClient()
    .from("announcements")
    .select(ANNOUNCEMENT_COLUMNS)
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw new PublicDataError("announcement", error);
  return data;
});

/** Published announcement ids + dates for the sitemap. */
export async function getAnnouncementSitemapEntries(): Promise<{ id: string; published_at: string | null; updated_at: string }[]> {
  const { data, error } = await createPublicClient()
    .from("announcements")
    .select("id, published_at, updated_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(1000);
  if (error) {
    console.error("[site] sitemap announcements:", error.message);
    return [];
  }
  return data;
}
