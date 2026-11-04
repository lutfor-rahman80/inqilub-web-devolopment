import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";
import { getPublicSettings } from "@/lib/site/settings";
import { getActiveCategories, getAnnouncementSitemapEntries } from "@/lib/site/queries";
import { getProgramSitemapEntries } from "@/lib/programs/queries";
import { getFaqLastModified } from "@/lib/faq/queries";
import { sitemapEntries, type SitemapPage as Page } from "@/lib/site/sitemap";

export const revalidate = 3600;

/** Public pages in both languages with hreflang alternates; the member directory is left out (noindex, F9). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, categories, announcements, programs, faqUpdated] = await Promise.all([
    getPublicSettings(),
    getActiveCategories().catch(() => []),
    getAnnouncementSitemapEntries(),
    getProgramSitemapEntries().catch(() => []),
    getFaqLastModified(),
  ]);

  const pages: Page[] = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/about", changeFrequency: "monthly", priority: 0.8 },
    { path: "/activities", changeFrequency: "monthly", priority: 0.8 },
    { path: "/programs", changeFrequency: "weekly", priority: 0.8 },
    { path: "/gallery", changeFrequency: "weekly", priority: 0.7 },
    { path: "/notice", changeFrequency: "weekly", priority: 0.6 },
    { path: "/announcements", changeFrequency: "weekly", priority: 0.7 },
    { path: "/faq", changeFrequency: "monthly", priority: 0.6, lastModified: faqUpdated },
    { path: "/contact", changeFrequency: "yearly", priority: 0.6 },
    ...(settings.membership.is_open ? [{ path: "/membership", changeFrequency: "yearly" as const, priority: 0.7 }] : []),
    { path: "/membership/status", changeFrequency: "yearly", priority: 0.4 },
    { path: "/membership/terms", changeFrequency: "yearly", priority: 0.3 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
    ...categories.map((c): Page => ({ path: `/activities/${c.slug}`, changeFrequency: "monthly", priority: 0.6 })),
    ...programs.map((p): Page => ({ path: `/programs/${p.slug}`, changeFrequency: "monthly", priority: 0.6, lastModified: p.updated_at })),
    ...announcements.map(
      (a): Page => ({
        path: `/announcements/${a.id}`,
        changeFrequency: "yearly",
        priority: 0.5,
        lastModified: a.updated_at ?? a.published_at,
      }),
    ),
  ];

  return sitemapEntries(pages, SITE_URL);
}
