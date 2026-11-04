import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight, Clock, FilePen, FileSearch, FileText, History, ImageOff, Images, KeyRound, Mail, Megaphone, Plus,
  Upload, UserPlus, Users,
} from "lucide-react";
import { requireStaff, type Permission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { APPLICATION_STATUS, bn, formatDate, type ApplicationStatus } from "@/lib/format";
import { galleryUrl } from "@/lib/storage";
import { describeAudit } from "@/lib/admin/audit";
import { AUDIT_COLUMNS, loadAuditLookups } from "@/lib/admin/queries";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { AuditEntry } from "@/components/admin/audit-entry";
import { Alert } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = { title: "ড্যাশবোর্ড" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const LOAD_ERROR = "তথ্য লোড করা যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।";

function WidgetTitle({ id, children, href, linkLabel }: { id: string; children: React.ReactNode; href?: string; linkLabel?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
      <h2 id={id} className="text-lg font-bold">{children}</h2>
      {href && (
        <Link href={href} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 font-semibold text-brand-700 underline-offset-4 hover:underline">
          {linkLabel ?? "সব দেখুন"}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

export default async function DashboardPage({ searchParams }: Props) {
  const staff = await requireStaff();
  const sp = await searchParams;
  const can = (p: Permission) => staff.permissions.has(p);
  const db = await createClient();

  const canApps = can("applications.view");
  const canMembers = can("members.view") || can("members.manage");
  const canGallery = can("gallery.manage");
  const canCategories = canGallery || can("content.manage");
  const canMessages = can("messages.view");
  const canAudit = can("audit.view");

  if (
    staff.permissions.has("quiz.manage") &&
    !canApps &&
    !canMembers &&
    !canGallery &&
    !can("content.manage") &&
    !can("users.manage")
  ) {
    redirect("/admin/quiz");
  }

  const head = { count: "exact" as const, head: true };
  const none = Promise.resolve(null);

  // Every query runs as the signed-in user, so Row-Level Security applies.
  const [
    pendingRes, reviewRes, recentAppsRes, membersRes, publishedRes, unpublishedRes, recentPhotosRes,
    catsRes, catStatsRes, unreadRes, auditRes,
  ] = await Promise.all([
    canApps ? db.from("membership_applications").select("id", head).eq("status", "pending") : none,
    canApps ? db.from("membership_applications").select("id", head).eq("status", "under_review") : none,
    canApps
      ? db.from("membership_applications").select("id, application_no, full_name, status, created_at").order("created_at", { ascending: false }).limit(5)
      : none,
    canMembers ? db.from("members").select("id", head).eq("status", "active") : none,
    canGallery ? db.from("gallery_images").select("id", head).eq("is_published", true) : none,
    canGallery ? db.from("gallery_images").select("id", head).eq("is_published", false) : none,
    canGallery
      ? db.from("gallery_images").select("id, storage_path, thumb_path, caption, is_published, width, height").order("created_at", { ascending: false }).limit(6)
      : none,
    canCategories ? db.from("activity_categories").select("id, name_bn, is_active, sort_order").order("sort_order").order("name_bn") : none,
    canGallery ? db.rpc("gallery_admin_stats") : canCategories ? db.rpc("category_photo_counts") : none,
    canMessages ? db.from("contact_messages").select("id", head).eq("is_read", false) : none,
    canAudit ? db.from("audit_logs").select(AUDIT_COLUMNS).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(8) : none,
  ]);
  const lookups = auditRes && !auditRes.error ? await loadAuditLookups(db, auditRes.data) : undefined;

  const count = (r: { count: number | null; error: unknown } | null) => (r && !r.error ? r.count ?? 0 : null);

  // Per-category photo counts: total + published for gallery managers,
  // published (public) counts for content managers.
  const catCounts = new Map<string, { total: number | null; published: number }>();
  if (catStatsRes && !catStatsRes.error && Array.isArray(catStatsRes.data)) {
    for (const row of catStatsRes.data as Record<string, unknown>[]) {
      const id = String(row.category_id);
      if ("total" in row) catCounts.set(id, { total: Number(row.total), published: Number(row.published) });
      else catCounts.set(id, { total: null, published: Number(row.photo_count) });
    }
  }

  const quick: { href: string; label: string; icon: typeof Plus; show: boolean }[] = [
    { href: "/admin/applications", label: "অপেক্ষমাণ আবেদন", icon: FileSearch, show: canApps },
    { href: "/admin/gallery", label: "ছবি আপলোড", icon: Upload, show: canGallery },
    { href: "/admin/announcements/new", label: "নতুন ঘোষণা", icon: Megaphone, show: can("content.manage") },
    { href: "/admin/content", label: "ওয়েবসাইট কনটেন্ট", icon: FilePen, show: can("content.manage") },
    { href: "/admin/members", label: "সদস্য তালিকা", icon: Users, show: canMembers },
    { href: "/admin/messages?filter=unread", label: "অপঠিত বার্তা", icon: Mail, show: canMessages },
    { href: "/admin/users?new=1", label: "নতুন ব্যবহারকারী", icon: UserPlus, show: can("users.manage") },
    { href: "/admin/account", label: "পাসওয়ার্ড পরিবর্তন", icon: KeyRound, show: true },
  ];

  const recentApps = recentAppsRes && !recentAppsRes.error ? recentAppsRes.data : null;
  const recentPhotos = recentPhotosRes && !recentPhotosRes.error ? recentPhotosRes.data : null;
  const audit = auditRes && !auditRes.error ? auditRes.data.map((r) => describeAudit(r, lookups)) : null;

  return (
    <>
      <AdminPageHeader title="ড্যাশবোর্ড" description={`স্বাগতম, ${staff.fullName} (${staff.roleName})`} />

      {sp.denied === "1" && (
        <div className="mb-5" data-testid="denied-notice">
          <Alert>এই পৃষ্ঠার অনুমতি আপনার নেই। প্রয়োজনে সুপার অ্যাডমিনের সাথে যোগাযোগ করুন।</Alert>
        </div>
      )}

      <section aria-labelledby="quick-title" className="mb-6">
        <h2 id="quick-title" className="sr-only">দ্রুত কাজ</h2>
        <ul className="flex flex-wrap gap-2" data-testid="quick-actions">
          {quick.filter((q) => q.show).map((q) => (
            <li key={q.href}>
              <LinkButton href={q.href} variant="outline" size="md" className="bg-white">
                <q.icon className="size-5" aria-hidden="true" />
                {q.label}
              </LinkButton>
            </li>
          ))}
        </ul>
      </section>

      {(canApps || canMembers || canMessages || canGallery) && (
        <section aria-labelledby="stats-title" className="mb-6">
          <h2 id="stats-title" className="sr-only">সংক্ষিপ্ত পরিসংখ্যান</h2>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            {canApps && (
              <>
                <StatCard testId="stat-pending" label="অপেক্ষমাণ আবেদন" value={count(pendingRes)} href="/admin/applications" icon={FileText} tone="amber" />
                <StatCard testId="stat-review" label="যাচাই চলছে" value={count(reviewRes)} href="/admin/applications?status=under_review" icon={Clock} tone="blue" />
              </>
            )}
            {canMembers && (
              <StatCard testId="stat-members" label="সক্রিয় সদস্য" value={count(membersRes)} href="/admin/members" icon={Users} tone="green" />
            )}
            {canMessages && (
              <StatCard testId="stat-unread" label="অপঠিত বার্তা" value={count(unreadRes)} href="/admin/messages?filter=unread" icon={Mail} tone="gold" />
            )}
            {canGallery && (
              <>
                <StatCard testId="stat-published-photos" label="প্রকাশিত ছবি" value={count(publishedRes)} href="/admin/gallery" icon={Images} tone="green" />
                <StatCard testId="stat-unpublished-photos" label="অপ্রকাশিত ছবি" value={count(unpublishedRes)} href="/admin/gallery" icon={ImageOff} tone="gray" note="প্রকাশের আগে পর্যালোচনা করুন" />
              </>
            )}
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {canApps && (
          <Card className="overflow-hidden" data-testid="dash-applications">
            <section aria-labelledby="recent-apps-title">
              <WidgetTitle id="recent-apps-title" href="/admin/applications?status=all">সাম্প্রতিক আবেদন</WidgetTitle>
              {!recentApps ? (
                <p className="px-5 py-6 text-muted">{LOAD_ERROR}</p>
              ) : recentApps.length === 0 ? (
                <p className="px-5 py-6 text-muted">এখনো কোনো আবেদন জমা পড়েনি।</p>
              ) : (
                <ul className="divide-y divide-line">
                  {recentApps.map((a) => {
                    const st = APPLICATION_STATUS[a.status as ApplicationStatus];
                    return (
                      <li key={a.id}>
                        <Link href={`/admin/applications/${a.id}`} className="flex min-h-14 flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-brand-50/50 sm:px-5">
                          <span className="min-w-0">
                            <span className="block font-semibold text-ink wrap-anywhere">{a.full_name}</span>
                            <span className="block text-sm text-muted"><span dir="ltr" className="tabular-nums">{a.application_no}</span> · {formatDate(a.created_at)}</span>
                          </span>
                          {st && <Badge tone={st.tone}>{st.label}</Badge>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </Card>
        )}

        {canGallery && (
          <Card className="overflow-hidden" data-testid="dash-gallery">
            <section aria-labelledby="recent-photos-title">
              <WidgetTitle id="recent-photos-title" href="/admin/gallery" linkLabel="গ্যালারি">সাম্প্রতিক আপলোড</WidgetTitle>
              {!recentPhotos ? (
                <p className="px-5 py-6 text-muted">{LOAD_ERROR}</p>
              ) : recentPhotos.length === 0 ? (
                <div className="px-5 py-6 text-muted">
                  <p>এখনো কোনো ছবি আপলোড করা হয়নি।</p>
                  <LinkButton href="/admin/gallery" variant="outline" className="mt-3">
                    <Upload className="size-5" aria-hidden="true" /> ছবি আপলোড করুন
                  </LinkButton>
                </div>
              ) : (
                <ul className="grid grid-cols-3 gap-2 p-4 sm:p-5">
                  {recentPhotos.map((p) => (
                    <li key={p.id} className="relative overflow-hidden rounded-xl bg-stone-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={galleryUrl(p.thumb_path ?? p.storage_path) ?? ""}
                        alt={p.caption || "ক্যাপশনবিহীন ছবি"}
                        width={240}
                        height={180}
                        loading="lazy"
                        decoding="async"
                        className="aspect-[4/3] w-full object-cover"
                      />
                      {!p.is_published && (
                        <span className="absolute start-1 top-1 rounded-md bg-black/70 px-1.5 text-xs font-medium text-white">অপ্রকাশিত</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </Card>
        )}

        {canCategories && (
          <Card className="overflow-hidden" data-testid="dash-categories">
            <section aria-labelledby="cat-counts-title">
              <WidgetTitle id="cat-counts-title" href="/admin/categories" linkLabel="ক্যাটাগরি">ক্যাটাগরি অনুযায়ী ছবি</WidgetTitle>
              {!catsRes || catsRes.error || (catStatsRes && catStatsRes.error) ? (
                <p className="px-5 py-6 text-muted">{LOAD_ERROR}</p>
              ) : catsRes.data.length === 0 ? (
                <p className="px-5 py-6 text-muted">কোনো ক্যাটাগরি নেই।</p>
              ) : (
                <>
                  <ul className="divide-y divide-line">
                    {catsRes.data.map((c) => {
                      const n = catCounts.get(c.id);
                      return (
                        <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
                          <span className="min-w-0">
                            <span className={c.is_active ? "text-ink" : "text-muted"}>{c.name_bn}</span>
                            {!c.is_active && <span className="ms-2 text-sm text-muted">(নিষ্ক্রিয়)</span>}
                          </span>
                          <span className="shrink-0 text-end text-sm">
                            <span className="font-semibold text-brand-900">{bn(n?.published ?? 0)}</span>
                            <span className="text-muted"> প্রকাশিত</span>
                            {n?.total != null && n.total !== n.published && (
                              <span className="block text-muted">মোট {bn(n.total)}</span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {!canGallery && (
                    <p className="border-t border-line px-5 py-3 text-sm text-muted">শুধু প্রকাশিত ছবির সংখ্যা দেখানো হয়েছে।</p>
                  )}
                </>
              )}
            </section>
          </Card>
        )}

        {canAudit && (
          <Card className="overflow-hidden" data-testid="dash-audit">
            <section aria-labelledby="audit-title">
              <WidgetTitle id="audit-title" href="/admin/audit" linkLabel="অডিট লগ">
                <span className="inline-flex items-center gap-2"><History className="size-5 text-gold-600" aria-hidden="true" /> সাম্প্রতিক কার্যক্রম</span>
              </WidgetTitle>
              {!audit ? (
                <p className="px-5 py-6 text-muted">{LOAD_ERROR}</p>
              ) : audit.length === 0 ? (
                <p className="px-5 py-6 text-muted">এখনো কোনো কার্যক্রম রেকর্ড হয়নি।</p>
              ) : (
                <ul className="divide-y divide-line">
                  {audit.map((e) => <AuditEntry key={e.id} entry={e} compact />)}
                </ul>
              )}
            </section>
          </Card>
        )}
      </div>

      {!canApps && !canMembers && !canGallery && !canCategories && !canMessages && !canAudit && (
        <Card className="p-6">
          <p className="text-muted">আপনার ভূমিকায় এখনো কোনো অনুমতি দেওয়া হয়নি। প্রয়োজনে সুপার অ্যাডমিনের সাথে যোগাযোগ করুন।</p>
        </Card>
      )}
    </>
  );
}
