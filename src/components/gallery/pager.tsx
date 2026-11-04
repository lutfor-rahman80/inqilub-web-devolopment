import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { bn } from "@/lib/format";
import { fmt } from "@/i18n/config";

/** Page numbers to show: first, last, current ±1, with gaps ("…"). */
export function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

const item =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border px-3 font-semibold transition-colors";

export type PagerLabels = { previous: string; next: string; page: string };
const BN_LABELS: PagerLabels = { previous: "আগের", next: "পরের", page: "পৃষ্ঠা {page}" };

/**
 * Server-rendered pagination (plain links, works without JavaScript). The
 * defaults are Bengali (admin panel); public pages pass localized `labels`,
 * `number` and the v2 `tone`.
 */
export function Pager({
  page,
  totalPages,
  hrefFor,
  label = "পৃষ্ঠা নির্বাচন",
  labels = BN_LABELS,
  number = bn,
  tone = "brand",
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  label?: string;
  labels?: PagerLabels;
  number?: (n: number) => string;
  tone?: "brand" | "forest";
}) {
  if (totalPages <= 1) return null;
  const forest = tone === "forest";
  const link = `${item} border-line bg-white ${forest ? "text-forest-800 hover:bg-sage-100" : "text-brand-800 hover:bg-brand-50"}`;
  const disabled = `${item} cursor-not-allowed border-line bg-stone-50 text-stone-500`;
  const current = forest ? "border-forest-600 bg-forest-600 text-white" : "border-brand-700 bg-brand-700 text-white";
  const other = `border-line bg-white text-ink ${forest ? "hover:bg-sage-100" : "hover:bg-brand-50"}`;
  return (
    <nav aria-label={label} className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className={link}>
          <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
          {labels.previous}
        </Link>
      ) : (
        <span className={disabled} aria-disabled="true">
          <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
          {labels.previous}
        </span>
      )}
      <ol className="flex flex-wrap items-center gap-2">
        {pageWindow(page, totalPages).map((p, i) =>
          p === "gap" ? (
            <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-muted">
              …
            </li>
          ) : (
            <li key={p}>
              <Link
                href={hrefFor(p)}
                aria-current={p === page ? "page" : undefined}
                aria-label={fmt(labels.page, { page: number(p) })}
                className={`${item} ${p === page ? current : other}`}
              >
                {number(p)}
              </Link>
            </li>
          ),
        )}
      </ol>
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} rel="next" className={link}>
          {labels.next}
          <ChevronRight className="size-5 rtl:rotate-180" aria-hidden="true" />
        </Link>
      ) : (
        <span className={disabled} aria-disabled="true">
          {labels.next}
          <ChevronRight className="size-5 rtl:rotate-180" aria-hidden="true" />
        </span>
      )}
    </nav>
  );
}
