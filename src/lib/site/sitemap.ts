import type { MetadataRoute } from "next";
import { LOCALES } from "@/i18n/config";
import { localePath } from "@/i18n/paths";

type Entry = MetadataRoute.Sitemap[number];
export type SitemapPage = { path: string; changeFrequency: Entry["changeFrequency"]; priority: number; lastModified?: string | null };

/**
 * Every public page in both languages (Bengali at /…, English at /en/…), each
 * with hreflang alternates (bn, en, x-default → Bengali). The member
 * directory is left out on purpose: it is marked noindex (privacy, F9).
 * `base` is the site origin (SITE_URL). Pure (unit tested).
 */
export function sitemapEntries(pages: SitemapPage[], base: string): MetadataRoute.Sitemap {
  return pages.flatMap((p) => {
    const languages = {
      bn: `${base}${localePath("bn", p.path)}`,
      en: `${base}${localePath("en", p.path)}`,
      "x-default": `${base}${localePath("bn", p.path)}`,
    };
    return LOCALES.map(
      (lang): Entry => ({
        url: `${base}${localePath(lang, p.path)}`,
        ...(p.lastModified ? { lastModified: p.lastModified } : {}),
        changeFrequency: p.changeFrequency,
        priority: p.priority,
        alternates: { languages },
      }),
    );
  });
}

