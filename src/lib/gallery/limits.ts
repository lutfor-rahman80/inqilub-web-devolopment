/**
 * Size target for gallery photos (docs/04 §6.2, F8): full-size images are at
 * most 1600px on the long side and about 200 KB for a typical photo (WebP).
 * Shared by the browser upload (compress.ts) and folder sync (sync.ts).
 */
export const FULL_TARGET_BYTES = 200 * 1024;

/** WebP/JPEG qualities tried in order (0–1) until a photo fits the target. */
export const FULL_QUALITIES = [0.8, 0.75, 0.7, 0.65, 0.6, 0.55] as const;

/** Very detailed photos still above target × this factor are scaled down to FALLBACK_DIMENSION. */
export const OVERSIZE_FACTOR = 1.3;
export const FALLBACK_DIMENSION = 1280;
export const FALLBACK_QUALITIES = [0.7, 0.62] as const;
