import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { num } from "@/lib/format";
import { fmt, type Locale } from "@/i18n/config";

/** Page numbers to show: first, last, current ±1, with gaps. */
function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  const pages = [...new Set([1, totalPages, page - 1, page, page + 1])]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) out.push(p - pages[i - 1] === 2 ? p - 1 : "gap");
    out.push(p);
  });
  return out;
}

const item = "inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-xl border px-3 font-semibold transition-colors";

export type PaginationLabels = { previous: string; next: string; page: string };
/** Bengali defaults (admin panel). */
const BN_LABELS: PaginationLabels = { previous: "আগের", next: "পরের", page: "পৃষ্ঠা {n}" };

const THEMES = {
  brand: {
    link: "border-line bg-white text-brand-800 hover:bg-brand-50",
    number: "border-line bg-white text-ink hover:bg-brand-50",
    current: "border-brand-700 bg-brand-700 text-white",
  },
  v2: {
    link: "border-line bg-white text-forest-800 hover:bg-sage-50",
    number: "border-line bg-white text-ink hover:bg-sage-50",
    current: "border-forest-700 bg-forest-700 text-white",
  },
} as const;

/** Server-rendered pagination with plain links (works without JavaScript). */
export function Pagination({
  page,
  totalPages,
  hrefFor,
  label = "পৃষ্ঠা নির্বাচন",
  labels = BN_LABELS,
  lang = "bn",
  theme = "brand",
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  label?: string;
  labels?: PaginationLabels;
  /** Digits of the page numbers. */
  lang?: Locale;
  theme?: keyof typeof THEMES;
}) {
  if (totalPages <= 1) return null;
  const c = THEMES[theme];
  return (
    <nav aria-label={label} className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className={`${item} ${c.link}`}>
          <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
          {labels.previous}
        </Link>
      ) : (
        <span className={`${item} cursor-not-allowed border-line bg-stone-50 text-stone-500`} aria-disabled="true">
          <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
          {labels.previous}
        </span>
      )}
      <ol className="flex flex-wrap items-center gap-2">
        {pageWindow(page, totalPages).map((p, i) =>
          p === "gap" ? (
            <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-muted">…</li>
          ) : (
            <li key={p}>
              <Link
                href={hrefFor(p)}
                aria-current={p === page ? "page" : undefined}
                aria-label={fmt(labels.page, { n: num(lang, p) })}
                className={`${item} ${p === page ? c.current : c.number}`}
              >
                {num(lang, p)}
              </Link>
            </li>
          ),
        )}
      </ol>
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} rel="next" className={`${item} ${c.link}`}>
          {labels.next}
          <ChevronRight className="size-5 rtl:rotate-180" aria-hidden="true" />
        </Link>
      ) : (
        <span className={`${item} cursor-not-allowed border-line bg-stone-50 text-stone-500`} aria-disabled="true">
          {labels.next}
          <ChevronRight className="size-5 rtl:rotate-180" aria-hidden="true" />
        </span>
      )}
    </nav>
  );
}

/** Builds a URL with the given query parameters (empty values dropped). */
export function withQuery(path: string, params: Record<string, string | number | null | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== "" && !(k === "page" && Number(v) <= 1)) qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}
