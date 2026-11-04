import "server-only";
import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";

/**
 * Language of the current public route (from the [lang] root segment).
 * Server Components only — Server Actions must receive the language explicitly.
 */
export async function currentLocale(): Promise<Locale> {
  try {
    const value = await lang();
    return isLocale(value) ? value : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

/**
 * The [lang] route parameter of a public page or layout, checked. Any other
 * value is a 404: the proxy only ever rewrites to /bn/… or passes /en/…, but
 * URLs ending in a file extension (e.g. /x/page.txt) skip the proxy and reach
 * the routes with whatever first segment they have. Every segment renders on
 * its own (the root layout's own check does not stop the pages and layouts
 * below it), so each page and layout calls this instead of casting.
 */
export function routeLocale(value: string): Locale {
  if (!isLocale(value)) notFound();
  return value;
}
