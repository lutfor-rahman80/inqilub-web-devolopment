import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePagePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bn, formatDateTime } from "@/lib/format";
import { galleryUrl } from "@/lib/storage";
import { isUuid } from "@/lib/programs/schemas";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Alert } from "@/components/ui/field";
import { ProgramForm } from "@/components/programs/admin/program-form";
import { PhotoLinker } from "@/components/programs/admin/photo-linker";
import { listCategoryImages, type CategoryImage } from "../actions";

export const metadata: Metadata = { title: "কর্মসূচি সম্পাদনা" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditProgramPage({ params, searchParams }: Props) {
  const staff = await requirePagePermission("content.manage");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!isUuid(id)) notFound();

  const db = await createClient();
  const [{ data: p, error }, { data: categories, error: catError }] = await Promise.all([
    db
      .from("programs")
      .select(
        "id, slug, category_id, title_bn, title_en, summary_bn, summary_en, body_bn, body_en, location_bn, location_en, starts_on, ends_on, status_override, cover_image_id, is_published, first_published_at, sort_order, created_at, updated_at",
      )
      .eq("id", id)
      .maybeSingle(),
    db.from("activity_categories").select("id, slug, name_bn, is_active").order("sort_order").order("name_bn"),
  ]);
  if (error || catError) {
    return (
      <>
        <AdminPageHeader title="কর্মসূচি সম্পাদনা" />
        <Alert>কর্মসূচিটি লোড করা যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।</Alert>
      </>
    );
  }
  if (!p) notFound();

  const [choices, linkedRes] = await Promise.all([
    listCategoryImages(p.category_id, 0),
    db
      .from("gallery_images")
      .select("id, storage_path, thumb_path, caption, is_published, program_id, created_at")
      .eq("program_id", p.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  let initialImages: CategoryImage[] = choices.ok ? choices.images : [];
  // Keep the current cover selectable even when it is not on the first page of choices.
  if (p.cover_image_id && !initialImages.some((i) => i.id === p.cover_image_id)) {
    const { data: cover } = await db
      .from("gallery_images")
      .select("id, storage_path, thumb_path, caption, is_published, program_id, created_at")
      .eq("id", p.cover_image_id)
      .maybeSingle();
    if (cover) {
      initialImages = [
        {
          id: cover.id,
          thumb: galleryUrl(cover.thumb_path ?? cover.storage_path) ?? "",
          caption: cover.caption,
          isPublished: cover.is_published,
          programId: cover.program_id,
          createdAt: cover.created_at,
        },
        ...initialImages,
      ];
    }
  }
  const linked: CategoryImage[] = (linkedRes.data ?? []).map((r) => ({
    id: r.id,
    thumb: galleryUrl(r.thumb_path ?? r.storage_path) ?? "",
    caption: r.caption,
    isPublished: r.is_published,
    programId: r.program_id,
    createdAt: r.created_at,
  }));
  const category = (categories ?? []).find((c) => c.id === p.category_id);

  return (
    <>
      <AdminPageHeader
        title="কর্মসূচি সম্পাদনা"
        description={
          <>
            {p.title_bn} · তৈরি: {formatDateTime(p.created_at)}
            {p.first_published_at ? ` · প্রথম প্রকাশ: ${formatDateTime(p.first_published_at)}` : " · এখনো প্রকাশিত হয়নি"}
          </>
        }
      />
      <div className="max-w-4xl space-y-8">
        <ProgramForm
          key={p.id}
          id={p.id}
          categories={(categories ?? []).map((c) => ({ id: c.id, slug: c.slug, name: c.name_bn, isActive: c.is_active }))}
          updatedAt={p.updated_at}
          slugLocked={p.first_published_at !== null}
          justCreated={sp.created === "1"}
          initialImages={initialImages}
          initialImagesTotal={choices.ok ? choices.total : 0}
          initial={{
            category_id: p.category_id,
            slug: p.slug,
            title_bn: p.title_bn,
            title_en: p.title_en ?? "",
            summary_bn: p.summary_bn,
            summary_en: p.summary_en ?? "",
            body_bn: p.body_bn,
            body_en: p.body_en ?? "",
            location_bn: p.location_bn ?? "",
            location_en: p.location_en ?? "",
            starts_on: p.starts_on,
            ends_on: p.ends_on ?? "",
            status_override: p.status_override === "postponed" || p.status_override === "cancelled" ? p.status_override : "",
            cover_image_id: p.cover_image_id ?? "",
            is_published: p.is_published,
            sort_order: bn(p.sort_order),
          }}
        />
        <PhotoLinker
          programId={p.id}
          categoryId={p.category_id}
          categoryName={category?.name_bn ?? "—"}
          linked={linked}
          canManage={staff.permissions.has("gallery.manage")}
        />
      </div>
    </>
  );
}
