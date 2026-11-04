import "server-only";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, DEFAULT_LOCALE, fmt, type Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { common } from "@/i18n/messages/common";
import { press } from "@/i18n/messages/press";
import { num } from "@/lib/format";
import { getPressPage } from "@/lib/press/queries";
import { PRESS_PAGE_SIZE, parsePressKind, type PressKind } from "@/lib/press/schemas";
import { pageMetadata } from "@/lib/site/metadata";
import { parsePage } from "@/lib/site/text";
import { PageHero } from "@/components/site/page-hero";
import { PressCard } from "@/components/press/press-card";
import { Pager } from "@/components/gallery/pager";
import { buttonClass } from "@/components/ui/button";
import { container } from "@/components/ui/card";

type SearchParams = Promise<{ kind?: string | string[]; page?: string | string[] }>;

/** The section name is the English word “Notice” in both languages (decision Q9), so it is marked lang="en". */
function NoticeWord() {
  return <span lang="en">Notice</span>;
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const locale = ((await params).lang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) return {};
  const t = press[locale];
  const meta = pageMetadata({ title: t.title, description: t.metaDescription, path: "/notice", lang: locale });
  return { ...meta, title: { absolute: `${t.title} | ${common[locale].orgName}` } };
}

/**
 * Notice (decision Q9): published press items — news reports and interviews
 * about the organization's activities — newest first, filterable by kind.
 * Items only link out to the original publisher; YouTube players load on
 * request (see PressCard).
 */
export default async function NoticePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: SearchParams;
}) {
  const locale = ((await params).lang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) notFound();
  const t = press[locale];
  const sp = await searchParams;
  const kind = parsePressKind(sp.kind);
  const page = parsePage(sp.page);

  const { items, total } = await getPressPage({ kind, page });
  const totalPages = Math.max(1, Math.ceil(total / PRESS_PAGE_SIZE));
  const base = localePath(locale, "/notice");
  const hrefFor = (p: number, k: PressKind | null) => {
    const query = [k ? `kind=${k}` : null, p > 1 ? `page=${p}` : null].filter(Boolean).join("&");
    return query ? `${base}?${query}` : base;
  };

  const tabs: { key: PressKind | null; label: string }[] = [
    { key: null, label: t.tabs.all },
    { key: "news", label: t.tabs.news },
    { key: "interview", label: t.tabs.interview },
    { key: "video_report", label: t.tabs.video_report },
  ];

  const empty: { title: string; body: string | null } | null =
    items.length === 0
      ? page > 1
        ? { title: t.empty.page.title, body: null }
        : kind
          ? { title: t.empty.kind.title, body: t.empty.kind.body }
          : { title: t.empty.all.title, body: t.empty.all.body }
      : null;

  return (
    <>
      <PageHero
        title={<NoticeWord />}
        eyebrow={t.eyebrow}
        intro={t.intro}
        breadcrumb={[{ href: "/notice", label: <NoticeWord /> }]}
        lang={locale}
      />
      <section className={`${container} py-12 sm:py-16`} aria-label={t.listLabel}>
        <p className="max-w-3xl text-ink/90">{t.sourceNote}</p>

        <nav aria-label={t.tabsLabel} className="mt-8">
          <ul className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const active = tab.key === kind;
              return (
                <li key={tab.key ?? "all"}>
                  <Link
                    href={hrefFor(1, tab.key)}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center rounded-full border px-4 font-semibold transition-colors ${
                      active
                        ? "border-forest-600 bg-forest-600 text-white"
                        : "border-line bg-surface text-forest-800 hover:bg-sage-100"
                    }`}
                  >
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {empty ? (
          <div className="mt-8 max-w-3xl rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8">
            <h2 className="text-2xl font-bold text-forest-800">{empty.title}</h2>
            {empty.body && <p className="mt-3 text-ink/90">{empty.body}</p>}
            <p className="mt-6 flex flex-wrap gap-3">
              {page > 1 ? (
                <Link href={hrefFor(1, kind)} className={buttonClass("primary", "md")}>
                  {t.firstPage}
                </Link>
              ) : kind ? (
                <Link href={base} className={buttonClass("primary", "md")}>
                  {t.seeAll}
                </Link>
              ) : null}
            </p>
          </div>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <p className="font-semibold text-forest-800">
                {total === 1 ? t.countOne : fmt(t.count, { count: num(locale, total) })}
              </p>
              {totalPages > 1 && (
                <p className="text-sm text-muted">{fmt(t.pageOf, { page: num(locale, page), total: num(locale, totalPages) })}</p>
              )}
            </div>
            <div className="mt-6 grid items-start gap-5">
              {items.map((item) => (
                <PressCard key={item.id} item={item} lang={locale} />
              ))}
            </div>
            <Pager
              page={page}
              totalPages={totalPages}
              hrefFor={(p) => hrefFor(p, kind)}
              label={t.pagerLabel}
              labels={{ previous: t.previous, next: t.next, page: t.page }}
              number={(n) => num(locale, n)}
              tone="forest"
            />
          </>
        )}
      </section>
    </>
  );
}
