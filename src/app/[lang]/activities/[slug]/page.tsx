import "server-only";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { fmt, isLocale, DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { pickText } from "@/i18n/content";
import { Localized } from "@/i18n/localized";
import { common } from "@/i18n/messages/common";
import { activities as activitiesMessages } from "@/i18n/messages/activities";
import { SITE_URL } from "@/lib/env";
import { num } from "@/lib/format";
import { notFoundMetadata, pageMetadata } from "@/lib/site/metadata";
import { photoAlt } from "@/lib/gallery/types";
import {
  ACTIVITY_PHOTO_LIMIT,
  getActivityCategoriesWithCovers,
  getActivityCategory,
  getPhotoPage,
} from "@/lib/gallery/queries";
import { getProgramsForCategory } from "@/lib/programs/queries";
import { toParagraphs } from "@/lib/site/text";
import { container } from "@/components/ui/card";
import { PageHero } from "@/components/site/page-hero";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { ActivityCard } from "@/components/gallery/activity-card";
import { PhotoGrid } from "@/components/gallery/photo-grid";
import { ProgramCard } from "@/components/programs/program-card";
import { ShareButtons } from "@/components/site/share-buttons";

type DetailParams = Promise<{ lang: string; slug: string }>;

const textLink =
  "inline-flex min-h-11 items-center gap-1 font-semibold text-forest-700 underline-offset-4 hover:text-forest-900 hover:underline";

export async function generateMetadata({ params }: { params: DetailParams }): Promise<Metadata> {
  const { lang: rawLang, slug } = await params;
  const locale = (rawLang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) return {};
  const t = activitiesMessages[locale];
  const category = (await getActivityCategoriesWithCovers()).find((c) => c.slug === slug);
  if (!category) return notFoundMetadata(t.detail.notFound);
  const name = pickText(locale, category.name_bn, category.name_en);
  const cover = category.cover;
  return pageMetadata({
    title: name.text,
    description: fmt(t.detail.metaDescription, { name: name.text }),
    path: `/activities/${category.slug}`,
    lang: locale,
    image: cover ? { url: cover.src, width: cover.width, height: cover.height, alt: photoAlt(cover, 0, locale) } : undefined,
  });
}

export default async function ActivityCategoryPage({ params }: { params: DetailParams }) {
  const { lang: rawLang, slug } = await params;
  const locale = (rawLang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) notFound();
  const lang = locale;
  const t = activitiesMessages[lang];
  const td = t.detail;

  const category = await getActivityCategory(slug);
  if (!category) notFound();

  const name = pickText(lang, category.name_bn, category.name_en);
  const summary = pickText(lang, category.summary, category.summary_en);
  const description = pickText(lang, category.description, category.description_en);
  const descriptionParagraphs = toParagraphs(description.text);
  const path = `/activities/${category.slug}`;
  const pageUrl = `${SITE_URL}${localePath(lang, path)}`;

  const [photos, programs, allCategories] = await Promise.all([
    getPhotoPage({ categoryId: category.id, page: 1, pageSize: ACTIVITY_PHOTO_LIMIT }),
    getProgramsForCategory(category.id),
    getActivityCategoriesWithCovers(),
  ]);
  const others = allCategories.filter((c) => c.id !== category.id);

  return (
    <main>
      <BreadcrumbJsonLd
        crumbs={[
          { name: common[lang].nav.home, url: `${SITE_URL}${localePath(lang, "/")}` },
          { name: t.crumb, url: `${SITE_URL}${localePath(lang, "/activities")}` },
          { name: name.text, url: pageUrl },
        ]}
      />
      <PageHero
        lang={lang}
        title={<Localized value={name} />}
        eyebrow={t.eyebrow}
        intro={summary.text ? <Localized value={summary} /> : undefined}
        breadcrumb={[
          { href: "/activities", label: t.crumb },
          { href: path, label: <Localized value={name} /> },
        ]}
      />
      <div className={`${container} py-10 sm:py-12`}>
        {descriptionParagraphs.length > 0 && (
          <section aria-label={name.text} className="max-w-3xl">
            {lang === "en" && description.isFallback && (
              <p role="note" className="mb-6 rounded-2xl border border-sage-200 bg-sage-50 px-5 py-4 text-muted">
                {td.englishMissing}
              </p>
            )}
            <div className="space-y-4 text-lg leading-relaxed text-ink" lang={description.isFallback ? "bn" : undefined}>
              {descriptionParagraphs.map((p, i) => (
                <p key={i} className="whitespace-pre-line wrap-anywhere">
                  {p}
                </p>
              ))}
            </div>
          </section>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <h2 className="sr-only">{td.share}</h2>
          <ShareButtons url={pageUrl} title={name.text} titleLang={name.isFallback ? "bn" : undefined} lang={lang} />
        </div>

        <section data-testid="category-programs" aria-labelledby="category-programs-heading" className="mt-14">
          <h2 id="category-programs-heading" className="mb-5 text-2xl font-bold text-forest-800">
            {td.programs}
          </h2>
          {programs.length > 0 ? (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label={fmt(td.programsLabel, { name: name.text })}>
              {programs.map((program) => (
                <li key={program.id} className="min-w-0">
                  <ProgramCard program={program} lang={lang} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">{td.programsEmpty}</p>
          )}
          <p className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            <Link href={localePath(lang, `/programs?category=${category.slug}`)} className={textLink}>
              {td.programsAll}
              <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
            <Link href={localePath(lang, "/programs")} className={textLink}>
              {td.allPrograms}
              <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
          </p>
        </section>

        <section aria-labelledby="category-photos-heading" className="mt-14">
          <h2 id="category-photos-heading" className="mb-5 text-2xl font-bold text-forest-800">
            {td.photos}
            {photos.total > 0 && <> {fmt(td.photoCount, { count: num(lang, photos.total) })}</>}
          </h2>
          {photos.items.length > 0 ? (
            <>
              <PhotoGrid photos={photos.items} lang={lang} label={fmt(td.photosLabel, { name: name.text })} showCategory={false} />
              {photos.total > photos.items.length && (
                <p className="mt-6">
                  <Link href={localePath(lang, `/gallery?category=${category.slug}`)} className={textLink}>
                    {fmt(td.morePhotos, { count: num(lang, photos.total) })}
                    <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                  </Link>
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-muted">{td.noPhotos}</p>
              <p className="mt-3 text-muted">
                {td.otherPhotos}{" "}
                <Link href={localePath(lang, "/gallery")} className={textLink}>
                  {td.galleryCta}
                </Link>
              </p>
            </>
          )}
        </section>

        {others.length > 0 && (
          <section aria-labelledby="other-activities-heading" className="mt-14">
            <h2 id="other-activities-heading" className="mb-5 text-2xl font-bold text-forest-800">
              {td.others}
            </h2>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((other) => (
                <li key={other.id} className="min-w-0">
                  <ActivityCard category={other} lang={lang} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
