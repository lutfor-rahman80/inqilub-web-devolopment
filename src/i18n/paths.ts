import { DEFAULT_LOCALE, type Locale } from "./config";

/**
 * Public URL for a path in a language: Bengali has no prefix, English uses /en.
 *   localePath("bn", "/about") → "/about"
 *   localePath("en", "/about") → "/en/about";  localePath("en", "/") → "/en"
 * Only for site-internal paths beginning with "/". Admin and API paths are not localized.
 */
export function localePath(lang: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (lang === DEFAULT_LOCALE) return clean;
  return clean === "/" ? "/en" : `/en${clean}`;
}

/** The language-neutral path of a public URL path: "/en/about" → "/about", "/en" → "/". */
export function stripLocale(pathname: string): string {
  if (pathname === "/en" || pathname === "/bn") return "/";
  if (pathname.startsWith("/en/") || pathname.startsWith("/bn/")) return pathname.slice(3);
  return pathname || "/";
}

/** Same page in the other language (query string preserved by the caller). */
export function switchLocalePath(pathname: string, target: Locale): string {
  return localePath(target, stripLocale(pathname));
}

/** Metadata alternates for a page: canonical in the current language + hreflang links. */
export function alternatesFor(lang: Locale, path: string) {
  return {
    canonical: localePath(lang, path),
    languages: { bn: localePath("bn", path), en: localePath("en", path), "x-default": localePath("bn", path) },
  };
}
