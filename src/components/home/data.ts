import "server-only";
import { createPublicClient } from "@/lib/supabase/server";
import { PHOTO_COLUMNS, toPhoto, type GalleryPhoto, type PhotoRow } from "@/lib/gallery/types";
import { HERO_SLIDES_LIMIT, inHeroOrder } from "@/lib/gallery/hero";
import { getProgramsByStatus, type ProgramCardRow } from "@/lib/programs/queries";
import { HOME_STATUS_ORDER } from "@/lib/programs/status";
import type { HomeProgramSection as HomeProgramSectionOf } from "@/lib/programs/home-sections";
import type { HeroPhoto } from "./hero-slides";

/**
 * Homepage reads (cookie-less anonymous client: RLS only returns published
 * rows in active categories, and the page stays cacheable). None of these
 * throw — a failed optional section is hidden instead of breaking the page.
 */

/** Without featured photos the slider shows the latest published ones (as many as it ever shows). */
export const HERO_FALLBACK_LIMIT = HERO_SLIDES_LIMIT;

/**
 * Hero photos also carry the program they are linked to (gallery_images.program_id),
 * for the caption and the "view this activity" link. The anonymous client only
 * sees published programs of active categories (RLS), so the embed is null for
 * any other program; toHeroPhoto() checks is_published once more.
 */
const HERO_PHOTO_COLUMNS = `${PHOTO_COLUMNS}, program:programs!gallery_images_program_id_fkey(slug, title_bn, title_en, starts_on, ends_on, is_published)`;

type HeroPhotoRow = PhotoRow & {
  program: { slug: string; title_bn: string; title_en: string | null; starts_on: string; ends_on: string | null; is_published: boolean } | null;
};

function toHeroPhoto(row: HeroPhotoRow): HeroPhoto {
  const p = row.program;
  return {
    ...toPhoto(row),
    program: p && p.is_published ? { slug: p.slug, titleBn: p.title_bn, titleEn: p.title_en, startsOn: p.starts_on, endsOn: p.ends_on } : null,
  };
}

export type HeroSlides = { photos: HeroPhoto[]; source: "featured" | "latest" } | null;

/** Hero slider photos: featured first; otherwise the latest published; null when the read failed. */
export async function getHeroSlides(): Promise<HeroSlides> {
  const supabase = createPublicClient();
  const published = () => supabase.from("gallery_images").select(HERO_PHOTO_COLUMNS).eq("is_published", true);
  // Marked photos in display order, at most HERO_SLIDES_LIMIT (src/lib/gallery/hero.ts; the admin gallery shows the same).
  const featured = await inHeroOrder(published().eq("is_featured", true)).limit(HERO_SLIDES_LIMIT);
  if (featured.error) {
    console.error("[home] hero photos:", featured.error.message);
    return null;
  }
  if (featured.data.length > 0) {
    return { photos: (featured.data as unknown as HeroPhotoRow[]).map(toHeroPhoto), source: "featured" };
  }
  const latest = await published()
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(HERO_FALLBACK_LIMIT);
  if (latest.error) {
    console.error("[home] hero photos (latest):", latest.error.message);
    return null;
  }
  return { photos: (latest.data as unknown as HeroPhotoRow[]).map(toHeroPhoto), source: "latest" };
}

/** Newest published photos across categories (null when the read failed). */
export async function getLatestPhotos(limit: number): Promise<GalleryPhoto[] | null> {
  const { data, error } = await createPublicClient()
    .from("gallery_images")
    .select(PHOTO_COLUMNS)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[home] latest photos:", error.message);
    return null;
  }
  return (data as unknown as PhotoRow[]).map(toPhoto);
}

export type HomeAnnouncement = {
  id: string;
  title: string;
  title_en: string | null;
  body: string;
  body_en: string | null;
  is_pinned: boolean;
  published_at: string | null;
};

/** Latest published announcements (pinned first), with the optional English fields. */
export async function getHomeAnnouncements(limit = 3): Promise<HomeAnnouncement[]> {
  const { data, error } = await createPublicClient()
    .from("announcements")
    .select("id, title, title_en, body, body_en, is_pinned, published_at")
    .eq("is_published", true)
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[home] announcements:", error.message);
    return [];
  }
  return data;
}

export type { HomeProgramStatus } from "@/lib/programs/home-sections";
export type HomeProgramSection = HomeProgramSectionOf<ProgramCardRow>;

/**
 * The three program sections in the organization's order (ongoing → completed
 * → upcoming): up to `limit` cards each plus the total number of published
 * programs with that status. A failed read leaves that section empty (hidden).
 */
export async function getHomeProgramSections(limit = 3): Promise<HomeProgramSection[]> {
  return Promise.all(
    HOME_STATUS_ORDER.map(async (status) => {
      try {
        return { status, ...(await getProgramsByStatus(status, limit)) };
      } catch (e) {
        console.error(`[home] ${status} programs:`, e instanceof Error ? e.message : e);
        return { status, items: [], total: 0 };
      }
    }),
  );
}
