import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Mail, Phone } from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bn, formatDateTime } from "@/lib/format";
import { firstParam, parsePageParam } from "@/lib/admin/text";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminPager, hrefWith } from "@/components/admin/pager";
import { Alert } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/card";

export const metadata: Metadata = { title: "বার্তা" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const PER_PAGE = 20;
const FILTERS = [
  { key: "all", label: "সব বার্তা" },
  { key: "unread", label: "অপঠিত" },
] as const;
type Filter = (typeof FILTERS)[number]["key"];

function preview(text: string, max = 140) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

export default async function MessagesPage({ searchParams }: Props) {
  await requirePagePermission("messages.view");
  const sp = await searchParams;
  const filter: Filter = firstParam(sp.filter) === "unread" ? "unread" : "all";
  const page = parsePageParam(sp.page);
  const db = await createClient();

  // Unread first, newest first (index: contact_messages_created_idx).
  let list = db
    .from("contact_messages")
    .select("id, name, mobile, email, subject, message, is_read, created_at", { count: "exact" })
    .order("is_read", { ascending: true })
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  if (filter === "unread") list = list.eq("is_read", false);

  const [res, allRes, unreadRes] = await Promise.all([
    list,
    db.from("contact_messages").select("id", { count: "exact", head: true }),
    db.from("contact_messages").select("id", { count: "exact", head: true }).eq("is_read", false),
  ]);
  const loadError = res.error && res.error.code !== "PGRST103";
  const rows = res.data ?? [];
  const total = res.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const counts: Record<Filter, number | null> = { all: allRes.count ?? null, unread: unreadRes.count ?? null };
  const href = (p: { filter?: Filter; page?: number }) =>
    hrefWith("/admin/messages", { filter: (p.filter ?? filter) === "all" ? null : p.filter ?? filter, page: p.page });

  return (
    <>
      <AdminPageHeader title="বার্তা" description="ওয়েবসাইটের যোগাযোগ ফর্ম থেকে পাঠানো বার্তা। অপঠিত বার্তা শুরুতে দেখানো হয়।" />

      {sp.deleted === "1" && (
        <div className="mb-4">
          <Alert tone="success">বার্তাটি মুছে ফেলা হয়েছে।</Alert>
        </div>
      )}

      <nav aria-label="বার্তার ধরন" className="mb-4">
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
                    <span className={`rounded-full px-2 text-sm ${active ? "bg-white/20 text-white" : "bg-stone-100 text-muted"}`} data-testid={`count-${f.key}`}>
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
        <Alert>বার্তার তালিকা লোড করা যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।</Alert>
      ) : rows.length === 0 ? (
        <EmptyState title={page > 1 ? "এই পৃষ্ঠায় কোনো বার্তা নেই" : filter === "unread" ? "কোনো অপঠিত বার্তা নেই" : "এখনো কোনো বার্তা আসেনি"}>
          {page > 1 ? (
            <Link href={href({ page: 1 })} className="font-semibold text-brand-700 underline underline-offset-4">প্রথম পৃষ্ঠায় যান</Link>
          ) : filter === "unread" ? (
            "সব বার্তা পড়া হয়েছে।"
          ) : (
            "ওয়েবসাইটের যোগাযোগ পৃষ্ঠা থেকে কেউ বার্তা পাঠালে এখানে দেখা যাবে।"
          )}
        </EmptyState>
      ) : (
        <>
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)]" data-testid="message-list">
            {rows.map((m) => (
              <li key={m.id} data-testid="message-row" data-unread={m.is_read ? undefined : "true"}>
                <Link
                  href={`/admin/messages/${m.id}`}
                  className={`flex items-start gap-3 px-4 py-4 transition-colors sm:px-5 ${m.is_read ? "hover:bg-brand-50/40" : "bg-gold-50 hover:bg-gold-100/70"}`}
                >
                  <span className="mt-2 flex size-2.5 shrink-0 items-center justify-center" aria-hidden="true">
                    {!m.is_read && <span className="size-2.5 rounded-full bg-gold-600" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className={`min-w-0 break-words ${m.is_read ? "text-ink" : "font-bold text-brand-900"}`}>
                        {!m.is_read && <span className="sr-only">অপঠিত: </span>}
                        {m.subject}
                      </span>
                      <time dateTime={m.created_at} className="shrink-0 text-sm text-muted">{formatDateTime(m.created_at)}</time>
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                      <span className="font-medium text-ink/80">{m.name}</span>
                      {m.mobile && (
                        <span className="inline-flex items-center gap-1" dir="ltr"><Phone className="size-3.5" aria-hidden="true" />{m.mobile}</span>
                      )}
                      {m.email && (
                        <span className="inline-flex min-w-0 items-center gap-1 break-all" dir="ltr"><Mail className="size-3.5 shrink-0" aria-hidden="true" />{m.email}</span>
                      )}
                    </span>
                    <span className="mt-1 block break-words text-muted">{preview(m.message)}</span>
                  </span>
                  <ChevronRight className="mt-1 size-5 shrink-0 text-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          <AdminPager page={Math.min(page, totalPages)} totalPages={totalPages} hrefFor={(p) => href({ page: p })} label="বার্তা তালিকার পৃষ্ঠা" />
        </>
      )}
    </>
  );
}
