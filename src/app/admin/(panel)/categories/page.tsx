import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bn } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Alert } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";

export const metadata: Metadata = { title: "কার্যক্রম / ক্যাটাগরি" };

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requirePagePermission("content.manage");
  const sp = await searchParams;
  const supabase = await createClient();
  const [cats, stats] = await Promise.all([
    supabase
      .from("activity_categories")
      .select("id, slug, name_bn, name_en, summary, icon, sort_order, is_active, cover_image_id")
      .order("sort_order", { ascending: true })
      .order("name_bn", { ascending: true }),
    supabase.rpc("gallery_admin_stats"),
  ]);
  const counts = new Map((stats.data ?? []).map((r) => [r.category_id, r]));
  const categories = cats.data ?? [];
  const canSeeAll = staff.permissions.has("gallery.manage");

  return (
    <>
      <AdminPageHeader
        title="কার্যক্রম / ক্যাটাগরি"
        description="প্রতিটি ক্যাটাগরি ওয়েবসাইটের একটি কার্যক্রম এবং গ্যালারির একটি ফোল্ডার।"
        actions={
          <LinkButton href="/admin/categories/new">
            <Plus className="size-5" aria-hidden="true" />
            নতুন ক্যাটাগরি
          </LinkButton>
        }
      />

      {sp.deleted === "1" && (
        <div className="mb-4">
          <Alert tone="success">ক্যাটাগরিটি মুছে ফেলা হয়েছে।</Alert>
        </div>
      )}
      {cats.error && (
        <div className="mb-4">
          <Alert>ক্যাটাগরির তালিকা লোড করা যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।</Alert>
        </div>
      )}

      {categories.length === 0 && !cats.error ? (
        <EmptyState title="কোনো ক্যাটাগরি নেই">নতুন ক্যাটাগরি যুক্ত করুন।</EmptyState>
      ) : (
        <ul className="grid gap-3" aria-label="ক্যাটাগরির তালিকা">
          {categories.map((c) => {
            const n = counts.get(c.id);
            return (
              <li key={c.id}>
                <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <CategoryIcon name={c.icon} className="size-6" />
                    </span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-serif text-lg font-semibold text-brand-900">{c.name_bn}</span>
                        {c.is_active ? <Badge tone="green">সক্রিয়</Badge> : <Badge tone="gray">নিষ্ক্রিয়</Badge>}
                        {!c.name_en && <Badge tone="amber">ইংরেজি নাম নেই</Badge>}
                      </p>
                      {c.name_en && (
                        <p className="text-sm text-muted" lang="en">{c.name_en}</p>
                      )}
                      <p className="text-sm text-muted">
                        ফোল্ডার: <code dir="ltr" className="text-brand-800">activities/{c.slug}/</code> · ক্রম {bn(c.sort_order)}
                      </p>
                      <p className="text-sm text-muted">
                        {canSeeAll
                          ? `${bn(Number(n?.total ?? 0))}টি ছবি (${bn(Number(n?.published ?? 0))}টি প্রকাশিত)`
                          : `${bn(Number(n?.published ?? 0))}টি প্রকাশিত ছবি`}
                        {c.cover_image_id ? " · প্রচ্ছদ নির্বাচিত" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:shrink-0">
                    <LinkButton href={`/admin/categories/${c.id}`} variant="outline" aria-label={`সম্পাদনা: ${c.name_bn}`}>
                      <Pencil className="size-5" aria-hidden="true" />
                      সম্পাদনা
                    </LinkButton>
                    {canSeeAll && (
                      <Link
                        href={`/admin/gallery?category=${c.id}`}
                        className="inline-flex min-h-11 items-center rounded-xl px-3 font-medium text-brand-800 underline-offset-4 hover:underline"
                      >
                        ছবিগুলো দেখুন
                      </Link>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
