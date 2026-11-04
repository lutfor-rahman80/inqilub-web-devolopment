import "server-only";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fmt, isLocale, DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { common } from "@/i18n/messages/common";
import { programs as programsMessages } from "@/i18n/messages/programs";
import { num } from "@/lib/format";
import { localizedMetadata } from "@/lib/programs/metadata";
import {
  parseCategorySlug,
  parseStatusTab,
  parseYear,
  programsQuery,
  PROGRAMS_PAGE_SIZE,
  STATUS_TABS,
  type StatusTab,
} from "@/lib/programs/filters";
import { getProgramCategories, getProgramYears, getProgramsPage } from "@/lib/programs/queries";
import { parsePage } from "@/lib/site/text";
import { container } from "@/components/ui/card";
import { PageBand } from "@/components/programs/page-band";
import { FilterTabs } from "@/components/programs/filter-tabs";
import { ProgramFilters } from "@/components/programs/program-filters";
import { ProgramCard } from "@/components/programs/program-card";
import { ListPager } from "@/components/programs/list-pager";

type ListSearchParams = { [key: string]: string | string[] | undefined };

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const locale = ((await params).lang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) return {};
  const t = programsMessages[locale];
  return localizedMetadata({ lang: locale, title: t.list.title, description: t.list.metaDescription, path: "/programs" });
}

function EmptyState({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-white px-6 py-14 text-center shadow-[var(--shadow-card)]">
      <h2 className="text-2xl font-bold text-forest-800">{title}</h2>
      {body && <p className="mx-auto mt-3 max-w-xl text-muted">{body}</p>}
      {children}
    </div>
  );
}

const textLink =
  "font-semibold text-forest-700 underline-offset-4 hover:text-forest-900 hover:underline";

export default async function ProgramsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<ListSearchParams>;
}) {
  const locale = ((await params).lang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) notFound();
  const lang = locale;
  const messages = programsMessages[lang];
  const t = messages.list;
  const sp = await searchParams;

  const status = parseStatusTab(sp.status);
  const year = parseYear(sp.year);
  const page = parsePage(sp.page);
  const categorySlug = parseCategorySlug(sp.category);

  const [categories, years] = await Promise.all([getProgramCategories(), getProgramYears()]);
  const category = categorySlug ? categories.find((c) => c.slug === categorySlug) : undefined;
  const unknownCategory = categorySlug !== null && !category;

  const hrefFor = (f: { status?: StatusTab; category?: string | null; year?: number | null; page?: number }) =>
    localePath(lang, `/programs${programsQuery(f)}`);

  const { items, total } = unknownCategory
    ? { items: [], total: 0 }
    : await getProgramsPage({ status, categoryId: category?.id ?? null, year, page });
  const totalPages = Math.max(1, Math.ceil(total / PROGRAMS_PAGE_SIZE));

  return (
    <main>
      <PageBand
        title={t.title}
        eyebrow={t.eyebrow}
        intro={t.intro}
        crumbs={[
          { href: localePath(lang, "/"), label: common[lang].nav.home },
          { href: localePath(lang, "/programs"), label: t.title },
        ]}
        crumbsLabel={messages.breadcrumb}
      />
      <div className={`${container} py-10 sm:py-12`}>
        {unknownCategory ? (
          <EmptyState title={t.empty.unknownCategory.title} body={t.empty.unknownCategory.body}>
            <p className="mt-6">
              <Link href={localePath(lang, "/programs")} className={textLink}>
                {t.seeAll}
              </Link>
            </p>
          </EmptyState>
        ) : (
          <>
            <div className="space-y-4">
              <FilterTabs
                label={t.tabsLabel}
                active={status}
                items={STATUS_TABS.map((tab) => ({
                  key: tab,
                  label: t.tabs[tab],
                  href: hrefFor({ status: tab, category: categorySlug, year }),
                }))}
              />
              {status === "all" && <p className="text-sm text-muted">{t.allNote}</p>}
              <ProgramFilters
                action={localePath(lang, "/programs")}
                status={status}
                category={categorySlug ?? ""}
                year={year ? String(year) : ""}
                categories={categories.map((c) => ({
                  value: c.slug,
                  label: lang === "en" ? c.name_en?.trim() || c.name_bn : c.name_bn,
                }))}
                years={years.map((y) => ({ value: String(y), label: num(lang, y) }))}
                clearHref={status !== "all" || categorySlug || year ? localePath(lang, "/programs") : null}
                labels={{
                  form: t.filtersLabel,
                  category: t.category,
                  allCategories: t.allCategories,
                  year: t.year,
                  allYears: t.allYears,
                  apply: t.apply,
                  clear: t.clear,
                }}
              />
            </div>

            <section aria-labelledby="programs-list-heading" className="mt-10">
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 id="programs-list-heading" className="text-2xl font-bold text-forest-800">
                  {status === "all" ? t.allHeading : messages.sections[status]}
                </h2>
                {items.length > 0 && (
                  <p className="text-sm text-muted">
                    {total === 1 ? t.countOne : fmt(t.count, { count: num(lang, total) })}
                    {totalPages > 1 && <> · {fmt(t.pageOf, { page: num(lang, page), total: num(lang, totalPages) })}</>}
                  </p>
                )}
              </div>

              {items.length === 0 ? (
                page > 1 ? (
                  <EmptyState title={t.empty.page.title}>
                    <p className="mt-6">
                      <Link href={hrefFor({ status, category: categorySlug, year, page: 1 })} className={textLink}>
                        {t.firstPage}
                      </Link>
                    </p>
                  </EmptyState>
                ) : (
                  (() => {
                    const empty = categorySlug || year ? t.empty.filtered : status !== "all" ? t.empty[status] : t.empty.all;
                    return <EmptyState title={empty.title} body={empty.body} />;
                  })()
                )
              ) : (
                <>
                  <ul data-testid="program-list" aria-label={t.listLabel} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((program) => (
                      <li key={program.id} className="min-w-0">
                        <ProgramCard program={program} lang={lang} />
                      </li>
                    ))}
                  </ul>
                  <ListPager
                    page={page}
                    totalPages={totalPages}
                    hrefFor={(p) => hrefFor({ status, category: categorySlug, year, page: p })}
                    number={(n) => num(lang, n)}
                    labels={{ nav: t.pagerLabel, previous: t.previous, next: t.next, page: t.page }}
                  />
                </>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
