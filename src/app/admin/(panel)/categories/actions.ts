"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertPermission } from "@/lib/auth";
import type { ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { galleryErrorMessage } from "@/lib/gallery/errors";
import {
  categoryCreateSchema,
  categoryFieldsSchema,
  fieldErrorsOf,
  readCategoryForm,
  uuidSchema,
} from "@/lib/gallery/schemas";

const DENIED = "এই কাজের অনুমতি আপনার নেই।";

export type CategoryFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  saved?: boolean;
};

async function canManageContent(): Promise<boolean> {
  try {
    await assertPermission("content.manage");
    return true;
  } catch {
    return false;
  }
}

export async function createCategory(_prev: CategoryFormState, form: FormData): Promise<CategoryFormState> {
  if (!(await canManageContent())) return { error: DENIED };
  const parsed = categoryCreateSchema.safeParse(readCategoryForm(form));
  if (!parsed.success) {
    return { error: "ফর্মের ভুলগুলো ঠিক করুন।", fieldErrors: fieldErrorsOf(parsed.error) };
  }
  const v = parsed.data;
  const supabase = await createClient();

  const { data: taken } = await supabase.from("activity_categories").select("id").eq("slug", v.slug).maybeSingle();
  if (taken) {
    return { error: "ফর্মের ভুলগুলো ঠিক করুন।", fieldErrors: { slug: "এই ফোল্ডার নাম ইতিমধ্যে অন্য ক্যাটাগরিতে ব্যবহৃত হচ্ছে।" } };
  }

  const { data, error } = await supabase
    .from("activity_categories")
    .insert({
      slug: v.slug,
      name_bn: v.name_bn,
      summary: v.summary,
      description: v.description,
      icon: v.icon,
      sort_order: v.sort_order,
      is_active: v.is_active,
      name_en: v.name_en,
      summary_en: v.summary_en,
      description_en: v.description_en,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      return { error: "ফর্মের ভুলগুলো ঠিক করুন।", fieldErrors: { slug: "এই ফোল্ডার নাম ইতিমধ্যে অন্য ক্যাটাগরিতে ব্যবহৃত হচ্ছে।" } };
    }
    return { error: galleryErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  redirect(`/admin/categories/${data.id}?created=1`);
}

export async function updateCategory(id: string, _prev: CategoryFormState, form: FormData): Promise<CategoryFormState> {
  if (!(await canManageContent())) return { error: DENIED };
  if (!uuidSchema.safeParse(id).success) return { error: "ক্যাটাগরি খুঁজে পাওয়া যায়নি।" };
  const parsed = categoryFieldsSchema.safeParse(readCategoryForm(form));
  if (!parsed.success) {
    return { error: "ফর্মের ভুলগুলো ঠিক করুন।", fieldErrors: fieldErrorsOf(parsed.error) };
  }
  const coverRaw = form.get("cover_image_id");
  const cover = typeof coverRaw === "string" && coverRaw !== "" ? coverRaw : null;
  if (cover !== null && !uuidSchema.safeParse(cover).success) {
    return { error: "ফর্মের ভুলগুলো ঠিক করুন।", fieldErrors: { cover_image_id: "সঠিক প্রচ্ছদ ছবি নির্বাচন করুন।" } };
  }

  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_categories")
    .update({
      name_bn: v.name_bn,
      summary: v.summary,
      description: v.description,
      icon: v.icon,
      sort_order: v.sort_order,
      is_active: v.is_active,
      name_en: v.name_en,
      summary_en: v.summary_en,
      description_en: v.description_en,
      cover_image_id: cover,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) {
    const message = galleryErrorMessage(error);
    if (error.message?.includes("CATEGORY_COVER_MISMATCH")) {
      return { error: "ফর্মের ভুলগুলো ঠিক করুন।", fieldErrors: { cover_image_id: message } };
    }
    return { error: message };
  }
  if (!data) return { error: "ক্যাটাগরি খুঁজে পাওয়া যায়নি।" };

  revalidatePath("/", "layout");
  return { saved: true };
}

/** Only categories without images can be deleted (the database enforces it too). */
export async function deleteCategory(id: string): Promise<ActionResult> {
  if (!(await canManageContent())) return { ok: false, error: DENIED };
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: "ক্যাটাগরি খুঁজে পাওয়া যায়নি।" };
  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("gallery_images")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);
  if (countError) return { ok: false, error: galleryErrorMessage(countError) };
  if ((count ?? 0) > 0) {
    return { ok: false, error: "এই ক্যাটাগরিতে ছবি থাকায় এটি মুছে ফেলা যাবে না। এর বদলে নিষ্ক্রিয় করুন।" };
  }
  const { count: programCount, error: programError } = await supabase
    .from("programs")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);
  if (programError) return { ok: false, error: galleryErrorMessage(programError) };
  if ((programCount ?? 0) > 0) {
    return { ok: false, error: "এই ক্যাটাগরিতে কর্মসূচি থাকায় এটি মুছে ফেলা যাবে না। এর বদলে নিষ্ক্রিয় করুন।" };
  }

  const { data, error } = await supabase.from("activity_categories").delete().eq("id", id).select("id");
  if (error) return { ok: false, error: galleryErrorMessage(error) };
  if (!data || data.length === 0) return { ok: false, error: "ক্যাটাগরি খুঁজে পাওয়া যায়নি।" };

  revalidatePath("/", "layout");
  redirect("/admin/categories?deleted=1");
}

/** Sets (or clears with null) a category's cover image. The image must belong to the category. */
export async function setCategoryCover(categoryId: string, imageId: string | null): Promise<ActionResult> {
  if (!(await canManageContent())) return { ok: false, error: DENIED };
  if (!uuidSchema.safeParse(categoryId).success || (imageId !== null && !uuidSchema.safeParse(imageId).success)) {
    return { ok: false, error: "অবৈধ অনুরোধ।" };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_categories")
    .update({ cover_image_id: imageId })
    .eq("id", categoryId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: galleryErrorMessage(error) };
  if (!data) return { ok: false, error: "ক্যাটাগরি খুঁজে পাওয়া যায়নি।" };
  revalidatePath("/", "layout");
  return { ok: true };
}
