import { safeHttpsUrl } from "@/lib/site/urls";

/**
 * YouTube helpers for press items (pure; unit tested). A video id is only
 * ever taken from an https YouTube address and must match the 11-character
 * id format, so nothing else can reach the thumbnail or embed URLs.
 */

export const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTS = /^(?:(?:www|m|music)\.)?youtube\.com$|^(?:www\.)?youtube-nocookie\.com$/i;
const SHORT_HOST = /^(?:www\.)?youtu\.be$/i;

/**
 * The video id of a YouTube link, or null. Accepts
 *   youtube.com/watch?v=<id>, youtu.be/<id>, youtube.com/shorts/<id>,
 *   youtube.com/embed/<id>, youtube.com/live/<id> (also m./www./nocookie hosts).
 */
export function youtubeId(value: string | null | undefined): string | null {
  const safe = safeHttpsUrl(value);
  if (!safe) return null;
  const url = new URL(safe);
  let id: string | null = null;
  if (SHORT_HOST.test(url.hostname)) {
    id = url.pathname.split("/")[1] ?? null;
  } else if (YOUTUBE_HOSTS.test(url.hostname)) {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "watch") id = url.searchParams.get("v");
    else if (["shorts", "embed", "live", "v"].includes(parts[0] ?? "")) id = parts[1] ?? null;
  }
  return id && YOUTUBE_ID_RE.test(id) ? id : null;
}

export function youtubeThumbnail(id: string): string {
  if (!YOUTUBE_ID_RE.test(id)) throw new Error("INVALID_VIDEO_ID");
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** Privacy-enhanced embed; autoplay because it is only created after the visitor pressed play. */
export function youtubeEmbedUrl(id: string): string {
  if (!YOUTUBE_ID_RE.test(id)) throw new Error("INVALID_VIDEO_ID");
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
}

const FACEBOOK_VIDEO = /^(?:(?:www|m|web)\.)?facebook\.com$/i;

/** Links that open a video (YouTube, Facebook video/reel/watch, fb.watch) — used for the "watch" label. */
export function isVideoLink(value: string | null | undefined): boolean {
  if (youtubeId(value)) return true;
  const safe = safeHttpsUrl(value);
  if (!safe) return false;
  const url = new URL(safe);
  if (/^(?:www\.)?fb\.watch$/i.test(url.hostname)) return true;
  return FACEBOOK_VIDEO.test(url.hostname) && /\/(?:videos|watch|reel|reels)(?:\/|$)/i.test(url.pathname);
}
