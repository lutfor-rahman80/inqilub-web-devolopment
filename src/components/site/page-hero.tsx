import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { localePath, stripLocale } from "@/i18n/paths";
import { currentLocale } from "@/i18n/server";
import { common } from "@/i18n/messages/common";
import { seo } from "@/i18n/messages/seo";
import { container } from "@/components/ui/card";

/** Breadcrumb links: full 44px touch targets; forest-700 on sage-50 is 6.9:1. */
const crumbLink =
  "inline-flex min-h-11 items-center rounded text-forest-700 underline-offset-4 hover:text-forest-900 hover:underline";

export type HeroCrumb = { href: string; label: ReactNode };

/**
 * Title band for inner public pages (design v2): light sage background with
 * a faint geometric pattern (≈6% opacity), forest heading, gold-800 eyebrow
 * (AA on sage), muted intro. The breadcrumb starts at the home page of the
 * page's language; the last crumb is the current page (not a link).
 *
 * `title`/`eyebrow` accept nodes so a Bengali fallback on an English page can
 * be marked with lang="bn" (<Localized>). Crumb hrefs may be given with or
 * without the language prefix; they are mapped to the page's language.
 * `lang` should be passed; without it the language of the current route is used.
 */
export async function PageHero({
  title,
  eyebrow,
  intro,
  breadcrumb,
  children,
  lang: langProp,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  intro?: ReactNode;
  /** Crumbs after "Home"; the last one is the current page. */
  breadcrumb?: HeroCrumb[];
  children?: ReactNode;
  lang?: Locale;
}) {
  const lang = langProp ?? (await currentLocale());
  const crumbs: HeroCrumb[] =
    breadcrumb && breadcrumb.length > 0
      ? [
          { href: localePath(lang, "/"), label: common[lang].nav.home },
          ...breadcrumb.map((b) => ({ ...b, href: localePath(lang, stripLocale(b.href)) })),
        ]
      : [];

  return (
    <section className="relative overflow-hidden border-b border-sage-200 bg-sage-50" data-page-hero="">
      <div aria-hidden="true" className="pattern-islamic pointer-events-none absolute inset-0 opacity-40" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -end-24 -top-24 size-72 rounded-full bg-gold-100/60 blur-3xl sm:size-96"
      />
      <div className={`${container} relative py-10 sm:py-14`}>
        {crumbs.length > 0 && (
          <nav aria-label={seo[lang].breadcrumb} className="mb-2 text-sm">
            <ol className="flex flex-wrap items-center gap-x-1">
              {crumbs.map((c, i) => {
                const last = i === crumbs.length - 1;
                return (
                  <li key={`${c.href}-${i}`} className="flex min-w-0 items-center gap-1">
                    {i > 0 && <ChevronRight className="size-4 shrink-0 text-sage-500 rtl:rotate-180" aria-hidden="true" />}
                    {last ? (
                      // Height (aligned with the 44px links) on the outer span, the one-line clamp on the
                      // inner one without padding — a clamp clips at the padding box, so padding would
                      // let the start of the hidden second line show below the ellipsis.
                      <span aria-current="page" className="flex min-h-11 min-w-0 items-center text-muted">
                        <span className="line-clamp-1 wrap-anywhere">{c.label}</span>
                      </span>
                    ) : (
                      <Link href={c.href} className={crumbLink}>
                        {c.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
        {eyebrow && <p className="divider-star mb-3 text-sm font-semibold tracking-wide text-gold-800">{eyebrow}</p>}
        <h1 className="max-w-4xl text-3xl font-bold text-forest-800 wrap-anywhere sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
          {title}
        </h1>
        {intro && <div className="mt-4 max-w-3xl text-lg text-muted">{intro}</div>}
        {children}
      </div>
    </section>
  );
}
