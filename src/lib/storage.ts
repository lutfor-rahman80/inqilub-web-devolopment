import { SUPABASE_URL } from "@/lib/env";

export const GALLERY_BUCKET = "gallery";
export const MEMBERS_BUCKET = "members";

/** Public CDN URL for an object in a public bucket. */
export function publicUrl(bucket: string, path: string | null | undefined): string | null {
  if (!path) return null;
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encoded}`;
}

export const galleryUrl = (path: string | null | undefined) => publicUrl(GALLERY_BUCKET, path);
export const memberPhotoUrl = (path: string | null | undefined) => publicUrl(MEMBERS_BUCKET, path);

/** Folder for a category: activities/<slug>/ ; thumbnails in activities/<slug>/thumbs/ */
export const categoryFolder = (slug: string) => `activities/${slug}`;
export const categoryThumbFolder = (slug: string) => `activities/${slug}/thumbs`;

export const IMAGE_LIMITS = {
  acceptedTypes: ["image/jpeg", "image/png", "image/webp"],
  maxInputBytes: 10 * 1024 * 1024, // before browser-side compression
  fullMaxDimension: 1600,
  thumbMaxDimension: 480,
  memberPhotoMaxDimension: 600,
  maxFilesPerUpload: 30,
} as const;
