import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePagePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { isUuid } from "@/lib/admin/text";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AnnouncementForm } from "../announcement-form";
import { Alert } from "@/components/ui/field";

export const metadata: Metadata = { title: "ঘোষণা সম্পাদনা" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditAnnouncementPage({ params, searchParams }: Props) {
  await requirePagePermission("content.manage");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!isUuid(id)) notFound();

  const db = await createClient();
  const { data: a, error } = await db
    .from("announcements")
    .select("id, title, body, title_en, body_en, is_published, is_pinned, published_at, created_at, updated_at, created_by")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    return (
      <>
        <AdminPageHeader title="ঘোষণা সম্পাদনা" />
        <Alert>ঘোষণাটি লোড করা যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।</Alert>
      </>
    );
  }
  if (!a) notFound();

  let author: string | null = null;
  if (a.created_by) {
    const { data } = await db.from("staff_profiles").select("full_name").eq("id", a.created_by).maybeSingle();
    author = data?.full_name ?? null;
  }

  return (
    <>
      <AdminPageHeader
        title="ঘোষণা সম্পাদনা"
        description={
          <>
            তৈরি: {formatDateTime(a.created_at)}
            {author ? ` — ${author}` : ""}
            {a.published_at ? ` · প্রথম প্রকাশ: ${formatDateTime(a.published_at)}` : ""}
          </>
        }
      />
      <div className="max-w-3xl">
        <AnnouncementForm
          key={a.id}
          id={a.id}
          initial={{
            title: a.title,
            body: a.body,
            title_en: a.title_en ?? "",
            body_en: a.body_en ?? "",
            is_published: a.is_published,
            is_pinned: a.is_pinned,
          }}
          updatedAt={a.updated_at}
          justCreated={sp.created === "1"}
        />
      </div>
    </>
  );
}
