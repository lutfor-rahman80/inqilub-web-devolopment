import type { Metadata } from "next";
import Link from "next/link";
import { Filter, X } from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bn, formatDate } from "@/lib/format";
import { AUDIT_ENTITIES, describeAudit } from "@/lib/admin/audit";
import { AUDIT_COLUMNS, loadAuditLookups } from "@/lib/admin/queries";
import { canonicalUuid, dhakaDayEnd, dhakaDayStart, firstParam, isIsoDate, parsePageParam } from "@/lib/admin/text";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminPager, hrefWith } from "@/components/admin/pager";
import { AuditEntry } from "@/components/admin/audit-entry";
import { Alert, inputClass } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "অডিট লগ" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const PER_PAGE = 50;
const SYSTEM = "system";

export default async function AuditPage({ searchParams }: Props) {
  await requirePagePermission("audit.view");
  const sp = await searchParams;
  const page = parsePageParam(sp.page);

  const entityParam = firstParam(sp.entity);
  const entity = Object.hasOwn(AUDIT_ENTITIES, entityParam) ? entityParam : "";
  const actorParam = firstParam(sp.actor);
  const actor = actorParam === SYSTEM ? SYSTEM : (canonicalUuid(actorParam) ?? "");
  let from = isIsoDate(firstParam(sp.from)) ? firstParam(sp.from) : "";
  let to = isIsoDate(firstParam(sp.to)) ? firstParam(sp.to) : "";
  const swapped = Boolean(from && to && from > to);
  if (swapped) [from, to] = [to, from];
  const filtered = Boolean(entity || actor || from || to);

  const db = await createClient();
  let query = db
    .from("audit_logs")
    .select(AUDIT_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  if (entity) query = query.eq("entity_type", entity);
  if (actor === SYSTEM) query = query.is("actor_id", null);
  else if (actor) query = query.eq("actor_id", actor);
  if (from) query = query.gte("created_at", dhakaDayStart(from));
  if (to) query = query.lt("created_at", dhakaDayEnd(to));

  const [res, staffRes] = await Promise.all([
    query,
    db.from("staff_profiles").select("id, full_name, is_active").order("full_name"),
  ]);
  const lookups = await loadAuditLookups(db, res.data ?? []);
  const loadError = res.error && res.error.code !== "PGRST103";
  const entries = (res.data ?? []).map((r) => describeAudit(r, lookups));
  const total = res.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const params = { entity, actor, from, to };
  const href = (p: number) => hrefWith("/admin/audit", { ...params, page: p });

  return (
    <>
      <AdminPageHeader
        title="অডিট লগ"
        description="অ্যাডমিন প্যানেলে কে, কখন, কী পরিবর্তন করেছেন তার রেকর্ড। ব্যক্তিগত তথ্যের মান (যেমন মোবাইল, ঠিকানা) লগে রাখা হয় না; শুধু কোন তথ্য বদলেছে তা দেখানো হয়।"
      />

      {/*
        key: the selects/inputs are uncontrolled (defaultValue), and React does
        not re-apply defaultValue to mounted fields. Remounting the form when
        the filters in the URL change (e.g. "সব ফিল্টার মুছুন", Back) keeps
        what the form shows — and submits next — equal to the active filters.
      */}
      <form key={`${entity}|${actor}|${from}|${to}`} method="get" action="/admin/audit" role="search" aria-label="অডিট লগ ফিল্টার" className="mb-5 rounded-[var(--radius-card)] border border-line bg-white p-4 shadow-[var(--shadow-card)]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <label htmlFor="f-entity" className="block font-medium">বিষয়</label>
            <select id="f-entity" name="entity" defaultValue={entity} className={`${inputClass} pe-8`}>
              <option value="">সব বিষয়</option>
              {Object.entries(AUDIT_ENTITIES).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="f-actor" className="block font-medium">যিনি করেছেন</label>
            <select id="f-actor" name="actor" defaultValue={actor} className={`${inputClass} pe-8`}>
              <option value="">সবাই</option>
              <option value={SYSTEM}>পাবলিক / সিস্টেম</option>
              {(staffRes.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.full_name}{s.is_active ? "" : " (নিষ্ক্রিয়)"}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="f-from" className="block font-medium">শুরুর তারিখ</label>
            <input id="f-from" name="from" type="date" defaultValue={from} className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="f-to" className="block font-medium">শেষের তারিখ</label>
            <input id="f-to" name="to" type="date" defaultValue={to} className={inputClass} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" className={buttonClass("primary", "md")}>
            <Filter className="size-5" aria-hidden="true" /> ফিল্টার করুন
          </button>
          {filtered && (
            <Link href="/admin/audit" className={buttonClass("ghost", "md", "border border-line bg-white")}>
              <X className="size-5" aria-hidden="true" /> সব ফিল্টার মুছুন
            </Link>
          )}
        </div>
      </form>

      {swapped && (
        <div className="mb-4">
          <Alert tone="info">শুরুর তারিখ শেষের তারিখের পরে ছিল, তাই তারিখ দুটি অদলবদল করে দেখানো হচ্ছে।</Alert>
        </div>
      )}

      {loadError ? (
        <Alert>অডিট লগ লোড করা যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।</Alert>
      ) : (
        <>
          <p className="mb-3 text-muted" data-testid="audit-count">
            {filtered ? "ফিল্টার অনুযায়ী " : "মোট "}
            {bn(total)}টি এন্ট্রি
            {from || to ? ` (${from ? formatDate(from) : "শুরু"} – ${to ? formatDate(to) : "আজ"})` : ""}
            {totalPages > 1 ? ` · পৃষ্ঠা ${bn(Math.min(page, totalPages))} / ${bn(totalPages)}` : ""}
          </p>
          {entries.length === 0 ? (
            <EmptyState title={page > 1 ? "এই পৃষ্ঠায় কোনো এন্ট্রি নেই" : filtered ? "এই ফিল্টারে কোনো এন্ট্রি নেই" : "এখনো কোনো কার্যক্রম রেকর্ড হয়নি"}>
              {page > 1 ? (
                <Link href={href(1)} className="font-semibold text-brand-700 underline underline-offset-4">প্রথম পৃষ্ঠায় যান</Link>
              ) : filtered ? (
                "অন্য বিষয়, ব্যক্তি বা তারিখ বেছে দেখুন।"
              ) : null}
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)]" data-testid="audit-list">
              {entries.map((e) => (
                <AuditEntry key={e.id} entry={e} />
              ))}
            </ul>
          )}
          <AdminPager page={Math.min(page, totalPages)} totalPages={totalPages} hrefFor={href} label="অডিট লগের পৃষ্ঠা" />
        </>
      )}
    </>
  );
}
