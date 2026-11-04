import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ExternalLink, Newspaper, Pencil, Plus, Search, Video } from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bn, formatDate } from "@/lib/format";
import { firstParam, parsePageParam } from "@/lib/admin/text";
import { safeHttpsUrl } from "@/lib/site/urls";
import { isPressKind, type PressKind } from "@/lib/press/schemas";
import { youtubeId } from "@/lib/press/youtube";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminPager, hrefWith } from "@/components/admin/pager";
import { Alert, Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/card";
import { buttonClass, LinkButton } from "@/components/ui/button";
import { PressDeleteButton } from "@/components/press/admin/press-delete-button";

export const metadata: Metadata = { title: "Notice" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const PER_PAGE = 20;
const KIND_LABELS: Record<PressKind, string> = { news: "সংবাদ", interview: "সাক্ষাৎকার", video_report: "ভিডিও প্রতিবেদন" };
const PUBLISH_FILTERS = { all: "সব", published: "প্রকাশিত", draft: "খসড়া" } as const;
type PublishFilter = keyof typeof PUBLISH_FILTERS;

function cleanSearch(v: string): string {
  return v.replace(/[,()*%\\:"'.]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

export default async function PressAdminPage({ searchParams }: Props) {
  await requirePagePermission("content.manage");
  const sp = await searchParams;
  const q = cleanSearch(firstParam(sp.q));
  const kind = isPressKind(firstParam(sp.kind)) ? (firstParam(sp.kind) as PressKind) : null;
  const published: PublishFilter = firstParam(sp.published) in PUBLISH_FILTERS ? (firstParam(sp.published) as PublishFilter) : "all";
  const page = parsePageParam(sp.page);
  const db = await createClient();

  let list = db
    .from("press_items")
    .select("id, kind, title_bn, title_en, outlet_bn, url, published_on, is_published, program:programs(id, title_bn)", { count: "exact" });
  if (q) list = list.or(`title_bn.ilike.*${q}*,title_en.ilike.*${q}*,outlet_bn.ilike.*${q}*,outlet_en.ilike.*${q}*`);
  if (kind) list = list.eq("kind", kind);
  if (published === "published") list = list.eq("is_published", true);
  if (published === "draft") list = list.eq("is_published", false);
  const res = await list
    .order("published_on", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

  const loadError = res.error && res.error.code !== "PGRST103";
  const rows = res.data ?? [];
  const total = res.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const filtered = Boolean(q || kind || published !== "all");
  const href = (p: number) =>
    hrefWith("/admin/notice", { q, kind, published: published === "all" ? null : published, page: p });

  return (
    <>
      <AdminPageHeader
        title="Notice"
        description="সংবাদমাধ্যমে প্রকাশিত আমাদের কার্যক্রমের খবর ও চ্যানেলকে দেওয়া সাক্ষাৎকার। ওয়েবসাইটে শুধু মূল প্রতিবেদনের লিংক দেখানো হয়।"
        actions={
          <LinkButton href="/admin/notice/new">
            <Plus className="size-5" aria-hidden="true" /> নতুন প্রতিবেদন
          </LinkButton>
        }
      />

      {sp.deleted === "1" && (
        <div className="mb-4">
          <Alert tone="success">প্রতিবেদনটি মুছে ফেলা হয়েছে।</Alert>
        </div>
      )}

      <form
        method="get"
        action="/admin/notice"
        role="search"
        aria-label="প্রতিবেদন খুঁজুন"
        className="mb-4 grid gap-3 rounded-[var(--radius-card)] border border-line bg-white p-4 shadow-[var(--shadow-card)] sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))_auto] lg:items-end"
      >
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <label htmlFor="press-q" className="block font-medium">খুঁজুন</label>
          <Input id="press-q" name="q" type="search" defaultValue={q} placeholder="শিরোনাম বা সংবাদমাধ্যম" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="press-kind" className="block font-medium">ধরন</label>
          <Select id="press-kind" name="kind" defaultValue={kind ?? ""}>
            <option value="">সব ধরন</option>
            {Object.entries(KIND_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="press-published" className="block font-medium">প্রকাশ</label>
          <Select id="press-published" name="published" defaultValue={published}>
            {Object.entries(PUBLISH_FILTERS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
          <button type="submit" className={buttonClass("primary", "md", "flex-1 lg:flex-none")}>
            <Search className="size-5" aria-hidden="true" /> খুঁজুন
          </button>
          {filtered && <Link href="/admin/notice" className={buttonClass("ghost", "md", "border border-line bg-white")}>রিসেট</Link>}
        </div>
      </form>

      {loadError ? (
        <Alert>তালিকা লোড করা যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।</Alert>
      ) : rows.length === 0 ? (
        <EmptyState title={page > 1 ? "এই পৃষ্ঠায় কোনো প্রতিবেদন নেই" : filtered ? "এই ফিল্টারে কোনো প্রতিবেদন পাওয়া যায়নি" : "এখনো কোনো প্রতিবেদন যুক্ত হয়নি"}>
          {page > 1 ? (
            <Link href={href(1)} className="font-semibold text-brand-700 underline underline-offset-4">প্রথম পৃষ্ঠায় যান</Link>
          ) : filtered ? (
            <Link href="/admin/notice" className="font-semibold text-brand-700 underline underline-offset-4">সব প্রতিবেদন দেখুন</Link>
          ) : (
            "“নতুন প্রতিবেদন” বোতাম দিয়ে প্রথম সংবাদ বা সাক্ষাৎকারের লিংক যুক্ত করুন।"
          )}
        </EmptyState>
      ) : (
        <>
          <p className="mb-2 text-sm text-muted" aria-live="polite">
            মোট {bn(total)}টি প্রতিবেদন{totalPages > 1 ? ` · পৃষ্ঠা ${bn(Math.min(page, totalPages))} / ${bn(totalPages)}` : ""}
          </p>
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)]" data-testid="press-admin-list">
            {rows.map((r) => {
              const url = safeHttpsUrl(r.url);
              const program = one(r.program);
              return (
                <li key={r.id} className="flex flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-center" data-testid="press-row">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/notice/${r.id}`} className="min-w-0 break-words font-semibold text-brand-900 underline-offset-4 hover:underline">
                        {r.title_bn}
                      </Link>
                      <Badge tone={r.kind === "news" ? "green" : r.kind === "interview" ? "gold" : "blue"}>
                        {isPressKind(r.kind) ? KIND_LABELS[r.kind] : r.kind}
                      </Badge>
                      {r.is_published ? <Badge tone="green">প্রকাশিত</Badge> : <Badge tone="amber">খসড়া</Badge>}
                      {youtubeId(url) && (
                        <Badge tone="red">
                          <Video className="me-1 size-3.5" aria-hidden="true" /> ইউটিউব
                        </Badge>
                      )}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Newspaper className="size-4" aria-hidden="true" /> {r.outlet_bn}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-4" aria-hidden="true" /> {formatDate(r.published_on)}
                      </span>
                      {program && <span>কর্মসূচি: {program.title_bn}</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <LinkButton href={`/admin/notice/${r.id}`} variant="outline" size="sm" className="min-h-11" aria-label={`“${r.title_bn}” সম্পাদনা`}>
                      <Pencil className="size-4" aria-hidden="true" /> সম্পাদনা
                    </LinkButton>
                    {url && (
                      <a href={url} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost", "sm", "min-h-11")}>
                        <ExternalLink className="size-4" aria-hidden="true" /> মূল লিংক
                        <span className="sr-only">: “{r.title_bn}” (নতুন ট্যাবে খুলবে)</span>
                      </a>
                    )}
                    <PressDeleteButton id={r.id} title={r.title_bn} />
                  </div>
                </li>
              );
            })}
          </ul>
          <AdminPager page={Math.min(page, totalPages)} totalPages={totalPages} hrefFor={href} label="Notice তালিকার পৃষ্ঠা" />
        </>
      )}
    </>
  );
}
