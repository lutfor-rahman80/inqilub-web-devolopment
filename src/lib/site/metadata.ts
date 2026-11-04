import type { Metadata } from "next";
import { OG_LOCALE, type Locale } from "@/i18n/config";
import { alternatesFor, localePath } from "@/i18n/paths";
import { common } from "@/i18n/messages/common";

/** The default social preview image (official logo on the brand background, 1200×630). */
export const OG_DEFAULT_IMAGE = { url: "/brand/og-default.png", width: 1200, height: 630 } as const;

export type OgImage = { url: string; width?: number; height?: number; alt?: string };

/**
 * Per-page metadata in one language: title, description, canonical URL in
 * that language with hreflang alternates (bn, en, x-default → Bengali), Open
 * Graph locale (+ the other language as alternate locale), the social image
 * (default: /brand/og-default.png) and a large Twitter card.
 * Open Graph objects replace the parent's, so the shared fields are repeated.
 *
 * `path` is the language-neutral path ("/about", "/gallery?category=x");
 * `lang` defaults to Bengali for callers that are not translated yet.
 */
export function pageMetadata({
  title,
  description,
  path,
  lang = "bn",
  absoluteTitle = false,
  type = "website",
  publishedTime,
  modifiedTime,
  image,
  noindex = false,
}: {
  title: string;
  description: string;
  path: string;
  lang?: Locale;
  absoluteTitle?: boolean;
  type?: "website" | "article";
  publishedTime?: string | null;
  modifiedTime?: string | null;
  image?: OgImage | null;
  noindex?: boolean;
}): Metadata {
  const site = common[lang].orgName;
  const fullTitle = absoluteTitle ? title : `${title} | ${site}`;
  const images = [image ?? { ...OG_DEFAULT_IMAGE, alt: site }];
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: alternatesFor(lang, path),
    openGraph: {
      type,
      locale: OG_LOCALE[lang],
      alternateLocale: [OG_LOCALE[lang === "bn" ? "en" : "bn"]],
      siteName: site,
      title: fullTitle,
      description,
      url: localePath(lang, path),
      images,
      ...(type === "article" && publishedTime ? { publishedTime } : {}),
      ...(type === "article" && modifiedTime ? { modifiedTime } : {}),
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: images.map((i) => i.url) },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/** Metadata for a detail page that does not exist (the page itself answers 404). */
export function notFoundMetadata(title: string): Metadata {
  return { title, robots: { index: false, follow: true } };
}
