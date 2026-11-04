import { bn } from "@/lib/format";
import type { Locale } from "@/i18n/config";
import { galleryUrl, IMAGE_LIMITS } from "@/lib/storage";
import { fitWithin } from "./paths";

/** A photo as rendered by public components (URLs already resolved). */
export type GalleryPhoto = {
  id: string;
  src: string;
  thumb: string;
  width: number;
  height: number;
  thumbWidth: number;
  thumbHeight: number;
  caption: string;
  eventDate: string | null;
  /** `name` is Bengali; `nameEn` the optional English name (null = not translated). */
  category: { slug: string; name: string; nameEn?: string | null } | null;
};

export type PhotoRow = {
  id: string;
  storage_path: string;
  thumb_path: string | null;
  width: number | null;
  height: number | null;
  caption: string;
  event_date: string | null;
  category?: { slug: string; name_bn: string; name_en?: string | null } | null;
};

/** Columns selected for public photo lists (category embedded via its FK). */
export const PHOTO_COLUMNS =
  "id, storage_path, thumb_path, width, height, caption, event_date, category:activity_categories!gallery_images_category_id_fkey(slug, name_bn, name_en)";

export function toPhoto(row: PhotoRow): GalleryPhoto {
  const width = row.width ?? 1600;
  const height = row.height ?? 1200;
  const thumbSize = fitWithin(width, height, IMAGE_LIMITS.thumbMaxDimension);
  const src = galleryUrl(row.storage_path) ?? "";
  return {
    id: row.id,
    src,
    thumb: galleryUrl(row.thumb_path) ?? src,
    width,
    height,
    thumbWidth: row.thumb_path ? thumbSize.width : width,
    thumbHeight: row.thumb_path ? thumbSize.height : height,
    caption: row.caption,
    eventDate: row.event_date,
    category: row.category ? { slug: row.category.slug, name: row.category.name_bn, nameEn: row.category.name_en ?? null } : null,
  };
}

/**
 * Alt text: the caption, or the category name ("<category> — ছবি N" /
 * "<category> — photo N") when there is no caption. Captions are written in
 * Bengali; English pages use the English category name when there is one.
 */
export function photoAlt(photo: GalleryPhoto, index: number, lang: Locale = "bn"): string {
  if (photo.caption) return photo.caption;
  if (lang === "en") {
    const name = photo.category ? photo.category.nameEn?.trim() || photo.category.name : "";
    return name ? `${name} — photo ${index + 1}` : `Photo ${index + 1}`;
  }
  return photo.category ? `${photo.category.name} — ছবি ${bn(index + 1)}` : `ছবি ${bn(index + 1)}`;
}
