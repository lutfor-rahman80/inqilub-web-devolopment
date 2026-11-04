/** Supported languages. Bengali is the default and lives at the site root. */
export const LOCALES = ["bn", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "bn";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "bn" || value === "en";
}

/** BCP-47 tags for <html lang>, hreflang and Intl. */
export const HTML_LANG: Record<Locale, string> = { bn: "bn", en: "en" };
export const OG_LOCALE: Record<Locale, string> = { bn: "bn_BD", en: "en_US" };
export const LANGUAGE_NAME: Record<Locale, string> = { bn: "বাংলা", en: "English" };
export const LANGUAGE_SHORT: Record<Locale, string> = { bn: "BN", en: "EN" };

/**
 * Language memory (plan §5.4): set by the BN/EN switch (1 year, SameSite=Lax,
 * path=/). Only the proxy reads it, and only for the bare "/" (→ /en when "en");
 * every other URL decides its language by itself. Functional, no tracking.
 */
export const LANG_COOKIE = "ijs_lang";
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Shape helper: English messages must have exactly the same keys as Bengali.
 * Usage: const bn = {...} as const; const en: Messages<typeof bn> = {...};
 */
export type Messages<T> = {
  [K in keyof T]: T[K] extends string ? string : T[K] extends readonly string[] ? readonly string[] : Messages<T[K]>;
};

/** "{name} জন" + { name: "৫" } → "৫ জন". Unknown placeholders are left as-is. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
