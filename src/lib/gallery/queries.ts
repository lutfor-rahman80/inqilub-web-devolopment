import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/server";
import { isSlug } from "./paths";
import { PHOTO_COLUMNS, toPhoto, type GalleryPhoto, type PhotoRow } from "./types";

/**
 * Public gallery reads. Everything goes through the cookie-less anonymous
 * client: Row-Level Security only returns published images in active
 * categories, and pages stay cacheable (ISR).
 */

export const GALLERY_PAGE_SIZE = 24;
export const ACTIVITY_PHOTO_LIMIT = 24;

export type ActivityCategory = {
  id: string;
  slug: string;
  name_bn: string;
  summary: string;
  description: string;
  /** Optional English texts (null = not translated; pages fall back to Bengali). */
  name_en: string | null;
  summary_en: string | null;
  description_en: string | null;
  icon: string;
  photoCount: number;
  cover: GalleryPhoto | null;
};

/** Thrown for failed reads; the message never contains database details. */
class GalleryDataError extends Error {
  constructor(what: string, cause: { message?: string } | null) {
    super(`Failed to load ${what}`);
    console.error(`[gallery] ${what}:`, cause?.message);
  }
}

const COVER_COLUMNS = "id, storage_path, thumb_path, width, height, caption, event_date, category_id";
type CoverRow = PhotoRow & { category_id: string };

async function photoCounts(): Promise<Map<string, number>> {
  const { data, error } = await createPublicClient().rpc("category_photo_counts");
  if (error) throw new GalleryDataError("photo counts", error);
  return new Map((data ?? []).map((r) => [r.category_id, Number(r.photo_count) || 0]));
}

type CategoryRow = {
  id: string;
  slug: string;
  name_bn: string;
  summary: string;
  description: string;
  name_en: string | null;
  summary_en: string | null;
  description_en: string | null;
  icon: string;
  cover_image_id: string | null;
};

/** Active categories (display order) with published photo counts — no cover lookups. */
const getCategoryRows = cache(async (): Promise<{ rows: CategoryRow[]; counts: Map<string, number> }> => {
  const [{ data, error }, counts] = await Promise.all([
    createPublicClient()
      .from("activity_categories")
      .select("id, slug, name_bn, summary, description, name_en, summary_en, description_en, icon, cover_image_id")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name_bn", { ascending: true }),
    photoCounts(),
  ]);
  if (error) throw new GalleryDataError("categories", error);
  return { rows: data, counts };
});

function toCategory(c: CategoryRow, counts: Map<string, number>, cover: GalleryPhoto | null = null): ActivityCategory {
  return {
    id: c.id,
    slug: c.slug,
    name_bn: c.name_bn,
    summary: c.summary,
    description: c.description,
    name_en: c.name_en,
    summary_en: c.summary_en,
    description_en: c.description_en,
    icon: c.icon,
    photoCount: counts.get(c.id) ?? 0,
    cover,
  };
}

/** Active categories with photo counts (cover is always null; see getActivityCategoriesWithCovers). */
export const getActivityCategories = cache(async (): Promise<ActivityCategory[]> => {
  const { rows, counts } = await getCategoryRows();
  return rows.map((c) => toCategory(c, counts));
});

/**
 * Active categories with a cover photo: the chosen cover if it is published
 * and belongs to the category, otherwise the category's first published photo.
 */
export const getActivityCategoriesWithCovers = cache(async (): Promise<ActivityCategory[]> => {
  const supabase = createPublicClient();
  const { rows: cats, counts } = await getCategoryRows();

  const covers = new Map<string, GalleryPhoto>();
  const coverIds = cats.map((c) => c.cover_image_id).filter((id): id is string => Boolean(id));
  if (coverIds.length > 0) {
    const { data, error: coverError } = await supabase
      .from("gallery_images")
      .select(COVER_COLUMNS)
      .in("id", coverIds)
      .eq("is_published", true);
    if (coverError) throw new GalleryDataError("category covers", coverError);
    for (const row of (data ?? []) as CoverRow[]) {
      const cat = cats.find((c) => c.cover_image_id === row.id && c.id === row.category_id);
      if (cat) covers.set(cat.id, toPhoto(row));
    }
  }

  const needFallback = cats.filter((c) => !covers.has(c.id) && (counts.get(c.id) ?? 0) > 0);
  const firsts = await Promise.all(
    needFallback.map((c) =>
      supabase
        .from("gallery_images")
        .select(COVER_COLUMNS)
        .eq("category_id", c.id)
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ),
  );
  firsts.forEach(({ data }, i) => {
    if (data) covers.set(needFallback[i].id, toPhoto(data as CoverRow));
  });

  return cats.map((c) => toCategory(c, counts, covers.get(c.id) ?? null));
});

/** One active category by slug (null for unknown/inactive/malformed slugs). */
export const getActivityCategory = cache(async (slug: string): Promise<ActivityCategory | null> => {
  if (!isSlug(slug)) return null;
  const all = await getActivityCategories();
  return all.find((c) => c.slug === slug) ?? null;
});

export type PhotoPage = { items: GalleryPhoto[]; total: number };

/**
 * A page of published photos. With a category: that category's display
 * order (sort_order, then newest). Without: newest first across categories.
 */
export async function getPhotoPage({
  categoryId,
  page = 1,
  pageSize = GALLERY_PAGE_SIZE,
}: {
  categoryId?: string | null;
  page?: number;
  pageSize?: number;
}): Promise<PhotoPage> {
  const from = (Math.max(1, page) - 1) * pageSize;
  const filtered = () => {
    const query = createPublicClient()
      .from("gallery_images")
      .select(PHOTO_COLUMNS, { count: "exact" })
      .eq("is_published", true);
    return categoryId ? query.eq("category_id", categoryId).order("sort_order", { ascending: true }) : query;
  };
  const { data, error, count } = await filtered()
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(from, from + pageSize - 1);
  // PostgREST answers an out-of-range page with 416 (PGRST103) and no count: count separately.
  if (error && error.code === "PGRST103") {
    const { count: total } = await filtered().limit(1);
    return { items: [], total: total ?? 0 };
  }
  if (error) throw new GalleryDataError("photos", error);
  return { items: (data as unknown as PhotoRow[]).map(toPhoto), total: count ?? 0 };
}
