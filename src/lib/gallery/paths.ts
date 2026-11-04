/**
 * Storage path rules for the "gallery" bucket (pure functions, safe on both
 * server and client):
 *   activities/<category-slug>/<uuid>.webp
 *   activities/<category-slug>/thumbs/<uuid>.webp
 */

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SLUG_MAX = 60;

export const isUuid = (value: unknown): value is string => typeof value === "string" && UUID_RE.test(value);
export const isSlug = (value: unknown): value is string =>
  typeof value === "string" && value.length <= SLUG_MAX && SLUG_RE.test(value);

/** Extensions produced by the uploader (WebP, or JPEG where a browser cannot encode WebP). */
export type UploadExt = "webp" | "jpg";

export const PLACEHOLDER_FILE = ".emptyFolderPlaceholder";
export const THUMBS_DIR = "thumbs";

export function categoryDir(slug: string): string {
  return `activities/${slug}`;
}

/** Paths for one uploaded image (full size + thumbnail share the same file name). */
export function imagePaths(slug: string, id: string, ext: UploadExt = "webp") {
  return {
    full: `${categoryDir(slug)}/${id}.${ext}`,
    thumb: `${categoryDir(slug)}/${THUMBS_DIR}/${id}.${ext}`,
  };
}

/** Last path segment ("activities/a/b.webp" → "b.webp"). */
export function fileName(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? path : path.slice(i + 1);
}

/** Category slug a registered path belongs to, or null if the path is not in the layout. */
export function slugOfPath(path: string): string | null {
  const m = /^activities\/([a-z0-9-]+)\/(?:thumbs\/)?[^/]+$/.exec(path);
  return m ? m[1] : null;
}

const UPLOAD_NAME = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(webp|jpg)$/i;

/**
 * Cache lifetime for gallery files. Names are random UUIDs, so a file never
 * changes; a short lifetime still matters because deleting a photo (e.g. a
 * privacy take-down) only stops cached copies once they expire.
 */
export const GALLERY_CACHE_CONTROL = "86400";

/** UUID file id of an uploader/sync-style file name ("<uuid>.webp" → uuid), else null. */
export function fileIdOf(name: string): string | null {
  const m = UPLOAD_NAME.exec(fileName(name));
  return m ? m[1].toLowerCase() : null;
}

/**
 * Parses a path produced by the browser uploader:
 * activities/<slug>/<uuid>.<webp|jpg> or activities/<slug>/thumbs/<uuid>.<webp|jpg>.
 */
export function parseUploadPath(path: string): { slug: string; fileId: string; ext: UploadExt; thumb: boolean } | null {
  const m = /^activities\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(thumbs\/)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(webp|jpg)$/.exec(
    path,
  );
  return m ? { slug: m[1], fileId: m[3], ext: m[4] as UploadExt, thumb: Boolean(m[2]) } : null;
}

/** Every name an upload reservation may have produced (full + thumbnail, WebP or JPEG). */
export function reservedFilePaths(slug: string, fileId: string): string[] {
  return (["webp", "jpg"] as const).flatMap((ext) => {
    const p = imagePaths(slug, fileId, ext);
    return [p.full, p.thumb];
  });
}

/**
 * Validates a full-size + thumbnail path pair produced by the browser uploader
 * for the given category: same uuid file name, right folders, allowed extension.
 */
export function isUploadPair(slug: string, full: string, thumb: string): boolean {
  const dir = categoryDir(slug);
  if (!full.startsWith(`${dir}/`) || !thumb.startsWith(`${dir}/${THUMBS_DIR}/`)) return false;
  const fullName = full.slice(dir.length + 1);
  const thumbName = thumb.slice(dir.length + THUMBS_DIR.length + 2);
  return UPLOAD_NAME.test(fullName) && fullName === thumbName;
}

/** Same file name in another category's folder (used when an image changes category). */
export function moveTarget(path: string, toSlug: string, thumb = false): string {
  return thumb ? `${categoryDir(toSlug)}/${THUMBS_DIR}/${fileName(path)}` : `${categoryDir(toSlug)}/${fileName(path)}`;
}

/** Scales (w, h) to fit inside a max×max box without enlarging. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
