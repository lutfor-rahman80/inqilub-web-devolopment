import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { z } from "zod";
import { requirePagePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MEMBER_STATUS, bn, formatDate, formatDateTime, type MemberStatus } from "@/lib/format";
import { ageOn, todayInDhaka } from "@/lib/membership/normalize";
import { isPubliclyListed, needsGuardianConsent } from "@/lib/membership/display";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Alert } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MemberAvatar } from "@/components/membership/member-avatar";
import { MemberForm } from "@/components/membership/admin/member-form";
import { PhotoManager } from "@/components/membership/admin/photo-manager";
import { MemberVersionProvider } from "@/components/membership/admin/member-version";

export const metadata: Metadata = { title: "সদস্যের রেকর্ড" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 px-5 py-3 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm text-muted sm:text-base">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-ink">{children}</dd>
    </div>
  );
}

const yes = (v: boolean) => (v ? "হ্যাঁ" : "না");

export default async function MemberDetailPage({ params, searchParams }: Props) {
  const staff = await requirePagePermission("members.view", "members.manage");
  const { id } = await params;
  const sp = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const [{ data: m }, { data: designations }] = await Promise.all([
    supabase.from("members").select("*, designations(name_bn)").eq("id", id).maybeSingle(),
    supabase.from("designations").select("id, name_bn, is_active").order("rank_order"),
  ]);
  if (!m) notFound();

  const canManage = staff.permissions.has("members.manage");
  const canSeeApplication = staff.permissions.has("applications.view") && Boolean(m.application_id);
  const st = MEMBER_STATUS[m.status as MemberStatus] ?? { label: m.status, tone: "gray" as const };
  const today = todayInDhaka();
  const visible = isPubliclyListed(m, today);
  const age = m.date_of_birth ? ageOn(m.date_of_birth, today) : null;
  // Would be listed, but is under 18 without a recorded guardian consent.
  const heldBack =
    !visible && m.status === "active" && m.show_in_directory && m.directory_consent && needsGuardianConsent(m, today);

  return (
    <>
      <Link href="/admin/members" className="mb-3 inline-flex min-h-11 items-center gap-1.5 font-medium text-brand-700 hover:underline">
        <ArrowLeft className="size-5" aria-hidden="true" />
        সব সদস্য
      </Link>
      {/* overflow-wrap is inherited: a very long name without spaces wraps instead of widening the page. */}
      <div className="wrap-anywhere">
      <AdminPageHeader
        title={m.full_name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <strong dir="ltr" className="tabular-nums text-ink" data-testid="member-detail-no">{m.member_no}</strong>
            <span>· {m.designations?.name_bn}</span>
            <Badge tone={st.tone}>{st.label}</Badge>
            {visible ? <Badge tone="gold">সদস্য তালিকায় প্রকাশিত</Badge> : <Badge tone="gray">তালিকায় প্রকাশিত নয়</Badge>}
            {heldBack && <Badge tone="amber">১৮ বছরের কম — অভিভাবকের সম্মতি নেই</Badge>}
          </span>
        }
      />
      </div>

      {sp.created === "1" && (
        <div className="mb-5">
          <Alert tone="success">নতুন সদস্য যোগ করা হয়েছে। প্রয়োজনে এখন ছবি যুক্ত করুন।</Alert>
        </div>
      )}

      <MemberVersionProvider value={m.updated_at}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0">
            {canManage ? (
              <MemberForm
                mode="edit"
                memberId={m.id}
                updatedAt={m.updated_at}
                maxDate={today}
                designations={designations ?? []}
                initial={{
                  full_name: m.full_name,
                  designation_id: m.designation_id,
                  status: m.status as MemberStatus,
                  mobile: m.mobile ?? "",
                  email: m.email ?? "",
                  blood_group: m.blood_group ?? "",
                  joined_on: m.joined_on,
                  date_of_birth: m.date_of_birth ?? "",
                  sort_order: m.sort_order,
                  notes: m.notes ?? "",
                  directory_consent: m.directory_consent,
                  show_in_directory: m.show_in_directory,
                  public_phone_consent: m.public_phone_consent,
                  public_phone: m.public_phone ?? "",
                  guardian_consent: m.guardian_consent,
                }}
              />
            ) : (
              <Card className="overflow-hidden" data-testid="member-readonly">
                <h2 className="border-b border-line bg-cream/70 px-5 py-3 font-sans text-lg font-semibold text-brand-900">সদস্যের তথ্য (শুধু দেখার অনুমতি)</h2>
                <dl className="divide-y divide-line">
                  <Row label="পূর্ণ নাম">{m.full_name}</Row>
                  <Row label="পদবী">{m.designations?.name_bn}</Row>
                  <Row label="অবস্থা">{st.label}</Row>
                  <Row label="যোগদানের তারিখ">{formatDate(m.joined_on)}</Row>
                  <Row label="জন্ম তারিখ">
                    {m.date_of_birth ? (
                      <span data-testid="member-readonly-dob">
                        {formatDate(m.date_of_birth)}
                        {age !== null && <span className="text-muted"> (বয়স {bn(age)} বছর)</span>}
                      </span>
                    ) : (
                      "—"
                    )}
                  </Row>
                  <Row label="মোবাইল">{m.mobile ? <span dir="ltr">{m.mobile}</span> : "—"}</Row>
                  <Row label="ইমেইল">{m.email ?? "—"}</Row>
                  <Row label="রক্তের গ্রুপ">{m.blood_group ?? "—"}</Row>
                  <Row label="তালিকায় প্রকাশে সম্মতি">{yes(m.directory_consent)}</Row>
                  <Row label="অভিভাবকের সম্মতি (১৮-এর কম হলে)">{yes(m.guardian_consent)}</Row>
                  <Row label="তালিকায় দেখানো হচ্ছে">{yes(visible)}</Row>
                  <Row label="ফোন প্রকাশে সম্মতি">{yes(m.public_phone_consent)}</Row>
                  <Row label="প্রকাশিত ফোন">{m.public_phone ? <span dir="ltr">{m.public_phone}</span> : "—"}</Row>
                  <Row label="তালিকায় ক্রম">{bn(m.sort_order)}</Row>
                  <Row label="নোট"><span className="whitespace-pre-line">{m.notes ?? "—"}</span></Row>
                </dl>
              </Card>
            )}
          </div>

          <aside className="min-w-0 space-y-6">
            <Card className="p-5">
              <h2 className="font-sans text-lg font-semibold text-brand-900">ছবি</h2>
              <div className="mt-3">
                {canManage ? (
                  <PhotoManager memberId={m.id} name={m.full_name} photoPath={m.photo_path} />
                ) : (
                  <MemberAvatar name={m.full_name} photoPath={m.photo_path} size={112} eager />
                )}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="font-sans text-lg font-semibold text-brand-900">রেকর্ড</h2>
              <dl className="mt-3 space-y-2 text-[0.95rem]">
                <div>
                  <dt className="text-muted">উৎস</dt>
                  <dd>{m.application_id ? "অনলাইন আবেদন অনুমোদন" : "সরাসরি যোগ করা (কাগজের ফরম)"}</dd>
                </div>
                <div>
                  <dt className="text-muted">রেকর্ড তৈরি</dt>
                  <dd>{formatDateTime(m.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-muted">সর্বশেষ পরিবর্তন</dt>
                  <dd>{formatDateTime(m.updated_at)}</dd>
                </div>
              </dl>
              {canSeeApplication && (
                <Link href={`/admin/applications/${m.application_id}`} className="mt-3 inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand-700 underline underline-offset-4" data-testid="member-application-link">
                  <FileText className="size-5" aria-hidden="true" />
                  মূল আবেদন দেখুন
                </Link>
              )}
              {visible && (
                <Link href="/members" target="_blank" className="mt-1 flex min-h-11 items-center gap-1.5 font-semibold text-brand-700 underline underline-offset-4">
                  <ExternalLink className="size-5" aria-hidden="true" />
                  পাবলিক সদস্য তালিকা<span className="sr-only"> (নতুন ট্যাবে খুলবে)</span>
                </Link>
              )}
            </Card>
          </aside>
        </div>
      </MemberVersionProvider>
    </>
  );
}
