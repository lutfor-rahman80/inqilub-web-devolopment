import "server-only";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { fmt, HTML_LANG, isLocale, DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { pickText } from "@/i18n/content";
import { Localized } from "@/i18n/localized";
import { common } from "@/i18n/messages/common";
import { programs as programsMessages } from "@/i18n/messages/programs";
import { SITE_URL } from "@/lib/env";
import { num } from "@/lib/format";
import { galleryUrl } from "@/lib/storage";
import { localizedMetadata } from "@/lib/programs/metadata";
import { notFoundMetadata } from "@/lib/site/metadata";
import { getProgramBySlug, getProgramPhotos, type ProgramDetail } from "@/lib/programs/queries";
import { programStatus } from "@/lib/programs/status";
import { programDateText } from "@/lib/programs/format";
import { programEventJsonLd } from "@/lib/programs/jsonld";
import { toParagraphs } from "@/lib/site/text";
import { container } from "@/components/ui/card";
import { JsonLd } from "@/components/seo/json-ld";
import { PageBand } from "@/components/programs/page-band";
import { StatusBadge } from "@/components/programs/status-badge";
import { PhotoGrid } from "@/components/gallery/photo-grid";
import { ShareButtons } from "@/components/site/share-buttons";

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

type DetailParams = Promise<{ lang: string; slug: string }>;

export async function generateMetadata({ params }: { params: DetailParams }): Promise<Metadata> {
  const { lang: rawLang, slug } = await params;
  const locale = (rawLang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) return {};
  const t = programsMessages[locale];
  const program = await getProgramBySlug(slug);
  if (!program) return notFoundMetadata(t.detail.notFound);
  const title = pickText(locale, program.title_bn, program.title_en);
  const summary = pickText(locale, program.summary_bn, program.summary_en);
  const cover = one(program.cover);
  const coverUrl = cover ? galleryUrl(cover.storage_path) : null;
  return localizedMetadata({
    lang: locale,
    title: title.text,
    description: summary.text || t.list.metaDescription,
    path: `/programs/${program.slug}`,
    image: coverUrl
      ? { url: coverUrl, width: cover?.width ?? undefined, height: cover?.height ?? undefined, alt: cover?.caption || title.text }
      : null,
  });
}

export default async function ProgramDetailPage({ params }: { params: DetailParams }) {
  const { lang: rawLang, slug } = await params;
  const locale = (rawLang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) notFound();
  const lang = locale;
  const messages = programsMessages[lang];
  const t = messages.detail;

  const program: ProgramDetail | null = await getProgramBySlug(slug);
  if (!program) notFound();

  const status = programStatus(program);
  const title = pickText(lang, program.title_bn, program.title_en);
  const summary = pickText(lang, program.summary_bn, program.summary_en);
  const body = pickText(lang, program.body_bn, program.body_en);
  const location =
    program.location_bn || program.location_en ? pickText(lang, program.location_bn, program.location_en) : null;
  const category = one(program.category);
  const categoryName = category ? pickText(lang, category.name_bn, category.name_en) : null;
  const cover = one(program.cover);
  const coverUrl = cover ? galleryUrl(cover.storage_path) : null;
  const dateText = programDateText(program.starts_on, program.ends_on, lang);
  const path = `/programs/${program.slug}`;
  const pageUrl = `${SITE_URL}${localePath(lang, path)}`;

  const photos = await getProgramPhotos(program.id);
  const bodyParagraphs = toParagraphs(body.text);

  // English page: say when the description is missing in English (wholly or partly).
  const hasEn = (v: string | null | undefined) => Boolean(v?.trim());
  const missingEn =
    lang === "en" && !hasEn(program.title_en) && !hasEn(program.summary_en) && !hasEn(program.body_en);
  const partialEn =
    lang === "en" &&
    !missingEn &&
    ((Boolean(program.title_bn?.trim()) && !hasEn(program.title_en)) ||
      (Boolean(program.summary_bn?.trim()) && !hasEn(program.summary_en)) ||
      (Boolean(program.body_bn?.trim()) && !hasEn(program.body_en)));

  const eventLd = programEventJsonLd({
    name: title.text,
    description: summary.text,
    startsOn: program.starts_on,
    endsOn: program.ends_on,
    status,
    url: pageUrl,
    image: coverUrl ?? `${SITE_URL}/brand/og-default.png`,
    location: location?.text ?? "",
    organizerName: common[lang].orgName,
    organizerUrl: `${SITE_URL}${localePath(lang, "/")}`,
    inLanguage: HTML_LANG[lang],
  });

  return (
    <main>
      <JsonLd data={eventLd} />
      <PageBand
        title={<Localized value={title} />}
        eyebrow={t.eyebrow}
        intro={summary.text ? <Localized value={summary} /> : undefined}
        crumbs={[
          { href: localePath(lang, "/"), label: common[lang].nav.home },
          { href: localePath(lang, "/programs"), label: messages.list.title },
          { href: localePath(lang, path), label: <Localized value={title} /> },
        ]}
        crumbsLabel={messages.breadcrumb}
      />
      <div className={`${container} py-10 sm:py-12`}>
        {status === "cancelled" && (
          <p role="note" className="mb-8 rounded-2xl border border-stone-300 bg-stone-100 px-5 py-4 font-medium text-stone-800">
            {t.cancelledNotice}
          </p>
        )}
        {status === "postponed" && (
          <p role="note" className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 font-medium text-amber-900">
            {t.postponedNotice}
          </p>
        )}

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
          <div className="min-w-0">
            {coverUrl && cover && (
              <figure className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-sage-100 shadow-[var(--shadow-card)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverUrl}
                  alt={cover.caption || title.text}
                  lang={lang === "en" && cover.caption ? "bn" : undefined}
                  width={cover.width ?? 1600}
                  height={cover.height ?? 1200}
                  className="aspect-[16/9] w-full object-cover"
                />
              </figure>
            )}

            <section aria-labelledby="program-body-heading" className={coverUrl ? "mt-10" : undefined}>
              <h2 id="program-body-heading" className="sr-only">
                {title.text}
              </h2>
              {(missingEn || partialEn) && (
                <p role="note" className="mb-6 rounded-2xl border border-sage-200 bg-sage-50 px-5 py-4 text-muted">
                  {missingEn ? t.englishMissing : t.englishPartial}
                </p>
              )}
              {bodyParagraphs.length > 0 ? (
                <div className="space-y-4 text-lg leading-relaxed text-ink" lang={body.isFallback ? "bn" : undefined}>
                  {bodyParagraphs.map((p, i) => (
                    <p key={i} className="whitespace-pre-line wrap-anywhere">
                      {p}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-lg text-muted">{t.noBody}</p>
              )}
            </section>

            <section aria-labelledby="program-photos-heading" className="mt-12">
              <h2 id="program-photos-heading" className="mb-5 text-2xl font-bold text-forest-800">
                {t.photos}
                {photos.total > 0 && <> · {fmt(t.photoCount, { count: num(lang, photos.total) })}</>}
              </h2>
              {photos.items.length > 0 ? (
                <>
                  <PhotoGrid photos={photos.items} lang={lang} label={fmt(t.photosLabel, { title: title.text })} />
                  {photos.total > photos.items.length && category && (
                    <p className="mt-5 text-muted">
                      {fmt(t.morePhotos, { shown: num(lang, photos.items.length) })}{" "}
                      <Link
                        href={localePath(lang, `/gallery?category=${category.slug}`)}
                        className="font-semibold text-forest-700 underline-offset-4 hover:text-forest-900 hover:underline"
                      >
                        {t.morePhotosLink}
                      </Link>
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted">{t.noPhotos}</p>
              )}
            </section>

            <section aria-labelledby="program-share-heading" className="mt-12 border-t border-line pt-8">
              <h2 id="program-share-heading" className="mb-4 text-xl font-bold text-forest-800">
                {t.share}
              </h2>
              <ShareButtons url={pageUrl} title={title.text} titleLang={title.isFallback ? "bn" : undefined} lang={lang} />
            </section>

            <p className="mt-10">
              <Link
                href={localePath(lang, "/programs")}
                className="inline-flex min-h-11 items-center gap-2 font-semibold text-forest-700 underline-offset-4 hover:text-forest-900 hover:underline"
              >
                <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
                {t.back}
              </Link>
            </p>
          </div>

          <aside className="min-w-0 lg:pt-1">
            <div className="rounded-[var(--radius-card)] border border-line bg-white p-5 shadow-[var(--shadow-card)]">
              <h2 className="text-lg font-bold text-forest-800">{t.facts}</h2>
              <dl className="mt-4 space-y-4">
                <div>
                  <dt className="text-sm font-medium text-muted">{t.status}</dt>
                  <dd className="mt-1">
                    <StatusBadge status={status} label={messages.status[status]} />
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted">{t.date}</dt>
                  <dd className="mt-1 font-medium text-ink">{dateText}</dd>
                </div>
                {location && (
                  <div>
                    <dt className="text-sm font-medium text-muted">{t.location}</dt>
                    <dd className="mt-1 font-medium text-ink">
                      <Localized value={location} />
                    </dd>
                  </div>
                )}
                {category && categoryName && (
                  <div>
                    <dt className="text-sm font-medium text-muted">{t.category}</dt>
                    <dd className="mt-1">
                      <Link
                        href={localePath(lang, `/activities/${category.slug}`)}
                        className="inline-flex min-h-11 items-center font-semibold text-forest-700 underline-offset-4 hover:text-forest-900 hover:underline"
                      >
                        <Localized value={categoryName} />
                      </Link>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
