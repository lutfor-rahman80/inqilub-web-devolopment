import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Pin, Plus } from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bn, formatDate, formatDateTime } from "@/lib/format";
import { firstParam, parsePageParam } from "@/lib/admin/text";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminPager, hrefWith } from "@/components/admin/pager";
import { AnnouncementDeleteButton } from "@/components/admin/announcement-delete-button";
import { Alert } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = { title: "ঘোষণা" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const PER_PAGE = 20;
const FILTERS = [
  { key: "all", label: "সব" },
  { key: "published", label: "প্রকাশিত" },
  { key: "draft", label: "খসড়া" },
] as const;
type Filter = (typeof FILTERS)[number]["key"];

export default async function AnnouncementsAdminPage({ searchParams }: Props) {
  await requirePagePermission("content.manage");
  const sp = await searchParams;
  const filter: Filter = FILTERS.find((f) => f.key === firstParam(sp.filter))?.key ?? "all";
  const page = parsePageParam(sp.page);
  const db = await createClient();

  const head = { count: "exact" as const, head: true };
  let list = db
    .from("announcements")
    .select("id, title, title_en, is_published, is_pinned, published_at, created_at, updated_at", { count: "exact" })
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  if (filter === "published") list = list.eq("is_published", true);
  if (filter === "draft") list = list.eq("is_published", false);

  const [res, allRes, pubRes] = await Promise.all([
    list,
    db.from("announcements").select("id", head),
    db.from("announcements").select("id", head).eq("is_published", true),
  ]);
  // An out-of-range page answers 416 (PGRST103): show an empty page with a way back.
  const loadError = res.error && res.error.code !== "PGRST103";
  const rows = res.data ?? [];
  const total = res.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const counts: Record<Filter, number | null> = {
    all: allRes.count ?? null,
    published: pubRes.count ?? null,
    draft: allRes.count != null && pubRes.count != null ? allRes.count - pubRes.count : null,
  };
  const href = (p: { filter?: Filter; page?: number }) =>
    hrefWith("/admin/announcements", { filter: (p.filter ?? filter) === "all" ? null : p.filter ?? filter, page: p.page });

  return (
    <>
      <AdminPageHeader
        title="ঘোষণা"
        description="ওয়েবসাইটের “ঘোষণা” পৃষ্ঠা ও হোম পেজে দেখানো নোটিশ।"
        actions={
          <LinkButton href="/admin/announcements/new">
            <Plus className="size-5" aria-hidden="true" /> নতুন ঘোষণা
          </LinkButton>
        }
      />

      {sp.deleted === "1" && (
        <div className="mb-4">
          <Alert tone="success">ঘোষণাটি মুছে ফেলা হয়েছে।</Alert>
        </div>
      )}

      <nav aria-label="ঘোষণার ধরন" className="mb-4">
        <ul className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = f.key === filter;
            return (
              <li key={f.key}>
                <Link
                  href={href({ filter: f.key, page: 1 })}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 font-semibold transition-colors ${
                    active ? "border-brand-700 bg-brand-700 text-white" : "border-line bg-white text-brand-800 hover:bg-brand-50"
                  }`}
                >
                  {f.label}
                  {counts[f.key] !== null && (
                    <span className={`rounded-full px-2 text-sm ${active ? "bg-white/20 text-white" : "bg-stone-100 text-muted"}`}>
                      {bn(counts[f.key]!)}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {loadError ? (
        <Alert>ঘোষণার তালিকা লোড করা যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।</Alert>
      ) : rows.length === 0 ? (
        <EmptyState title={page > 1 ? "এই পৃষ্ঠায় কোনো ঘোষণা নেই" : filter === "all" ? "এখনো কোনো ঘোষণা নেই" : "এই তালিকায় কোনো ঘোষণা নেই"}>
          {page > 1 ? (
            <Link href={href({ page: 1 })} className="font-semibold text-brand-700 underline underline-offset-4">প্রথম পৃষ্ঠায় যান</Link>
          ) : (
            "“নতুন ঘোষণা” বোতাম দিয়ে প্রথম ঘোষণাটি লিখুন।"
          )}
        </EmptyState>
      ) : (
        <>
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)]" data-testid="announcement-list">
            {rows.map((a) => (
              <li key={a.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5" data-testid="announcement-row">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/announcements/${a.id}`} className="min-w-0 break-words font-semibold text-brand-900 underline-offset-4 hover:underline">
                      {a.title}
                    </Link>
                    {a.is_published ? <Badge tone="green">প্রকাশিত</Badge> : <Badge tone="amber">খসড়া</Badge>}
                    {a.is_pinned && (
                      <Badge tone="blue">
                        <Pin className="me-1 size-3.5" aria-hidden="true" /> পিন করা
                      </Badge>
                    )}
                    {a.title_en ? <Badge tone="gray">ইংরেজি আছে</Badge> : null}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {a.is_published && a.published_at ? `প্রকাশ: ${formatDate(a.published_at)}` : `তৈরি: ${formatDate(a.created_at)}`}
                    <span aria-hidden="true"> · </span>
                    সর্বশেষ পরিবর্তন: {formatDateTime(a.updated_at)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <LinkButton href={`/admin/announcements/${a.id}`} variant="outline" size="sm" className="min-h-11" aria-label={`“${a.title}” সম্পাদনা`}>
                    <Pencil className="size-4" aria-hidden="true" /> সম্পাদনা
                  </LinkButton>
                  <AnnouncementDeleteButton id={a.id} title={a.title} />
                </div>
              </li>
            ))}
          </ul>
          <AdminPager page={Math.min(page, totalPages)} totalPages={totalPages} hrefFor={(p) => href({ page: p })} label="ঘোষণা তালিকার পৃষ্ঠা" />
        </>
      )}
    </>
  );
}
