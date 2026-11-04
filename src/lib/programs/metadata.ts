import type { Metadata } from "next";
import { OG_LOCALE, type Locale } from "@/i18n/config";
import { alternatesFor, localePath } from "@/i18n/paths";
import { common } from "@/i18n/messages/common";

/**
 * Page metadata for the programs and Notice pages: localized title and
 * description, canonical + hreflang alternates, Open Graph locale and image
 * (the program cover, or the default 1200×630 social image).
 */
export function localizedMetadata({
  lang,
  title,
  description,
  path,
  image,
  type = "website",
  noindex = false,
}: {
  lang: Locale;
  title: string;
  description: string;
  path: string;
  image?: { url: string; width?: number; height?: number; alt?: string } | null;
  type?: "website" | "article";
  noindex?: boolean;
}): Metadata {
  const site = common[lang].orgName;
  const fullTitle = `${title} | ${site}`;
  const images = [image ?? { url: "/brand/og-default.png", width: 1200, height: 630, alt: site }];
  return {
    title,
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
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: images.map((i) => i.url) },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
