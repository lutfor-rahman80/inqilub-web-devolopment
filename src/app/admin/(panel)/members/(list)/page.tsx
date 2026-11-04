import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Plus, Search, X } from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MEMBER_STATUS, bn, formatDate, toAsciiDigits, type MemberStatus } from "@/lib/format";
import { cleanSearch, escapeLike, parsePositiveInt, todayInDhaka } from "@/lib/membership/normalize";
import { isPubliclyListed, needsGuardianConsent } from "@/lib/membership/display";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Alert, inputClass } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { LinkButton, buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { MemberAvatar } from "@/components/membership/member-avatar";
import { Pagination, withQuery } from "@/components/membership/pagination";

export const metadata: Metadata = { title: "সদস্য" };

const PAGE_SIZE = 25;
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function searchFilter(q: string): string {
  const ascii = toAsciiDigits(q);
  const terms = new Set([q, ascii]);
  const digits = ascii.replace(/[\s-]/g, "");
  if (/^\+?\d{4,}$/.test(digits)) terms.add(digits.replace(/^\+?880?(?=1)/, "0"));
  const parts: string[] = [];
  for (const t of terms) {
    const v = `"%${escapeLike(t).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}%"`;
    parts.push(`full_name.ilike.${v}`, `member_no.ilike.${v}`, `mobile.ilike.${v}`);
  }
  return parts.join(",");
}

export default async function MembersAdminPage({ searchParams }: Props) {
  const staff = await requirePagePermission("members.view", "members.manage");
  const canManage = staff.permissions.has("members.manage");
  const sp = await searchParams;
  const q = cleanSearch(sp.q);
  const page = parsePositiveInt(sp.page);
  const rawStatus = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const status = rawStatus && rawStatus in MEMBER_STATUS ? (rawStatus as MemberStatus) : null;
  const designationId = parsePositiveInt(sp.designation, 0, 32767) || null;

  const supabase = await createClient();
  let query = supabase
    .from("members")
    .select("id, member_no, full_name, photo_path, status, mobile, show_in_directory, directory_consent, date_of_birth, guardian_consent, joined_on, designations(name_bn)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) query = query.or(searchFilter(q));
  if (status) query = query.eq("status", status);
  if (designationId) query = query.eq("designation_id", designationId);

  const [{ data, count, error }, { data: designations }] = await Promise.all([
    query,
    supabase.from("designations").select("id, name_bn").order("rank_order"),
  ]);
  const rows = error?.code === "PGRST103" ? [] : data ?? [];
  const today = todayInDhaka();
  /** Would be listed, but is under 18 without a recorded guardian consent. */
  const heldBack = (m: (typeof rows)[number]) =>
    m.status === "active" && m.show_in_directory && m.directory_consent && needsGuardianConsent(m, today);
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const loadError = error && error.code !== "PGRST103";
  const filtered = Boolean(q || status || designationId);
  const href = (p: number) => withQuery("/admin/members", { q, status, designation: designationId, page: p > 1 ? p : null });
  // A page past the end (records moved/filtered away, or an old link): go to the last page.
  if (!loadError && page > totalPages) redirect(href(totalPages));

  return (
    <>
      <AdminPageHeader
        title="সদস্য"
        description="অনুমোদিত ও কাগজের ফরমের সদস্যদের রেকর্ড, পদবী, ছবি ও সদস্য তালিকায় প্রকাশ।"
        actions={
          canManage ? (
            <LinkButton href="/admin/members/new">
              <Plus className="size-5" aria-hidden="true" />
              নতুন সদস্য যোগ করুন
            </LinkButton>
          ) : undefined
        }
      />

      <form method="get" action="/admin/members" role="search" className="mb-5 grid gap-3 rounded-[var(--radius-card)] border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_12rem_12rem_auto] lg:items-end">
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <label htmlFor="members-q" className="block text-sm font-medium">খুঁজুন</label>
          <input id="members-q" name="q" type="search" defaultValue={q} maxLength={80} placeholder="নাম, সদস্য নম্বর বা মোবাইল" className={inputClass} autoComplete="off" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="members-designation" className="block text-sm font-medium">পদবী</label>
          <select id="members-designation" name="designation" defaultValue={designationId ?? ""} className={`${inputClass} pe-8`}>
            <option value="">সব পদবী</option>
            {(designations ?? []).map((d) => (
              <option key={d.id} value={d.id}>{d.name_bn}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="members-status" className="block text-sm font-medium">অবস্থা</label>
          <select id="members-status" name="status" defaultValue={status ?? ""} className={`${inputClass} pe-8`}>
            <option value="">সব অবস্থা</option>
            {(Object.keys(MEMBER_STATUS) as MemberStatus[]).map((s) => (
              <option key={s} value={s}>{MEMBER_STATUS[s].label}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
          <button type="submit" className={buttonClass("primary", "md", "flex-1 lg:flex-none")}>
            <Search className="size-5" aria-hidden="true" />
            খুঁজুন
          </button>
          {filtered && (
            <Link href="/admin/members" className={buttonClass("ghost", "md", "border border-line bg-white")}>
              <X className="size-5" aria-hidden="true" />
              মুছুন
            </Link>
          )}
        </div>
      </form>

      {loadError && (
        <div className="mb-4">
          <Alert>সদস্য তালিকা লোড করা যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।</Alert>
        </div>
      )}

      <p className="mb-3 text-muted" data-testid="members-admin-count">
        {filtered ? "ফিল্টার অনুযায়ী " : "মোট "}
        {bn(total)} জন সদস্য{totalPages > 1 ? ` · পৃষ্ঠা ${bn(page)} / ${bn(totalPages)}` : ""}
      </p>

      {rows.length === 0 && !loadError ? (
        <EmptyState title={filtered ? "কোনো সদস্য পাওয়া যায়নি" : "এখনো কোনো সদস্য নেই"}>
          {filtered ? "ফিল্টার পরিবর্তন করে আবার খুঁজুন।" : "আবেদন অনুমোদন করলে অথবা “নতুন সদস্য যোগ করুন” থেকে সদস্য যুক্ত হবে।"}
        </EmptyState>
      ) : (
        <>
          <ul className="grid gap-3 lg:hidden" aria-label="সদস্য তালিকা">
            {rows.map((m) => {
              const st = MEMBER_STATUS[m.status as MemberStatus] ?? { label: m.status, tone: "gray" as const };
              const listed = isPubliclyListed(m, today);
              return (
                <li key={m.id} className="min-w-0">
                  <Link href={`/admin/members/${m.id}`} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-white p-3 shadow-[var(--shadow-card)] hover:border-brand-200">
                    <MemberAvatar name={m.full_name} photoPath={m.photo_path} size={52} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-brand-900 wrap-anywhere">{m.full_name}</p>
                      <p className="text-sm text-muted">
                        {m.designations?.name_bn} · <span dir="ltr" className="tabular-nums">{m.member_no}</span>
                      </p>
                      <p className="mt-1 flex flex-wrap gap-1.5">
                        <Badge tone={st.tone}>{st.label}</Badge>
                        {listed && <Badge tone="gold">তালিকায় প্রকাশিত</Badge>}
                        {heldBack(m) && <Badge tone="amber">অভিভাবকের সম্মতি প্রয়োজন</Badge>}
                      </p>
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="hidden overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)] lg:block">
            <table className="w-full" data-testid="members-table">
              <caption className="sr-only">সদস্য তালিকা</caption>
              <thead className="bg-cream text-sm text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">সদস্য ও পদবী</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">সদস্য নম্বর</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">মোবাইল</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">যোগদান</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">অবস্থা</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">বিস্তারিত</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((m) => {
                  const st = MEMBER_STATUS[m.status as MemberStatus] ?? { label: m.status, tone: "gray" as const };
                  const listed = isPubliclyListed(m, today);
                  return (
                    <tr key={m.id} className="hover:bg-brand-50/40">
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-3">
                          <MemberAvatar name={m.full_name} photoPath={m.photo_path} size={44} />
                          <span className="min-w-0">
                            <span className="block font-semibold text-brand-900 wrap-anywhere">{m.full_name}</span>
                            <span className="block text-sm text-muted">{m.designations?.name_bn}</span>
                          </span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums" dir="ltr">{m.member_no}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums" dir="ltr">{m.mobile ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-sm">{formatDate(m.joined_on)}</td>
                      <td className="px-4 py-2.5">
                        <span className="flex flex-wrap gap-1.5">
                          <Badge tone={st.tone}>{st.label}</Badge>
                          {listed && <Badge tone="gold">তালিকায় প্রকাশিত</Badge>}
                          {heldBack(m) && <Badge tone="amber">অভিভাবকের সম্মতি প্রয়োজন</Badge>}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-end">
                        <Link href={`/admin/members/${m.id}`} className="inline-flex min-h-11 items-center gap-1 whitespace-nowrap rounded-lg px-2 font-semibold text-brand-700 hover:bg-brand-50" aria-label={`${m.full_name}-এর রেকর্ড ${canManage ? "সম্পাদনা" : "দেখুন"}`}>
                          {canManage ? "সম্পাদনা" : "দেখুন"}
                          <ChevronRight className="size-4" aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={Math.min(page, totalPages)} totalPages={totalPages} hrefFor={href} label="সদস্য তালিকার পৃষ্ঠা" />
        </>
      )}
    </>
  );
}
