import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePagePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { galleryUrl } from "@/lib/storage";
import { isUuid } from "@/lib/gallery/paths";
import { AdminPageHeader } from "@/components/admin/page-header";
import { CategoryForm, type CoverOption } from "@/components/gallery/admin/category-form";
import { updateCategory } from "../actions";

export const metadata: Metadata = { title: "ক্যাটাগরি সম্পাদনা" };

const COVER_CHOICES = 60;

export default async function EditCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePagePermission("content.manage");
  const { id } = await params;
  const sp = await searchParams;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const [{ data: category }, images, count] = await Promise.all([
    supabase
      .from("activity_categories")
      .select("id, slug, name_bn, summary, description, name_en, summary_en, description_en, icon, sort_order, is_active, cover_image_id")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("gallery_images")
      .select("id, storage_path, thumb_path, caption, is_published")
      .eq("category_id", id)
      .order("is_published", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(COVER_CHOICES),
    // RLS: staff without gallery.manage only see published images here.
    supabase.from("gallery_images").select("id", { count: "exact", head: true }).eq("category_id", id),
  ]);
  if (!category) notFound();

  const coverOptions: CoverOption[] = (images.data ?? []).map((img) => ({
    id: img.id,
    thumb: galleryUrl(img.thumb_path ?? img.storage_path) ?? "",
    caption: img.caption,
    isPublished: img.is_published,
  }));
  // Keep the current cover selectable even if it is outside the first page of choices.
  if (category.cover_image_id && !coverOptions.some((o) => o.id === category.cover_image_id)) {
    const { data: cover } = await supabase
      .from("gallery_images")
      .select("id, storage_path, thumb_path, caption, is_published")
      .eq("id", category.cover_image_id)
      .maybeSingle();
    if (cover) {
      coverOptions.unshift({
        id: cover.id,
        thumb: galleryUrl(cover.thumb_path ?? cover.storage_path) ?? "",
        caption: cover.caption,
        isPublished: cover.is_published,
      });
    }
  }

  return (
    <div className="max-w-4xl">
      <AdminPageHeader title="ক্যাটাগরি সম্পাদনা" description={category.name_bn} />
      <CategoryForm
        key={category.id}
        mode="edit"
        categoryId={category.id}
        action={updateCategory.bind(null, category.id)}
        initial={{
          slug: category.slug,
          name_bn: category.name_bn,
          summary: category.summary,
          description: category.description,
          icon: category.icon,
          sort_order: category.sort_order,
          is_active: category.is_active,
          cover_image_id: category.cover_image_id,
          name_en: category.name_en ?? "",
          summary_en: category.summary_en ?? "",
          description_en: category.description_en ?? "",
        }}
        coverOptions={coverOptions}
        imageCount={count.count ?? 0}
        justCreated={sp.created === "1"}
      />
    </div>
  );
}
