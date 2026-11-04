import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Search, X } from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { APPLICATION_STATUS, bn, formatDate, formatDateTime, toAsciiDigits, type ApplicationStatus } from "@/lib/format";
import { cleanSearch, escapeLike, parsePositiveInt } from "@/lib/membership/normalize";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Alert, inputClass } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { Pagination, withQuery } from "@/components/membership/pagination";

export const metadata: Metadata = { title: "সদস্য আবেদন" };

const PAGE_SIZE = 20;
const TABS = [
  { key: "pending", label: APPLICATION_STATUS.pending.label },
  { key: "under_review", label: APPLICATION_STATUS.under_review.label },
  { key: "approved", label: APPLICATION_STATUS.approved.label },
  { key: "rejected", label: APPLICATION_STATUS.rejected.label },
  { key: "all", label: "সব" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** PostgREST or() filter for name / tracking number / mobile / ID number (values quoted, wildcards escaped). */
function searchFilter(q: string): string {
  const ascii = toAsciiDigits(q);
  const terms = new Set([q, ascii]);
  // Mobile typed with +880 / 880 prefix → stored form 01XXXXXXXXX.
  const digits = ascii.replace(/[\s-]/g, "");
  if (/^\+?\d{4,}$/.test(digits)) terms.add(digits.replace(/^\+?880?(?=1)/, "0"));
  const parts: string[] = [];
  for (const t of terms) {
    const v = `"%${escapeLike(t).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}%"`;
    parts.push(`full_name.ilike.${v}`, `application_no.ilike.${v}`, `mobile.ilike.${v}`, `id_number.ilike.${v}`);
  }
  return parts.join(",");
}

export default async function ApplicationsPage({ searchParams }: Props) {
  await requirePagePermission("applications.view");
  const sp = await searchParams;
  const rawStatus = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const status: TabKey = TABS.some((t) => t.key === rawStatus) ? (rawStatus as TabKey) : "pending";
  const q = cleanSearch(sp.q);
  const page = parsePositiveInt(sp.page);
  const supabase = await createClient();
  const filter = q ? searchFilter(q) : null;

  const countFor = (s: TabKey) => {
    let query = supabase.from("membership_applications").select("id", { count: "exact", head: true });
    if (s !== "all") query = query.eq("status", s);
    if (filter) query = query.or(filter);
    return query;
  };

  let list = supabase
    .from("membership_applications")
    .select("id, application_no, full_name, mobile, status, created_at, reviewed_at, directory_consent", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status !== "all") list = list.eq("status", status);
  if (filter) list = list.or(filter);

  const [listRes, ...counts] = await Promise.all([list, ...TABS.map((t) => countFor(t.key))]);
  const countMap = Object.fromEntries(TABS.map((t, i) => [t.key, counts[i].count ?? 0])) as Record<TabKey, number>;
  const rows = listRes.error?.code === "PGRST103" ? [] : listRes.data ?? [];
  const total = listRes.count ?? countMap[status];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const loadError = listRes.error && listRes.error.code !== "PGRST103";

  const href = (over: Record<string, string | number | null>) =>
    withQuery("/admin/applications", { status: status === "pending" ? null : status, q, page: null, ...over });
  // A page past the end (items decided/deleted since, or an old link): go to the last page that exists.
  if (!loadError && page > totalPages) redirect(href({ page: totalPages > 1 ? totalPages : null }));

  return (
    <>
      <AdminPageHeader title="সদস্য আবেদন" description="অনলাইনে জমা দেওয়া সদস্য আবেদন যাচাই, অনুমোদন ও প্রত্যাখ্যান।" />

      {sp.deleted === "1" && (
        <div className="mb-4">
          <Alert tone="success">আবেদনটি স্থায়ীভাবে মুছে ফেলা হয়েছে।</Alert>
        </div>
      )}

      <nav aria-label="অবস্থা অনুযায়ী আবেদন" className="mb-4">
        <ul className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const active = t.key === status;
            return (
              <li key={t.key}>
                <Link
                  href={href({ status: t.key === "pending" ? null : t.key })}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 font-semibold transition-colors ${
                    active ? "border-brand-700 bg-brand-700 text-white" : "border-line bg-white text-ink hover:bg-brand-50"
                  }`}
                >
                  {t.label}
                  <span
                    className={`rounded-full px-2 text-sm ${active ? "bg-white/20 text-white" : "bg-stone-100 text-muted"}`}
                    data-testid={`tab-count-${t.key}`}
                  >
                    {bn(countMap[t.key])}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <form method="get" action="/admin/applications" role="search" className="mb-5 flex flex-col gap-2 sm:flex-row">
        {status !== "pending" && <input type="hidden" name="status" value={status} />}
        <label htmlFor="app-q" className="sr-only">নাম, ট্র্যাকিং নম্বর, মোবাইল বা পরিচয়পত্র নম্বর দিয়ে খুঁজুন</label>
        <input
          id="app-q"
          name="q"
          type="search"
          defaultValue={q}
          maxLength={80}
          placeholder="নাম, ট্র্যাকিং নম্বর, মোবাইল বা এনআইডি নম্বর"
          className={`${inputClass} sm:max-w-md`}
          autoComplete="off"
        />
        <div className="flex gap-2">
          <button type="submit" className={buttonClass("primary", "md", "flex-1 sm:flex-none")}>
            <Search className="size-5" aria-hidden="true" />
            খুঁজুন
          </button>
          {q && (
            <Link href={href({ q: null })} className={buttonClass("ghost", "md", "border border-line bg-white")}>
              <X className="size-5" aria-hidden="true" />
              মুছুন
            </Link>
          )}
        </div>
      </form>

      {loadError && (
        <div className="mb-4">
          <Alert>আবেদনের তালিকা লোড করা যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।</Alert>
        </div>
      )}

      <p className="mb-3 text-muted" data-testid="applications-count">
        {q ? `“${q}” অনুসন্ধানে ` : ""}
        {bn(total)}টি আবেদন{totalPages > 1 ? ` · পৃষ্ঠা ${bn(page)} / ${bn(totalPages)}` : ""}
      </p>

      {rows.length === 0 && !loadError ? (
        <EmptyState title={q ? "কোনো আবেদন পাওয়া যায়নি" : "এই তালিকায় কোনো আবেদন নেই"}>
          {q ? "অন্য বানান বা নম্বর দিয়ে খুঁজুন।" : status === "pending" ? "নতুন আবেদন জমা হলে এখানে দেখা যাবে।" : null}
        </EmptyState>
      ) : (
        <>
          {/* Cards (phones/tablets) */}
          <ul className="grid gap-3 lg:hidden" aria-label="আবেদনের তালিকা" data-testid="applications-cards">
            {rows.map((a) => {
              const meta = APPLICATION_STATUS[a.status as ApplicationStatus] ?? { label: a.status, tone: "gray" as const };
              return (
                <li key={a.id} className="min-w-0">
                  <Link
                    href={`/admin/applications/${a.id}`}
                    className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-white p-4 shadow-[var(--shadow-card)] hover:border-brand-200"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="min-w-0 font-semibold text-brand-900 wrap-anywhere">{a.full_name}</span>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </p>
                      <p className="text-sm text-muted">
                        <span dir="ltr" className="tabular-nums">{a.application_no}</span> · {formatDate(a.created_at)}
                      </p>
                      <p className="text-sm text-muted" dir="ltr">{a.mobile}</p>
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Table (desktop) */}
          <div className="hidden overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)] lg:block">
            <table className="w-full text-start" data-testid="applications-table">
              <caption className="sr-only">আবেদনের তালিকা</caption>
              <thead className="bg-cream text-sm text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">ট্র্যাকিং নম্বর</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">নাম</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">মোবাইল</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">জমার সময়</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">অবস্থা</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">বিস্তারিত</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((a) => {
                  const meta = APPLICATION_STATUS[a.status as ApplicationStatus] ?? { label: a.status, tone: "gray" as const };
                  return (
                    <tr key={a.id} className="hover:bg-brand-50/40">
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums" dir="ltr">{a.application_no}</td>
                      <td className="px-4 py-3 font-semibold text-brand-900 wrap-anywhere">{a.full_name}</td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums" dir="ltr">{a.mobile}</td>
                      <td className="px-4 py-3 text-sm">{formatDateTime(a.created_at)}</td>
                      <td className="px-4 py-3"><Badge tone={meta.tone}>{meta.label}</Badge></td>
                      <td className="px-4 py-3 text-end">
                        <Link
                          href={`/admin/applications/${a.id}`}
                          className="inline-flex min-h-11 items-center gap-1 whitespace-nowrap rounded-lg px-2 font-semibold text-brand-700 hover:bg-brand-50"
                          aria-label={`${a.full_name}-এর আবেদন দেখুন`}
                        >
                          দেখুন
                          <ChevronRight className="size-4" aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination page={Math.min(page, totalPages)} totalPages={totalPages} hrefFor={(p) => href({ page: p })} label="আবেদন তালিকার পৃষ্ঠা" />
        </>
      )}
    </>
  );
}
