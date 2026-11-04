import "server-only";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { fmt, isLocale, DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { pickText } from "@/i18n/content";
import { Localized } from "@/i18n/localized";
import { localePath } from "@/i18n/paths";
import { common } from "@/i18n/messages/common";
import { gallery as galleryMessages } from "@/i18n/messages/gallery";
import { num } from "@/lib/format";
import { GALLERY_PAGE_SIZE, getActivityCategories, getPhotoPage } from "@/lib/gallery/queries";
import { pageMetadata } from "@/lib/site/metadata";
import { parsePage } from "@/lib/site/text";
import { container } from "@/components/ui/card";
import { PageHero } from "@/components/site/page-hero";
import { CategoryFilter } from "@/components/gallery/category-filter";
import { PhotoGrid } from "@/components/gallery/photo-grid";
import { Pager } from "@/components/gallery/pager";

type ListSearchParams = { [key: string]: string | string[] | undefined };

function firstParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ? raw : null;
}

const textLink =
  "inline-flex min-h-11 items-center gap-1 font-semibold text-forest-700 underline-offset-4 hover:text-forest-900 hover:underline";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<ListSearchParams>;
}): Promise<Metadata> {
  const locale = ((await params).lang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) return {};
  const t = galleryMessages[locale];
  const slug = firstParam((await searchParams).category);
  const category = slug ? (await getActivityCategories()).find((c) => c.slug === slug) : undefined;
  if (category) {
    const name = pickText(locale, category.name_bn, category.name_en);
    const title = fmt(t.metaCategoryTitle, { name: name.text });
    const meta = pageMetadata({
      title,
      description: fmt(t.metaCategoryDescription, { name: name.text }),
      path: `/gallery?category=${category.slug}`,
      lang: locale,
    });
    return { ...meta, title: { absolute: `${title} | ${common[locale].orgName}` } };
  }
  const meta = pageMetadata({ title: t.title, description: t.metaDescription, path: "/gallery", lang: locale });
  return { ...meta, title: { absolute: `${t.title} | ${common[locale].orgName}` } };
}

/**
 * গ্যালারি: published photos across the active categories (newest first), or
 * one category's photos in its display order, 24 per page. The category
 * filter is a row of plain links (?category=<slug>); an unknown slug gets a
 * friendly “not found” state (200), never an error. Captions are Bengali —
 * the grid marks them lang="bn" on English pages.
 */
export default async function GalleryPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<ListSearchParams>;
}) {
  const locale = ((await params).lang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) notFound();
  const lang = locale;
  const t = galleryMessages[lang];
  const sp = await searchParams;
  const slug = firstParam(sp.category);
  const page = parsePage(sp.page);

  const categories = await getActivityCategories();
  const totalAll = categories.reduce((sum, c) => sum + c.photoCount, 0);
  const category = slug ? categories.find((c) => c.slug === slug) : undefined;
  const unknownCategory = slug !== null && !category;
  const name = category ? pickText(lang, category.name_bn, category.name_en) : null;

  const basePath = localePath(lang, "/gallery");
  const hrefFor = (p: number) => {
    const query = new URLSearchParams();
    if (category) query.set("category", category.slug);
    if (p > 1) query.set("page", String(p));
    const qs = query.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const { items, total } = unknownCategory
    ? { items: [], total: 0 }
    : await getPhotoPage({ categoryId: category?.id ?? null, page });
  const totalPages = Math.max(1, Math.ceil(total / GALLERY_PAGE_SIZE));

  return (
    <main>
      <PageHero
        title={t.title}
        eyebrow={t.eyebrow}
        intro={t.intro}
        breadcrumb={[{ href: "/gallery", label: t.crumb }]}
        lang={lang}
      />
      <div className={`${container} py-10 sm:py-12`}>
        <CategoryFilter
          categories={categories.map((c) => {
            const chipName = pickText(lang, c.name_bn, c.name_en);
            return {
              slug: c.slug,
              name: chipName.text,
              count: c.photoCount,
              lang: chipName.isFallback ? "bn" : undefined,
            };
          })}
          active={category?.slug ?? null}
          total={totalAll}
          basePath={basePath}
          label={t.filterLabel}
          allLabel={t.all}
          formatCount={(n) => num(lang, n)}
        />

        {unknownCategory ? (
          <div className="mt-10 rounded-2xl border border-line bg-white px-6 py-14 text-center shadow-[var(--shadow-card)]">
            <h2 className="text-2xl font-bold text-forest-800">{t.unknownTitle}</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">{t.unknownBody}</p>
            <p className="mt-6">
              <Link href={basePath} className={textLink}>
                {t.seeAll}
              </Link>
            </p>
          </div>
        ) : (
          <section aria-labelledby="gallery-photos-heading" className="mt-10">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="gallery-photos-heading" className="text-2xl font-bold text-forest-800">
                {category && name ? <Localized value={name} /> : t.allPhotos}
              </h2>
              {total > 0 && (
                <p className="text-sm text-muted">
                  {total === 1 ? t.totalOne : fmt(t.total, { count: num(lang, total) })}
                  {totalPages > 1 && (
                    <> · {fmt(t.pageOf, { page: num(lang, page), total: num(lang, totalPages) })}</>
                  )}
                </p>
              )}
            </div>
            {category && (
              <p className="-mt-2 mb-5">
                <Link href={localePath(lang, `/activities/${category.slug}`)} className={textLink}>
                  {t.categoryDetails}
                  <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                </Link>
              </p>
            )}

            {items.length === 0 ? (
              <div className="rounded-2xl border border-line bg-white px-6 py-14 text-center shadow-[var(--shadow-card)]">
                <h3 className="text-xl font-bold text-forest-800">
                  {page > 1 ? t.emptyPage : category ? t.emptyCategory : t.emptyAll}
                </h3>
                {(category || page <= 1) && (
                  <p className="mx-auto mt-3 max-w-xl text-muted">{category ? t.emptyCategoryBody : t.emptyAllBody}</p>
                )}
                {page > 1 && (
                  <p className="mt-6">
                    <Link href={hrefFor(1)} className={textLink}>
                      {t.firstPage}
                    </Link>
                  </p>
                )}
              </div>
            ) : (
              <>
                <PhotoGrid
                  photos={items}
                  lang={lang}
                  label={category && name ? fmt(t.photosLabel, { name: name.text }) : t.allPhotos}
                />
                <Pager
                  page={page}
                  totalPages={totalPages}
                  hrefFor={hrefFor}
                  label={t.pager.label}
                  labels={t.pager}
                  number={(n) => num(lang, n)}
                  tone="forest"
                />
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
