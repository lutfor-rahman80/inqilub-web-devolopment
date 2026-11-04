"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { Search } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

type Option = { value: string; label: string };

/**
 * Category + year filter for /programs. A plain GET form (works without
 * JavaScript); with JavaScript the empty fields are left out of the URL.
 */
export function ProgramFilters({
  action,
  status,
  category,
  year,
  categories,
  years,
  clearHref,
  labels,
}: {
  action: string;
  status: string;
  category: string;
  year: string;
  categories: Option[];
  years: Option[];
  clearHref: string | null;
  labels: { form: string; category: string; allCategories: string; year: string; allYears: string; apply: string; clear: string };
}) {
  const router = useRouter();
  const uid = useId();
  return (
    <form
      method="get"
      action={action}
      role="search"
      aria-label={labels.form}
      className="grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-card)] sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_auto] lg:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const q = new URLSearchParams();
        for (const key of ["status", "category", "year"]) {
          const v = data.get(key);
          if (typeof v === "string" && v) q.set(key, v);
        }
        const s = q.toString();
        router.push(s ? `${action}?${s}` : action, { scroll: false });
      }}
    >
      {status !== "all" && <input type="hidden" name="status" value={status} />}
      <div className="min-w-0 space-y-1.5">
        <label htmlFor={`${uid}-category`} className="block font-medium text-ink">{labels.category}</label>
        <select
          id={`${uid}-category`}
          name="category"
          defaultValue={category}
          className="block min-h-11 w-full rounded-xl border border-line bg-white px-3.5 py-2 pe-8 text-base text-ink focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/25"
        >
          <option value="">{labels.allCategories}</option>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      <div className="min-w-0 space-y-1.5">
        <label htmlFor={`${uid}-year`} className="block font-medium text-ink">{labels.year}</label>
        <select
          id={`${uid}-year`}
          name="year"
          defaultValue={year}
          className="block min-h-11 w-full rounded-xl border border-line bg-white px-3.5 py-2 pe-8 text-base text-ink focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/25"
        >
          <option value="">{labels.allYears}</option>
          {years.map((y) => (
            <option key={y.value} value={y.value}>{y.label}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-1">
        <button type="submit" className={buttonClass("primary", "md", "press flex-1 bg-forest-600 hover:bg-forest-700 lg:flex-none")}>
          <Search className="size-5" aria-hidden="true" />
          {labels.apply}
        </button>
        {clearHref && (
          <Link href={clearHref} scroll={false} className={buttonClass("ghost", "md", "border border-line bg-white text-forest-800 hover:bg-sage-50")}>
            {labels.clear}
          </Link>
        )}
      </div>
    </form>
  );
}
