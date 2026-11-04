import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { container } from "@/components/ui/card";

/** Breadcrumb links: full 44px touch targets. */
const crumbLink = "inline-flex min-h-11 items-center rounded text-forest-700 underline-offset-4 hover:text-forest-900 hover:underline";

/**
 * Title band for the programs and Notice pages (design v2: light sage with a
 * faint pattern, forest heading, gold eyebrow). Takes ReactNode titles so a
 * Bengali fallback on an English page can be marked with lang="bn".
 */
export function PageBand({
  title,
  eyebrow,
  intro,
  crumbs,
  crumbsLabel,
  children,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  intro?: ReactNode;
  /** Home first; the last item is the current page (not a link). */
  crumbs: { href: string; label: ReactNode }[];
  crumbsLabel: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-sage-200 bg-sage-50">
      <div aria-hidden="true" className="pattern-islamic pointer-events-none absolute inset-0 opacity-40" />
      <div className={`${container} relative py-10 sm:py-14`}>
        {crumbs.length > 0 && (
          <nav aria-label={crumbsLabel} className="mb-2 text-sm">
            <ol className="flex flex-wrap items-center gap-x-1">
              {crumbs.map((c, i) => {
                const last = i === crumbs.length - 1;
                return (
                  <li key={c.href} className="flex min-w-0 items-center gap-1">
                    {i > 0 && <ChevronRight className="size-4 shrink-0 text-sage-500 rtl:rotate-180" aria-hidden="true" />}
                    {last ? (
                      // Height on the outer span, the one-line clamp on the inner one without padding
                      // (a clamp clips at the padding box; see PageHero).
                      <span aria-current="page" className="flex min-h-11 min-w-0 items-center text-muted">
                        <span className="line-clamp-1 wrap-anywhere">{c.label}</span>
                      </span>
                    ) : (
                      <Link href={c.href} className={crumbLink}>{c.label}</Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
        {eyebrow && <p className="divider-star mb-3 text-sm font-semibold tracking-wide text-gold-800">{eyebrow}</p>}
        <h1 className="max-w-4xl text-3xl font-bold text-forest-800 wrap-anywhere sm:text-4xl lg:text-[2.75rem] lg:leading-tight">{title}</h1>
        {intro && <div className="mt-4 max-w-3xl text-lg text-muted">{intro}</div>}
        {children}
      </div>
    </section>
  );
}
