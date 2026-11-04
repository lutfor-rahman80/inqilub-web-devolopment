/**
 * Validation for admin-configured external URLs before they are rendered,
 * embedded in an iframe, or encoded into a QR code. Pure functions (no
 * server-only imports) so they can be unit tested.
 */

const FACEBOOK_HOST = /^(?:www\.|m\.)?facebook\.com$/i;

function parseUrl(value: string | null | undefined): URL | null {
  if (!value || typeof value !== "string") return null;
  try {
    return new URL(value.trim());
  } catch {
    return null;
  }
}

/**
 * Returns the URL when it is an https://(www.|m.)facebook.com address
 * without credentials or a custom port; otherwise null.
 */
export function safeFacebookUrl(value: string | null | undefined): string | null {
  const url = parseUrl(value);
  if (!url) return null;
  if (url.protocol !== "https:" || !FACEBOOK_HOST.test(url.hostname)) return null;
  if (url.username || url.password || url.port) return null;
  return url.toString();
}

/** Only Google Maps embed URLs may be placed in the contact-page iframe. */
export function safeMapEmbedUrl(value: string | null | undefined): string | null {
  const url = parseUrl(value);
  if (!url) return null;
  if (url.protocol !== "https:" || url.hostname !== "www.google.com") return null;
  if (url.username || url.password || url.port) return null;
  if (!url.pathname.startsWith("/maps/embed")) return null;
  return url.toString();
}

/** Facebook "share this page" dialog URL. */
export function facebookShareUrl(pageUrl: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string) => UUID.test(value);

/** Social platforms the site can link to, with the hosts each may point at (mirrors the DB allow-list). */
export const SOCIAL_PLATFORMS = {
  facebook: /^(?:www\.|m\.)?facebook\.com$/i,
  youtube: /^(?:(?:www\.|m\.)?youtube\.com|youtu\.be)$/i,
  instagram: /^(?:www\.)?instagram\.com$/i,
  tiktok: /^(?:www\.)?tiktok\.com$/i,
  x: /^(?:www\.)?(?:x|twitter)\.com$/i,
  whatsapp: /^(?:(?:www\.)?whatsapp\.com|wa\.me)$/i,
  telegram: /^t\.me$/i,
  linkedin: /^(?:www\.)?linkedin\.com$/i,
} as const;
export type SocialPlatform = keyof typeof SOCIAL_PLATFORMS;
export const isSocialPlatform = (p: unknown): p is SocialPlatform =>
  typeof p === "string" && Object.prototype.hasOwnProperty.call(SOCIAL_PLATFORMS, p);

/** The URL when it is an https link on the platform's own host (no credentials/port); otherwise null. */
export function safeSocialUrl(platform: SocialPlatform, value: string | null | undefined): string | null {
  const url = parseUrl(value);
  if (!url) return null;
  if (url.protocol !== "https:" || !SOCIAL_PLATFORMS[platform].test(url.hostname)) return null;
  if (url.username || url.password || url.port) return null;
  return url.toString();
}

/** Any https URL without credentials or a custom port (e.g. the quiz website); otherwise null. */
export function safeHttpsUrl(value: string | null | undefined): string | null {
  const url = parseUrl(value);
  if (!url || url.protocol !== "https:" || url.username || url.password || url.port) return null;
  return url.toString();
}

/** WhatsApp and Messenger share links (plain links, no SDK). */
export function whatsappShareUrl(pageUrl: string, text = ""): string {
  return `https://wa.me/?text=${encodeURIComponent(text ? `${text} ${pageUrl}` : pageUrl)}`;
}
