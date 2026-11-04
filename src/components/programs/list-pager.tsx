import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fmt } from "@/i18n/config";

/** Page numbers to show: first, last, current ±1, with gaps. */
export function pagerWindow(page: number, totalPages: number): (number | "gap")[] {
  const set = [...new Set([1, totalPages, page - 1, page, page + 1])].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  set.forEach((p, i) => {
    if (i > 0 && p - set[i - 1] > 1) out.push(p - set[i - 1] === 2 ? p - 1 : "gap");
    out.push(p);
  });
  return out;
}

const item = "inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-xl border px-3 font-semibold transition-colors";

/** Server-rendered, language-aware pagination (plain links; works without JavaScript). */
export function ListPager({
  page,
  totalPages,
  hrefFor,
  number,
  labels,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  /** Formats a page number for display (Bengali or ASCII digits). */
  number: (n: number) => string;
  labels: { nav: string; previous: string; next: string; page: string };
}) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label={labels.nav} className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className={`${item} border-line bg-white text-forest-800 hover:bg-sage-50`}>
          <ChevronLeft className="size-5" aria-hidden="true" /> {labels.previous}
        </Link>
      ) : (
        <span aria-disabled="true" className={`${item} border-line bg-stone-50 text-stone-500`}>
          <ChevronLeft className="size-5" aria-hidden="true" /> {labels.previous}
        </span>
      )}
      <ol className="flex flex-wrap items-center gap-2">
        {pagerWindow(page, totalPages).map((p, i) =>
          p === "gap" ? (
            <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-muted">…</li>
          ) : (
            <li key={p}>
              <Link
                href={hrefFor(p)}
                aria-current={p === page ? "page" : undefined}
                aria-label={fmt(labels.page, { page: number(p) })}
                className={`${item} ${p === page ? "border-forest-600 bg-forest-600 text-white" : "border-line bg-white text-ink hover:bg-sage-50"}`}
              >
                {number(p)}
              </Link>
            </li>
          ),
        )}
      </ol>
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} rel="next" className={`${item} border-line bg-white text-forest-800 hover:bg-sage-50`}>
          {labels.next} <ChevronRight className="size-5" aria-hidden="true" />
        </Link>
      ) : (
        <span aria-disabled="true" className={`${item} border-line bg-stone-50 text-stone-500`}>
          {labels.next} <ChevronRight className="size-5" aria-hidden="true" />
        </span>
      )}
    </nav>
  );
}
