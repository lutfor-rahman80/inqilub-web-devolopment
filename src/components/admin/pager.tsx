import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { bn } from "@/lib/format";

/** Builds a URL with the given query parameters (empty values and page 1 dropped). */
export function hrefWith(path: string, params: Record<string, string | number | null | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === "") continue;
    if (k === "page" && Number(v) <= 1) continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}

function pages(page: number, total: number): (number | "gap")[] {
  const set = [...new Set([1, total, page - 1, page, page + 1])].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  set.forEach((p, i) => {
    if (i > 0 && p - set[i - 1] > 1) out.push(p - set[i - 1] === 2 ? p - 1 : "gap");
    out.push(p);
  });
  return out;
}

const item = "inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-xl border px-3 font-semibold transition-colors";

/** Server-rendered pagination with plain links (works without JavaScript). */
export function AdminPager({ page, totalPages, hrefFor, label = "পৃষ্ঠা নির্বাচন" }: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  label?: string;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label={label} className="mt-6 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className={`${item} border-line bg-white text-brand-800 hover:bg-brand-50`}>
          <ChevronLeft className="size-5" aria-hidden="true" /> আগের
        </Link>
      ) : (
        <span aria-disabled="true" className={`${item} border-line bg-stone-50 text-stone-400`}>
          <ChevronLeft className="size-5" aria-hidden="true" /> আগের
        </span>
      )}
      <ol className="flex flex-wrap items-center gap-2">
        {pages(page, totalPages).map((p, i) =>
          p === "gap" ? (
            <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-muted">…</li>
          ) : (
            <li key={p}>
              <Link
                href={hrefFor(p)}
                aria-current={p === page ? "page" : undefined}
                aria-label={`পৃষ্ঠা ${bn(p)}`}
                className={`${item} ${p === page ? "border-brand-700 bg-brand-700 text-white" : "border-line bg-white text-ink hover:bg-brand-50"}`}
              >
                {bn(p)}
              </Link>
            </li>
          ),
        )}
      </ol>
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} rel="next" className={`${item} border-line bg-white text-brand-800 hover:bg-brand-50`}>
          পরের <ChevronRight className="size-5" aria-hidden="true" />
        </Link>
      ) : (
        <span aria-disabled="true" className={`${item} border-line bg-stone-50 text-stone-400`}>
          পরের <ChevronRight className="size-5" aria-hidden="true" />
        </span>
      )}
    </nav>
  );
}
