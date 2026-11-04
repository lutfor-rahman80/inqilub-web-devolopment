import Link from "next/link";
import { ChipScroller } from "./chip-scroller";

type Chip = { slug: string; name: string; count: number; lang?: string };

/**
 * Category filter for the public gallery (?category=<slug>). Plain links, so
 * it works without JavaScript; scrolls horizontally on phones (the current
 * chip is scrolled into view) and wraps from the sm breakpoint. Very long
 * names are truncated visually (full name in the title and accessible name).
 * `basePath` is the localized /gallery path; counts are pre-formatted by `count`.
 */
export function CategoryFilter({
  categories,
  active,
  total,
  basePath = "/gallery",
  label = "ক্যাটাগরি অনুযায়ী ছবি",
  allLabel = "সব",
  formatCount = String,
}: {
  categories: Chip[];
  active: string | null;
  total: number;
  basePath?: string;
  label?: string;
  allLabel?: string;
  formatCount?: (n: number) => string;
}) {
  const chip = (current: boolean, empty: boolean) =>
    `inline-flex min-h-11 max-w-full shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 font-medium transition-colors ${
      current
        ? "border-forest-600 bg-forest-600 text-white"
        : empty
          ? "border-line bg-white/70 text-muted hover:bg-sage-100"
          : "border-line bg-white text-ink hover:border-sage-300 hover:bg-sage-100"
    }`;
  const count = (n: number, current: boolean) => (
    <span className={`shrink-0 rounded-full px-2 text-sm ${current ? "bg-white/20 text-white" : "bg-sage-100 text-forest-800"}`}>
      {formatCount(n)}
    </span>
  );

  return (
    <nav aria-label={label}>
      <ChipScroller
        active={active}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      >
        <li className="shrink-0">
          <Link href={basePath} scroll={false} aria-current={active === null ? "page" : undefined} className={chip(active === null, false)}>
            {allLabel} {count(total, active === null)}
          </Link>
        </li>
        {categories.map((c) => {
          const current = active === c.slug;
          return (
            <li key={c.slug} className="max-w-full shrink-0">
              <Link
                href={`${basePath}?category=${c.slug}`}
                scroll={false}
                aria-current={current ? "page" : undefined}
                className={chip(current, c.count === 0)}
                title={c.name}
              >
                <span className="min-w-0 max-w-[15rem] truncate sm:max-w-[22rem]" lang={c.lang}>
                  {c.name}
                </span>{" "}
                {count(c.count, current)}
              </Link>
            </li>
          );
        })}
      </ChipScroller>
    </nav>
  );
}
