import "server-only";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fmt, isLocale, DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { pickText } from "@/i18n/content";
import { Localized } from "@/i18n/localized";
import { localePath } from "@/i18n/paths";
import { common } from "@/i18n/messages/common";
import { members as membersMessages } from "@/i18n/messages/members";
import { num } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { siteTexts } from "@/lib/site/localized-settings";
import { pageMetadata } from "@/lib/site/metadata";
import { parsePage } from "@/lib/site/text";
import {
  DIRECTORY_PAGE_SIZE,
  getDirectoryDesignations,
  getDirectoryPage,
  getLeadership,
  type DirectoryMember,
} from "@/lib/membership/directory";
import { container } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { PageHero } from "@/components/site/page-hero";
import { LeaderCard, MemberCard } from "@/components/membership/member-cards";
import { Pagination, withQuery } from "@/components/membership/pagination";

type ListSearchParams = { [key: string]: string | string[] | undefined };

function firstParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ? raw : null;
}

const textLink =
  "font-semibold text-forest-700 underline-offset-4 hover:text-forest-900 hover:underline";

const inputClass =
  "min-h-11 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink shadow-sm outline-none transition-colors placeholder:text-muted/70 focus:border-forest-500 focus:ring-2 focus:ring-forest-500/30";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const locale = ((await params).lang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) return {};
  const t = membersMessages[locale];
  const meta = pageMetadata({
    title: t.metaTitle,
    description: fmt(t.metaDescription, { org: common[locale].orgName }),
    path: "/members",
    lang: locale,
    // The directory is consent-gated personal data: keep it out of indexes.
    noindex: true,
  });
  return { ...meta, title: { absolute: `${t.metaTitle} | ${common[locale].orgName}` } };
}

/**
 * সদস্যবৃন্দ: the public member directory. Data comes ONLY from
 * src/lib/membership/directory.ts, which reads the public_members view
 * (active, consented, published members — under-18s only with a recorded
 * guardian consent — and safe columns: name, designation, member number,
 * photo, public phone). Nothing else about a member is rendered here.
 *
 * Without a search the office bearers lead (with the committee-term label
 * from settings), followed by the general members, paginated. A name search
 * (?q=) or designation filter (?designation=<id>) lists every match instead.
 * The whole page is noindex and disappears (404) when the directory is
 * switched off in the site settings.
 */
