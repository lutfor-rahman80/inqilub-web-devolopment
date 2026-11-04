import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft, CircleCheck, CircleMinus, ExternalLink, Mail, Phone, UserRound } from "lucide-react";
import { z } from "zod";
import { requirePagePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { APPLICATION_STATUS, bn, formatDate, formatDateTime, type ApplicationStatus } from "@/lib/format";
import { ageOn } from "@/lib/membership/normalize";
import { NOTIFICATION_KIND, NOTIFICATION_STATUS, idNumberLabel, idTypeLabel, isPubliclyListed, skippedReason } from "@/lib/membership/display";
import { emailEnabled } from "@/lib/membership/email-config";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ReviewActions } from "@/components/membership/admin/review-actions";

export const metadata: Metadata = { title: "আবেদনের বিস্তারিত" };

type Props = { params: Promise<{ id: string }> };

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <h2 className="border-b border-line bg-cream/70 px-5 py-3 font-sans text-lg font-semibold text-brand-900">{title}</h2>
      <dl className="divide-y divide-line">{children}</dl>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 px-5 py-3 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm text-muted sm:text-base">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-ink">{children}</dd>
    </div>
  );
}

function YesNo({ value, yes, no }: { value: boolean; yes: string; no: string }) {
  return value ? (
    <span className="inline-flex items-center gap-1.5 text-brand-800">
      <CircleCheck className="size-5" aria-hidden="true" />
      {yes}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-muted">
      <CircleMinus className="size-5" aria-hidden="true" />
      {no}
    </span>
  );
}

