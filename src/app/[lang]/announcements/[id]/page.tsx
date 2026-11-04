import "server-only";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Pin } from "lucide-react";
import { isLocale, DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { pickText } from "@/i18n/content";
import { Localized } from "@/i18n/localized";
import { localePath } from "@/i18n/paths";
import { common } from "@/i18n/messages/common";
import { announcements } from "@/i18n/messages/announcements";
import { formatDate } from "@/lib/format";
import { SITE_URL } from "@/lib/env";
import { notFoundMetadata, pageMetadata } from "@/lib/site/metadata";
import { getAnnouncement } from "@/lib/site/queries";
import { excerpt, toParagraphs } from "@/lib/site/text";
import { PageHero } from "@/components/site/page-hero";
import { ShareButtons } from "@/components/site/share-buttons";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { container } from "@/components/ui/card";

type PageParams = Promise<{ lang: string; id: string }>;

async function resolveLocale(params: PageParams): Promise<Locale | null> {
  const locale = ((await params).lang as Locale) ?? DEFAULT_LOCALE;
  return isLocale(locale) ? locale : null;
}

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  if (!locale) return {};
  const { id } = await params;
  const t = announcements[locale];
  const item = await getAnnouncement(id).catch(() => null);
  if (!item) return notFoundMetadata(t.notFound);
  const title = pickText(locale, item.title, item.title_en);
  const body = pickText(locale, item.body, item.body_en);
  const meta = pageMetadata({
    title: title.text,
    description: excerpt(body.text, 300) || t.metaDescription,
    path: `/announcements/${id}`,
    lang: locale,
    type: "article",
    publishedTime: item.published_at,
    modifiedTime: item.updated_at,
  });
  return { ...meta, title: { absolute: `${title.text} | ${common[locale].orgName}` } };
}

/**
 * One announcement: title, date, body paragraphs and share links. English
 * pages fall back to the Bengali title/body (marked lang="bn") with a note
 * saying so. Unknown, unpublished or malformed ids answer 404.
 */
export default async function AnnouncementPage({ params }: { params: PageParams }) {
  const locale = await resolveLocale(params);
  if (!locale) notFound();
  const { id } = await params;
  const t = announcements[locale];

  const item = await getAnnouncement(id);
  if (!item) notFound();

  const title = pickText(locale, item.title, item.title_en);
  const body = pickText(locale, item.body, item.body_en);
  const paragraphs = toParagraphs(body.text);
  const url = `${SITE_URL}${localePath(locale, `/announcements/${id}`)}`;

  const note =
    locale === "en"
      ? !item.title_en && !item.body_en
        ? t.englishMissing
        : title.isFallback || body.isFallback
          ? t.englishPartial
          : null
      : null;

  return (
    <>
      <BreadcrumbJsonLd
        crumbs={[
          { name: common[locale].nav.home, url: `${SITE_URL}${localePath(locale, "/")}` },
          { name: t.crumb, url: `${SITE_URL}${localePath(locale, "/announcements")}` },
          { name: title.text, url },
        ]}
      />
      <PageHero
        title={<Localized value={title} />}
        breadcrumb={[
          { href: "/announcements", label: t.crumb },
          { href: `/announcements/${id}`, label: <Localized value={title} /> },
        ]}
        lang={locale}
      />
      <article className={`${container} py-12 sm:py-16`}>
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted">
            {item.is_pinned && (
              <span className="inline-flex items-center rounded-full bg-gold-100 px-2.5 py-0.5 font-medium text-gold-800 ring-1 ring-gold-400/40 ring-inset">
                <Pin className="me-1 size-3.5" aria-hidden="true" />
                {t.pinned}
              </span>
            )}
            {item.published_at && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4 text-forest-600" aria-hidden="true" />
                {t.publishedOn}{" "}
                <time dateTime={item.published_at}>{formatDate(item.published_at, locale)}</time>
              </span>
            )}
          </div>

          {note && (
            <p role="note" className="mt-5 rounded-xl bg-gold-50 px-4 py-3 text-sm text-gold-800 ring-1 ring-gold-400/40">
              {note}
            </p>
          )}

          <div
            data-testid="announcement-body"
            lang={body.isFallback ? "bn" : undefined}
            className="mt-6 space-y-4 text-lg leading-relaxed text-ink/90"
          >
            {paragraphs.length > 0 ? (
              paragraphs.map((paragraph, i) => (
                <p key={i} className="whitespace-pre-line wrap-anywhere">
                  {paragraph}
                </p>
              ))
            ) : (
              <p>{t.noBody}</p>
            )}
          </div>

          <div className="mt-10 border-t border-line pt-6">
            <p className="mb-3 font-semibold text-forest-800">{t.share}</p>
            <ShareButtons url={url} title={title.text} titleLang={title.isFallback ? "bn" : undefined} lang={locale} />
          </div>

          <p className="mt-10">
            <Link
              href={localePath(locale, "/announcements")}
              className="inline-flex min-h-11 items-center gap-2 font-semibold text-forest-700 underline-offset-4 hover:text-forest-900 hover:underline"
            >
              <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
              {t.back}
            </Link>
          </p>
        </div>
      </article>
    </>
  );
}
