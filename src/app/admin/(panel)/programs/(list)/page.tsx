import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ExternalLink, Images, Pencil, Plus, Search } from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bn } from "@/lib/format";
import { firstParam, parsePageParam } from "@/lib/admin/text";
import { programDateText } from "@/lib/programs/format";
import { dhakaToday, programStatus, type ProgramStatus } from "@/lib/programs/status";
import { programs as programMessages } from "@/i18n/messages/programs";
import { isUuid } from "@/lib/programs/schemas";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminPager, hrefWith } from "@/components/admin/pager";
import { Alert, Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/card";
import { buttonClass, LinkButton } from "@/components/ui/button";
import { StatusBadge } from "@/components/programs/status-badge";
import { ProgramDeleteButton } from "@/components/programs/admin/program-delete-button";

export const metadata: Metadata = { title: "কর্মসূচি" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const PER_PAGE = 20;
const STATUS_FILTERS = {
  all: "সব অবস্থা",
  ongoing: "চলমান",
  upcoming: "আসন্ন",
  completed: "সম্পন্ন",
  postponed: "স্থগিত",
  cancelled: "বাতিল",
} as const;
type StatusFilter = keyof typeof STATUS_FILTERS;
const PUBLISH_FILTERS = { all: "সব", published: "প্রকাশিত", draft: "খসড়া" } as const;
type PublishFilter = keyof typeof PUBLISH_FILTERS;

/** Search text safe for a PostgREST or-filter (no separators/wildcards), ≤ 80 characters. */
function cleanSearch(v: string): string {
  return v.replace(/[,()*%\\:"'.]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

export default async function ProgramsAdminPage({ searchParams }: Props) {
  await requirePagePermission("content.manage");
  const sp = await searchParams;
  const q = cleanSearch(firstParam(sp.q));
  const status: StatusFilter = firstParam(sp.status) in STATUS_FILTERS ? (firstParam(sp.status) as StatusFilter) : "all";
  const published: PublishFilter = firstParam(sp.published) in PUBLISH_FILTERS ? (firstParam(sp.published) as PublishFilter) : "all";
  const category = isUuid(firstParam(sp.category)) ? firstParam(sp.category) : "";
  const page = parsePageParam(sp.page);
  const today = dhakaToday();
  const db = await createClient();

  let list = db
    .from("programs")
    .select(
      "id, slug, title_bn, title_en, starts_on, ends_on, status_override, is_published, first_published_at, updated_at, category:activity_categories(name_bn), photos:gallery_images!gallery_images_program_id_fkey(count)",
      { count: "exact" },
    );
  if (q) list = list.or(`title_bn.ilike.*${q}*,title_en.ilike.*${q}*,slug.ilike.*${q}*`);
  if (category) list = list.eq("category_id", category);
  if (published === "published") list = list.eq("is_published", true);
  if (published === "draft") list = list.eq("is_published", false);
  if (status === "postponed" || status === "cancelled") list = list.eq("status_override", status);
  if (status === "upcoming") list = list.is("status_override", null).gt("starts_on", today);
  if (status === "ongoing") {
    list = list
      .is("status_override", null)
      .lte("starts_on", today)
      .or(`ends_on.gte.${today},and(ends_on.is.null,starts_on.eq.${today})`);
  }
  if (status === "completed") {
    list = list.is("status_override", null).or(`ends_on.lt.${today},and(ends_on.is.null,starts_on.lt.${today})`);
  }

  const [res, cats] = await Promise.all([
    list
      .order("starts_on", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true })
      .range((page - 1) * PER_PAGE, page * PER_PAGE - 1),
    db.from("activity_categories").select("id, name_bn, is_active").order("sort_order").order("name_bn"),
  ]);
  // An out-of-range page answers 416 (PGRST103): show an empty page with a way back.
  const loadError = (res.error && res.error.code !== "PGRST103") || cats.error;
  const rows = res.data ?? [];
  const total = res.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const filtered = Boolean(q || category || status !== "all" || published !== "all");
  const href = (p: number) =>
    hrefWith("/admin/programs", {
      q,
      status: status === "all" ? null : status,
      published: published === "all" ? null : published,
      category,
      page: p,
    });
  const labels = programMessages.bn.status;

  return (
    <>
      <AdminPageHeader
        title="কর্মসূচি"
        description="নির্দিষ্ট তারিখের কার্যক্রম (চলমান, আসন্ন ও সম্পন্ন)। অবস্থা তারিখ থেকে নিজে থেকেই হিসাব হয়।"
        actions={
          <LinkButton href="/admin/programs/new">
            <Plus className="size-5" aria-hidden="true" /> নতুন কর্মসূচি
          </LinkButton>
        }
      />

      {sp.deleted === "1" && (
        <div className="mb-4">
          <Alert tone="success">কর্মসূচিটি মুছে ফেলা হয়েছে।</Alert>
        </div>
      )}

      <form method="get" action="/admin/programs" role="search" aria-label="কর্মসূচি খুঁজুন" className="mb-4 grid gap-3 rounded-[var(--radius-card)] border border-line bg-white p-4 shadow-[var(--shadow-card)] sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto] xl:items-end">
        <div className="space-y-1.5 sm:col-span-2 xl:col-span-1">
          <label htmlFor="programs-q" className="block font-medium">খুঁজুন</label>
          <Input id="programs-q" name="q" type="search" defaultValue={q} placeholder="শিরোনাম বা স্লাগ" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="programs-status" className="block font-medium">অবস্থা</label>
          <Select id="programs-status" name="status" defaultValue={status}>
            {Object.entries(STATUS_FILTERS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="programs-category" className="block font-medium">কার্যক্রমের ক্ষেত্র</label>
          <Select id="programs-category" name="category" defaultValue={category}>
            <option value="">সব ক্ষেত্র</option>
            {(cats.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name_bn}{c.is_active ? "" : " (নিষ্ক্রিয়)"}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="programs-published" className="block font-medium">প্রকাশ</label>
          <Select id="programs-published" name="published" defaultValue={published}>
            {Object.entries(PUBLISH_FILTERS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2 sm:col-span-2 xl:col-span-1">
          <button type="submit" className={buttonClass("primary", "md", "flex-1 xl:flex-none")}>
            <Search className="size-5" aria-hidden="true" /> খুঁজুন
          </button>
          {filtered && (
            <Link href="/admin/programs" className={buttonClass("ghost", "md", "border border-line bg-white")}>রিসেট</Link>
          )}
        </div>
      </form>

      {loadError ? (
        <Alert>কর্মসূচির তালিকা লোড করা যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।</Alert>
      ) : rows.length === 0 ? (
        <EmptyState title={page > 1 ? "এই পৃষ্ঠায় কোনো কর্মসূচি নেই" : filtered ? "এই ফিল্টারে কোনো কর্মসূচি পাওয়া যায়নি" : "এখনো কোনো কর্মসূচি নেই"}>
          {page > 1 ? (
            <Link href={href(1)} className="font-semibold text-brand-700 underline underline-offset-4">প্রথম পৃষ্ঠায় যান</Link>
          ) : filtered ? (
            <Link href="/admin/programs" className="font-semibold text-brand-700 underline underline-offset-4">সব কর্মসূচি দেখুন</Link>
          ) : (
            "“নতুন কর্মসূচি” বোতাম দিয়ে প্রথম কর্মসূচিটি যুক্ত করুন।"
          )}
        </EmptyState>
      ) : (
        <>
          <p className="mb-2 text-sm text-muted" aria-live="polite">
            মোট {bn(total)}টি কর্মসূচি{totalPages > 1 ? ` · পৃষ্ঠা ${bn(Math.min(page, totalPages))} / ${bn(totalPages)}` : ""}
          </p>
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)]" data-testid="program-admin-list">
            {rows.map((p) => {
              const s: ProgramStatus = programStatus(p, today);
              const photoCount = Number(one(p.photos as { count: number }[] | null)?.count ?? 0);
              return (
                <li key={p.id} className="flex flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-center" data-testid="program-row" data-slug={p.slug}>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/programs/${p.id}`} className="min-w-0 break-words font-semibold text-brand-900 underline-offset-4 hover:underline">
                        {p.title_bn}
                      </Link>
                      <StatusBadge status={s} label={labels[s]} className="px-2.5 py-0.5" />
                      {p.is_published ? <Badge tone="green">প্রকাশিত</Badge> : <Badge tone="amber">খসড়া</Badge>}
                      {!p.title_en && <Badge tone="gray">ইংরেজি নেই</Badge>}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-4" aria-hidden="true" />
                        {programDateText(p.starts_on, p.ends_on, "bn")}
                      </span>
                      <span>{one(p.category)?.name_bn ?? "—"}</span>
                      <span className="inline-flex items-center gap-1">
                        <Images className="size-4" aria-hidden="true" />
                        {bn(photoCount)}টি ছবি
                      </span>
                      <code dir="ltr" className="break-all">/programs/{p.slug}</code>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <LinkButton href={`/admin/programs/${p.id}`} variant="outline" size="sm" className="min-h-11" aria-label={`“${p.title_bn}” সম্পাদনা`}>
                      <Pencil className="size-4" aria-hidden="true" /> সম্পাদনা
                    </LinkButton>
                    {p.is_published && (
                      <Link href={`/programs/${p.slug}`} target="_blank" className={buttonClass("ghost", "sm", "min-h-11")}>
                        <ExternalLink className="size-4" aria-hidden="true" /> ওয়েবসাইটে
                        <span className="sr-only">: “{p.title_bn}” (নতুন ট্যাবে খুলবে)</span>
                      </Link>
                    )}
                    <ProgramDeleteButton id={p.id} title={p.title_bn} />
                  </div>
                </li>
              );
            })}
          </ul>
          <AdminPager page={Math.min(page, totalPages)} totalPages={totalPages} hrefFor={href} label="কর্মসূচি তালিকার পৃষ্ঠা" />
        </>
      )}
    </>
  );
}