export default async function ApplicationDetailPage({ params }: Props) {
  const staff = await requirePagePermission("applications.view");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: a } = await supabase.from("membership_applications").select("*").eq("id", id).maybeSingle();
  if (!a) notFound();

  const canReview = staff.permissions.has("applications.review");
  const canDelete = staff.permissions.has("applications.delete");
  const canSeeMembers = staff.permissions.has("members.view") || staff.permissions.has("members.manage");

  const [historyRes, notifRes, memberRes, designationsRes] = await Promise.all([
    supabase
      .from("application_status_history")
      .select("id, from_status, to_status, note, changed_by, created_at")
      .eq("application_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("notification_log")
      .select("id, kind, recipient, status, error, created_at")
      .eq("application_id", id)
      .order("created_at", { ascending: true }),
    canSeeMembers
      ? supabase.from("members").select("id, member_no, status, show_in_directory, directory_consent, date_of_birth, guardian_consent").eq("application_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
    canReview
      ? supabase.from("designations").select("id, name_bn").eq("is_active", true).order("rank_order")
      : Promise.resolve({ data: [] as { id: number; name_bn: string }[] }),
  ]);
  const history = historyRes.data ?? [];
  const notifications = notifRes.data ?? [];
  const member = memberRes.data;
  const designations = designationsRes.data ?? [];

  // Staff names for the history (changed_by / reviewed_by reference auth users).
  const staffIds = [...new Set([...history.map((h) => h.changed_by), a.reviewed_by].filter((v): v is string => Boolean(v)))];
  const { data: staffRows } = staffIds.length
    ? await supabase.from("staff_profiles").select("id, full_name").in("id", staffIds)
    : { data: [] as { id: string; full_name: string }[] };
  const names = new Map((staffRows ?? []).map((s) => [s.id, s.full_name]));

  const status = a.status as ApplicationStatus;
  const meta = APPLICATION_STATUS[status] ?? { label: a.status, tone: "gray" as const };
  const age = ageOn(a.date_of_birth);
  const defaultDesignation = designations.find((d) => d.name_bn === "সদস্য")?.id ?? designations[designations.length - 1]?.id ?? null;

  return (
    <>
      <Link href="/admin/applications" className="mb-3 inline-flex min-h-11 items-center gap-1.5 font-medium text-brand-700 hover:underline">
        <ArrowLeft className="size-5" aria-hidden="true" />
        সব আবেদন
      </Link>
      {/* overflow-wrap is inherited: a very long name without spaces wraps instead of widening the page. */}
      <div className="wrap-anywhere">
      <AdminPageHeader
        title={a.full_name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>ফরম নং</span>
            <strong dir="ltr" className="tabular-nums text-ink" data-testid="detail-application-no">{a.application_no}</strong>
            <Badge tone={meta.tone}>
              <span data-testid="detail-status">{meta.label}</span>
            </Badge>
          </span>
        }
      />
      </div>

      {/* Phones/tablets: the decision card comes first (status + actions), then
          the form details, then history. Wide screens: details | sidebar. */}
      <div className="grid gap-6 [grid-template-areas:'decision'_'details'_'meta'] xl:grid-cols-[minmax(0,1fr)_22rem] xl:grid-rows-[auto_1fr] xl:[grid-template-areas:'details_decision'_'details_meta']">
        <div className="min-w-0 space-y-6 [grid-area:details]">
          <Group title="ব্যক্তিগত তথ্য">
            <Row label="নাম">{a.full_name}</Row>
            <Row label="পিতার নাম">{a.father_name}</Row>
            <Row label="মাতার নাম">{a.mother_name}</Row>
            <Row label="জন্ম তারিখ">
              {formatDate(a.date_of_birth)}
              {age !== null && <span className="text-muted"> (বয়স {bn(age)} বছর)</span>}
            </Row>
            <Row label="জাতীয়তা">{a.nationality}</Row>
            <Row label="ধর্ম">{a.religion}</Row>
            <Row label="পেশা">{a.occupation}</Row>
          </Group>

          <Group title="ঠিকানা">
            <Row label="স্থায়ী ঠিকানা"><span className="whitespace-pre-line">{a.permanent_address}</span></Row>
            <Row label="বর্তমান ঠিকানা">
              <span className="whitespace-pre-line">{a.present_address}</span>
              {a.present_address === a.permanent_address && <span className="block text-sm text-muted">(স্থায়ী ঠিকানার মতো একই)</span>}
            </Row>
          </Group>

          <Group title="পরিচয় ও যোগাযোগ">
            <Row label="পরিচয়পত্রের ধরন">{idTypeLabel(a.id_type)}</Row>
            <Row label={idNumberLabel(a.id_type)}>
              <span dir="ltr" className="tabular-nums tracking-wide" data-testid="detail-id-number">{a.id_number}</span>
            </Row>
            <Row label="মোবাইল">
              <a href={`tel:${a.mobile}`} className="inline-flex items-center gap-1.5 text-brand-800 underline-offset-4 hover:underline">
                <Phone className="size-4" aria-hidden="true" />
                <span dir="ltr" className="tabular-nums">{a.mobile}</span>
              </a>
            </Row>
            <Row label="ইমেইল">
              {a.email ? (
                <a href={`mailto:${a.email}`} className="inline-flex items-center gap-1.5 break-all text-brand-800 underline-offset-4 hover:underline">
                  <Mail className="size-4 shrink-0" aria-hidden="true" />
                  {a.email}
                </a>
              ) : (
                <span className="font-normal text-muted">দেওয়া হয়নি</span>
              )}
            </Row>
            <Row label="রক্তের গ্রুপ">{a.blood_group ?? <span className="font-normal text-muted">দেওয়া হয়নি</span>}</Row>
          </Group>

          <Group title="অঙ্গীকারনামা ও সম্মতি">
            <Row label="অঙ্গীকারনামা">
              <YesNo value={Boolean(a.declaration_accepted_at)} yes={`সম্মতি দিয়েছেন — ${formatDateTime(a.declaration_accepted_at)}`} no="সম্মতি নেই" />
            </Row>
            <Row label="সদস্য তালিকায় প্রকাশ">
              <span data-testid="detail-directory-consent">
                <YesNo value={a.directory_consent} yes="সম্মতি দিয়েছেন" no="সম্মতি দেননি" />
              </span>
            </Row>
            <Row label="জমার তারিখ ও সময়">{formatDateTime(a.created_at)}</Row>
          </Group>
        </div>

        <Card className="min-w-0 self-start p-5 [grid-area:decision]" data-testid="decision-card">
            <h2 className="font-sans text-lg font-semibold text-brand-900">সিদ্ধান্ত</h2>
            <dl className="mt-3 space-y-2 text-[0.97rem]">
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-muted">বর্তমান অবস্থা</dt>
                <dd><Badge tone={meta.tone}>{meta.label}</Badge></dd>
              </div>
              {a.reviewed_at && (
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-muted">{status === "under_review" ? "যাচাই শুরু" : "সর্বশেষ সিদ্ধান্ত"}</dt>
                  <dd className="text-end">
                    {formatDateTime(a.reviewed_at)}
                    {a.reviewed_by && names.get(a.reviewed_by) && <span className="block text-sm text-muted">{names.get(a.reviewed_by)}</span>}
                  </dd>
                </div>
              )}
              {a.decision_note && (
                <div>
                  <dt className="text-muted">{status === "rejected" ? "প্রত্যাখ্যানের কারণ" : "মন্তব্য"}</dt>
                  <dd className="mt-1 whitespace-pre-line rounded-lg bg-cream px-3 py-2" data-testid="detail-decision-note">{a.decision_note}</dd>
                </div>
              )}
            </dl>

            {member && (
              <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4">
                <p className="text-sm text-brand-800">সদস্য রেকর্ড</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2">
                  <UserRound className="size-5 text-brand-700" aria-hidden="true" />
                  <strong dir="ltr" className="tabular-nums text-brand-900" data-testid="detail-member-no">{member.member_no}</strong>
                  {isPubliclyListed(member) && <Badge tone="green">তালিকায় প্রকাশিত</Badge>}
                </p>
                <Link href={`/admin/members/${member.id}`} className="mt-2 inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand-700 underline underline-offset-4">
                  সদস্য রেকর্ড খুলুন
                  <ExternalLink className="size-4" aria-hidden="true" />
                </Link>
              </div>
            )}

            <div className="mt-5">
              {canReview || canDelete ? (
                <ReviewActions
                  applicationId={a.id}
                  applicationNo={a.application_no}
                  fullName={a.full_name}
                  status={status}
                  directoryConsent={a.directory_consent}
                  designations={designations}
                  defaultDesignationId={defaultDesignation}
                  canReview={canReview}
                  canDelete={canDelete}
                  emailWillBeSent={Boolean(a.email) && emailEnabled()}
                  minorAge={age !== null && age < 18 ? age : null}
                />
              ) : (
                <p className="rounded-xl bg-stone-100 px-4 py-3 text-sm text-muted" data-testid="view-only-note">
                  আপনার শুধু আবেদন দেখার অনুমতি আছে। অনুমোদন বা প্রত্যাখ্যান করতে পারেন যাদের “আবেদন অনুমোদন” অনুমতি আছে।
                </p>
              )}
            </div>
        </Card>

        <aside className="min-w-0 space-y-6 self-start [grid-area:meta]" aria-label="ইতিহাস ও নোটিফিকেশন">
          <Card className="p-5">
            <h2 className="font-sans text-lg font-semibold text-brand-900">অবস্থার ইতিহাস</h2>
            {history.length === 0 ? (
              <p className="mt-2 text-muted">কোনো রেকর্ড নেই।</p>
            ) : (
              <ol className="mt-3 space-y-4 border-s-2 border-brand-100 ps-4" data-testid="status-history">
                {history.map((h) => {
                  const to = APPLICATION_STATUS[h.to_status as ApplicationStatus];
                  return (
                    <li key={h.id} className="relative">
                      <span aria-hidden="true" className="absolute -start-[1.4rem] top-2 size-2.5 rounded-full bg-brand-600 ring-4 ring-white" />
                      <p className="flex flex-wrap items-center gap-2">
                        <Badge tone={to?.tone ?? "gray"}>{to?.label ?? h.to_status}</Badge>
                        {!h.from_status && <span className="text-sm text-muted">(আবেদন জমা)</span>}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {formatDateTime(h.created_at)}
                        {h.changed_by ? ` · ${names.get(h.changed_by) ?? "অজানা ব্যবহারকারী"}` : !h.from_status ? " · আবেদনকারী (অনলাইন)" : ""}
                      </p>
                      {h.note && <p className="mt-1 whitespace-pre-line text-[0.95rem]">{h.note}</p>}
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-sans text-lg font-semibold text-brand-900">ইমেইল নোটিফিকেশন</h2>
            {notifications.length === 0 ? (
              <p className="mt-2 text-[0.95rem] text-muted">
                {a.email ? "এখনো কোনো ইমেইলের রেকর্ড নেই।" : "আবেদনকারী ইমেইল দেননি, তাই ইমেইল পাঠানো হয় না।"}
              </p>
            ) : (
              <ul className="mt-3 space-y-3" data-testid="notification-log">
                {notifications.map((n) => {
                  const st = NOTIFICATION_STATUS[n.status] ?? { label: n.status, tone: "gray" as const };
                  return (
                    <li key={n.id} className="rounded-lg border border-line px-3 py-2">
                      <p className="font-medium">{NOTIFICATION_KIND[n.kind] ?? n.kind}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted">
                        <Badge tone={st.tone}>{st.label}</Badge>
                        {formatDateTime(n.created_at)}
                      </p>
                      {n.status === "failed" && n.error && <p className="mt-1 break-words text-sm text-red-700">{n.error}</p>}
                      {n.status === "skipped" && <p className="mt-1 text-sm text-muted">{skippedReason(n.error)}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
