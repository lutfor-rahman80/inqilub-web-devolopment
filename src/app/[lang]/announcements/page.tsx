import "server-only";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, DEFAULT_LOCALE, fmt, type Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { common } from "@/i18n/messages/common";
import { announcements } from "@/i18n/messages/announcements";
import { num } from "@/lib/format";
import { pageMetadata } from "@/lib/site/metadata";
import { ANNOUNCEMENTS_PER_PAGE, getAnnouncementsPage } from "@/lib/site/queries";
import { parsePage } from "@/lib/site/text";
import { PageHero } from "@/components/site/page-hero";
import { AnnouncementCard } from "@/components/site/announcement-card";
import { Pager } from "@/components/gallery/pager";
import { container } from "@/components/ui/card";

type SearchParams = Promise<{ page?: string | string[] }>;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const locale = ((await params).lang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) return {};
  const t = announcements[locale];
  const page = parsePage((await searchParams).page);
  const title = page > 1 ? fmt(t.metaTitlePage, { page: num(locale, page) }) : t.metaTitle;
  const meta = pageMetadata({
    title,
    description: t.metaDescription,
    path: page > 1 ? `/announcements?page=${page}` : "/announcements",
    lang: locale,
  });
  return { ...meta, title: { absolute: `${title} | ${common[locale].orgName}` } };
}

/**
 * ঘোষণা: published announcements, pinned first, then newest — ten per page
 * (server-rendered pager). A page beyond the last one answers 404;
 * a non-numeric ?page= falls back to page 1.
 */
export default async function AnnouncementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: SearchParams;
}) {
  const locale = ((await params).lang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) notFound();
  const t = announcements[locale];
  const page = parsePage((await searchParams).page);

  const { items, total } = await getAnnouncementsPage(page);
  const totalPages = Math.max(1, Math.ceil(total / ANNOUNCEMENTS_PER_PAGE));
  if (page > totalPages) notFound();

  const base = localePath(locale, "/announcements");

  return (
    <>
      <PageHero
        title={t.title}
        eyebrow={t.eyebrow}
        intro={t.intro}
        breadcrumb={[{ href: "/announcements", label: t.crumb }]}
        lang={locale}
      />
      <section className={`${container} py-12 sm:py-16`} aria-label={t.listLabel}>
        {items.length === 0 ? (
          <div className="max-w-3xl rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8">
            <h2 className="text-2xl font-bold text-forest-800">{t.emptyTitle}</h2>
            <p className="mt-3 text-ink/90">{t.emptyBody}</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <p className="font-semibold text-forest-800">{fmt(t.count, { count: num(locale, total) })}</p>
              {totalPages > 1 && (
                <p className="text-sm text-muted">{fmt(t.pageOf, { page: num(locale, page), total: num(locale, totalPages) })}</p>
              )}
            </div>
            <div data-testid="announcement-list" className="mt-6 grid items-start gap-5 sm:grid-cols-2">
              {items.map((item) => (
                <AnnouncementCard key={item.id} item={item} lang={locale} headingLevel="h2" />
              ))}
            </div>
            <Pager
              page={page}
              totalPages={totalPages}
              hrefFor={(p) => (p === 1 ? base : `${base}?page=${p}`)}
              label={t.pagerLabel}
              labels={{ previous: t.previousPage, next: t.nextPage, page: t.page }}
              number={(n) => num(locale, n)}
              tone="forest"
            />
          </>
        )}
      </section>
    </>
  );
}