export default async function MembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<ListSearchParams>;
}) {
  const locale = ((await params).lang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) notFound();
  const lang = locale;
  const t = membersMessages[lang];

  const settings = await getSettings();
  if (!settings.directory.enabled) notFound();
  const texts = siteTexts(settings, lang);

  const sp = await searchParams;
  const q = (firstParam(sp.q) ?? "").trim();
  const page = parsePage(sp.page);

  const designations = await getDirectoryDesignations();
  const designationRaw = firstParam(sp.designation);
  const designationIdRaw = designationRaw && /^\d+$/.test(designationRaw) ? Number(designationRaw) : null;
  const designation = designationIdRaw !== null ? designations.find((d) => d.id === designationIdRaw) : undefined;
  const designationId = designation?.id ?? null;
  const designationName = designation ? pickText(lang, designation.name_bn, designation.name_en) : null;

  const filtered = q !== "" || designationId !== null;
  const basePath = localePath(lang, "/members");

  let leadership: DirectoryMember[] = [];
  let items: DirectoryMember[];
  let total: number;
  if (filtered) {
    ({ items, total } = await getDirectoryPage({ page, q: q || null, designationId }));
  } else {
    leadership = await getLeadership();
    ({ items, total } = await getDirectoryPage({ page, q: null, designationId: null }));
  }
  const totalPages = Math.max(1, Math.ceil(total / DIRECTORY_PAGE_SIZE));
  const directoryTotal = leadership.length + total;
  const directoryEmpty = !filtered && directoryTotal === 0;

  const countText = filtered
    ? total === 0
      ? t.count.none
      : fmt(total === 1 ? t.count.foundOne : t.count.found, { count: num(lang, total) }) +
        (designationName ? fmt(t.count.designation, { name: designationName.text }) : "")
    : fmt(directoryTotal === 1 ? t.count.totalOne : t.count.total, { count: num(lang, directoryTotal) });

  const hrefFor = (p: number) =>
    withQuery(basePath, filtered ? { q: q || null, designation: designationId, page: p } : { page: p });

  return (
    <main>
      <PageHero
        title={t.title}
        eyebrow={t.eyebrow}
        intro={fmt(t.intro, { org: common[lang].orgName })}
        breadcrumb={[{ href: "/members", label: t.crumb }]}
        lang={lang}
      />
      <div className={`${container} py-10 sm:py-12`}>
        <form
          method="get"
          action={basePath}
          role="search"
          aria-label={t.search.label}
          className="rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6"
        >
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-52 flex-1">
              <label htmlFor="members-q" className="mb-1.5 block font-semibold text-forest-800">
                {t.search.name}
              </label>
              <input
                id="members-q"
                name="q"
                type="search"
                defaultValue={q}
                placeholder={t.search.placeholder}
                className={inputClass}
              />
            </div>
            <div className="min-w-52 flex-1">
              <label htmlFor="members-designation" className="mb-1.5 block font-semibold text-forest-800">
                {t.search.designation}
              </label>
              <select id="members-designation" name="designation" defaultValue={designationId ? String(designationId) : ""} className={inputClass}>
                <option value="">{t.search.allDesignations}</option>
                {designations.map((d) => {
                  const dName = pickText(lang, d.name_bn, d.name_en);
                  return (
                    <option key={d.id} value={d.id} lang={dName.isFallback ? "bn" : undefined}>
                      {dName.text}
                    </option>
                  );
                })}
              </select>
            </div>
            <button type="submit" className={buttonClass("primary", "md")}>
              {t.search.submit}
            </button>
            {filtered && (
              <Link href={basePath} aria-label={t.search.clearLabel} className={`${buttonClass("outline", "md")}`}>
                {t.search.clear}
              </Link>
            )}
          </div>
        </form>

        {!directoryEmpty && (
          <p data-testid="members-count" className="mt-8 font-semibold text-forest-800" aria-live="polite">
            {countText}
          </p>
        )}

        {directoryEmpty ? (
          <div className="mt-8 rounded-2xl border border-line bg-white px-6 py-14 text-center shadow-[var(--shadow-card)]">
            <h2 className="text-2xl font-bold text-forest-800">{t.empty.title}</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">{t.empty.body}</p>
          </div>
        ) : filtered ? (
          <section aria-labelledby="members-results-title" className="mt-10">
            <h2 id="members-results-title" className="text-2xl font-bold text-forest-800">
              {t.resultsTitle}
            </h2>
            {items.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-line bg-white px-6 py-12 text-center shadow-[var(--shadow-card)]">
                <h3 className="text-xl font-bold text-forest-800">{t.noResults.title}</h3>
                <p className="mx-auto mt-3 max-w-xl text-muted">
                  {t.noResults.before}
                  <Link href={basePath} className={textLink}>
                    {t.noResults.link}
                  </Link>
                  {t.noResults.after}
                </p>
              </div>
            ) : (
              <>
                <ul data-testid="members-grid" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((m) => (
                    <li key={m.id} className="min-w-0">
                      <MemberCard m={m} lang={lang} t={t.card} />
                    </li>
                  ))}
                </ul>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  hrefFor={hrefFor}
                  label={t.pagination.label}
                  labels={t.pagination}
                  lang={lang}
                  theme="v2"
                />
              </>
            )}
          </section>
        ) : (
          <>
            {leadership.length > 0 && (
              <section aria-labelledby="leaders-title" className="mt-12">
                {texts.committeeTerm && (
                  <p data-testid="committee-term" className="mb-2 font-semibold text-gold-800">
                    <Localized value={texts.committeeTerm} />
                  </p>
                )}
                <p className="text-sm font-bold uppercase tracking-wider text-gold-800">{t.leadership.eyebrow}</p>
                <h2 id="leaders-title" className="mt-1 text-2xl font-bold text-forest-800">
                  {t.leadership.title}
                </h2>
                <ul data-testid="members-leadership" className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {leadership.map((m, i) => (
                    <li key={m.id} className="min-w-0">
                      <LeaderCard m={m} lang={lang} t={t.card} eager={i < 3} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="general-title" className="mt-14">
              <p className="text-sm font-bold uppercase tracking-wider text-gold-800">{t.general.eyebrow}</p>
              <h2 id="general-title" className="mt-1 text-2xl font-bold text-forest-800">
                {t.general.title}
              </h2>
              {items.length === 0 ? (
                <p className="mt-6 text-muted">{page > 1 ? t.count.none : t.empty.body}</p>
              ) : (
                <>
                  <ul data-testid="members-grid" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((m) => (
                      <li key={m.id} className="min-w-0">
                        <MemberCard m={m} lang={lang} t={t.card} />
                      </li>
                    ))}
                  </ul>
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    hrefFor={hrefFor}
                    label={t.pagination.label}
                    labels={t.pagination}
                    lang={lang}
                    theme="v2"
                  />
                </>
              )}
            </section>
          </>
        )}

        <p className="mt-14 max-w-3xl text-sm leading-relaxed text-muted">
          {t.footnoteBefore}
          <Link href={localePath(lang, "/contact")} className={textLink}>
            {t.footnoteLink}
          </Link>
          {t.footnoteAfter}
        </p>
      </div>
    </main>
  );
}
