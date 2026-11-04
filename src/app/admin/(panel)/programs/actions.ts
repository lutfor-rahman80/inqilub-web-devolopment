"use server";

import { revalidatePath } from "next/cache";
import { assertPermission, type Permission, type Staff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { galleryUrl } from "@/lib/storage";
import { FORM_ERROR, isUuid, parseIdList, parseProgram, type FieldErrors } from "@/lib/programs/schemas";
import { programErrorCode, programErrorMessage, PROGRAM_ERRORS, SLUG_TAKEN } from "@/lib/programs/errors";
import { uniqueSlug } from "@/lib/programs/slug";

/**
 * Program (কর্মসূচি) admin actions. Each one checks the permission FIRST and
 * then works through the signed-in user's client, so Row-Level Security and
 * the database triggers (slug lock, cover/photo category rules) apply again.
 */

const DENIED = "এই কাজের অনুমতি আপনার নেই।";
const NOT_FOUND = "কর্মসূচিটি খুঁজে পাওয়া যায়নি। হয়তো এটি মুছে ফেলা হয়েছে।";
const CONFLICT =
  "এর মধ্যে অন্য কেউ এই কর্মসূচিটি পরিবর্তন করেছেন। আপনার লেখা কপি করে রাখুন, তারপর পৃষ্ঠাটি রিফ্রেশ করে আবার পরিবর্তন করুন।";
const OFFLINE = "একটি সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।";

export type ProgramSaveResult =
  | { ok: true; id: string; slug: string; updatedAt: string; isPublished: boolean; slugLocked: boolean }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

type Db = Awaited<ReturnType<typeof createClient>>;

async function staffWith(...anyOf: Permission[]): Promise<Staff | null> {
  try {
    return await assertPermission(...anyOf);
  } catch {
    return null;
  }
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function refreshPublic() {
  revalidatePath("/", "layout");
}

/** "slug-2", "slug-3"… — the first free alternative (for the "already used" message). */
async function freeSlug(db: Db, slug: string): Promise<string> {
  const { data } = await db.from("programs").select("slug").like("slug", `${slug}%`).limit(1000);
  return uniqueSlug(slug, (data ?? []).map((r) => r.slug));
}

/** Database error → message, with the field it belongs to when there is one. */
async function saveError(db: Db, error: unknown, slug: string): Promise<ProgramSaveResult> {
  const code = programErrorCode(error);
  const e = error as { code?: string; message?: string };
  if (code === "PROGRAM_SLUG_LOCKED") return { ok: false, error: FORM_ERROR, fieldErrors: { slug: PROGRAM_ERRORS[code] } };
  if (code === "PROGRAM_COVER_MISMATCH") return { ok: false, error: FORM_ERROR, fieldErrors: { cover_image_id: PROGRAM_ERRORS[code] } };
  if (code === "programs_dates_order") return { ok: false, error: FORM_ERROR, fieldErrors: { ends_on: PROGRAM_ERRORS[code] } };
  if (e?.code === "23505" && (e.message ?? "").includes("slug")) {
    const alternative = await freeSlug(db, slug);
    const hint = alternative !== slug ? ` এর বদলে লিখতে পারেন: ${alternative}` : "";
    return { ok: false, error: FORM_ERROR, fieldErrors: { slug: `${SLUG_TAKEN}${hint}` } };
  }
  return { ok: false, error: programErrorMessage(error) };
}

export async function createProgram(raw: unknown): Promise<ProgramSaveResult> {
  const staff = await staffWith("content.manage");
  if (!staff) return { ok: false, error: DENIED };
  const parsed = parseProgram(asRecord(raw));
  if (!parsed.ok) return { ok: false, error: FORM_ERROR, fieldErrors: parsed.fieldErrors };
  try {
    const db = await createClient();
    const { data, error } = await db
      .from("programs")
      .insert({ ...parsed.data, created_by: staff.id })
      .select("id, slug, updated_at, is_published, first_published_at")
      .single();
    if (error) return saveError(db, error, parsed.data.slug);
    refreshPublic();
    return {
      ok: true,
      id: data.id,
      slug: data.slug,
      updatedAt: data.updated_at,
      isPublished: data.is_published,
      slugLocked: data.first_published_at !== null,
    };
  } catch (err) {
    console.error("[programs] create:", err instanceof Error ? err.message : err);
    return { ok: false, error: OFFLINE };
  }
}

/** Edit a program; refuses to overwrite a newer change made by someone else. */
export async function updateProgram(id: unknown, raw: unknown, expectedUpdatedAt: unknown): Promise<ProgramSaveResult> {
  if (!(await staffWith("content.manage"))) return { ok: false, error: DENIED };
  if (!isUuid(id)) return { ok: false, error: NOT_FOUND };
  const parsed = parseProgram(asRecord(raw));
  if (!parsed.ok) return { ok: false, error: FORM_ERROR, fieldErrors: parsed.fieldErrors };
  try {
    const db = await createClient();
    let query = db.from("programs").update(parsed.data).eq("id", id);
    if (typeof expectedUpdatedAt === "string" && expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);
    const { data, error } = await query.select("id, slug, updated_at, is_published, first_published_at");
    if (error) return saveError(db, error, parsed.data.slug);
    if (!data || data.length === 0) {
      const { data: exists } = await db.from("programs").select("id").eq("id", id).maybeSingle();
      return { ok: false, error: exists ? CONFLICT : NOT_FOUND };
    }
    refreshPublic();
    const row = data[0];
    return {
      ok: true,
      id: row.id,
      slug: row.slug,
      updatedAt: row.updated_at,
      isPublished: row.is_published,
      slugLocked: row.first_published_at !== null,
    };
  } catch (err) {
    console.error("[programs] update:", err instanceof Error ? err.message : err);
    return { ok: false, error: OFFLINE };
  }
}

/** Permanently delete a program (its photos stay in the gallery, unlinked; press items lose the link). */
export async function deleteProgram(id: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await staffWith("content.manage"))) return { ok: false, error: DENIED };
  if (!isUuid(id)) return { ok: false, error: NOT_FOUND };
  try {
    const db = await createClient();
    const { data, error } = await db.from("programs").delete().eq("id", id).select("id");
    if (error) return { ok: false, error: programErrorMessage(error) };
    if (!data || data.length === 0) return { ok: false, error: NOT_FOUND };
    refreshPublic();
    return { ok: true };
  } catch (err) {
    console.error("[programs] delete:", err instanceof Error ? err.message : err);
    return { ok: false, error: OFFLINE };
  }
}

// ---------------------------------------------------------------------------
// Images of a category (cover choice and photo linking)
// ---------------------------------------------------------------------------

export type CategoryImage = {
  id: string;
  thumb: string;
  caption: string;
  isPublished: boolean;
  programId: string | null;
  createdAt: string;
};

const IMAGE_PAGE = 48;

/**
 * A page of a category's images (newest first). Staff without gallery.manage
 * only see published images (Row-Level Security).
 */
export async function listCategoryImages(
  categoryId: unknown,
  offset: unknown = 0,
): Promise<{ ok: true; images: CategoryImage[]; total: number } | { ok: false; error: string }> {
  if (!(await staffWith("content.manage", "gallery.manage"))) return { ok: false, error: DENIED };
  if (!isUuid(categoryId)) return { ok: false, error: "ক্যাটাগরি খুঁজে পাওয়া যায়নি।" };
  const from = typeof offset === "number" && Number.isInteger(offset) && offset >= 0 && offset < 100000 ? offset : 0;
  try {
    const db = await createClient();
    const { data, error, count } = await db
      .from("gallery_images")
      .select("id, storage_path, thumb_path, caption, is_published, program_id, created_at", { count: "exact" })
      .eq("category_id", categoryId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + IMAGE_PAGE - 1);
    if (error && error.code !== "PGRST103") return { ok: false, error: programErrorMessage(error) };
    return {
      ok: true,
      total: count ?? 0,
      images: (data ?? []).map((r) => ({
        id: r.id,
        thumb: galleryUrl(r.thumb_path ?? r.storage_path) ?? "",
        caption: r.caption,
        isPublished: r.is_published,
        programId: r.program_id,
        createdAt: r.created_at,
      })),
    };
  } catch (err) {
    console.error("[programs] images:", err instanceof Error ? err.message : err);
    return { ok: false, error: OFFLINE };
  }
}

/**
 * Links photos to a program. Changing photos needs gallery.manage (the
 * gallery's own rule, enforced by RLS); the photos must be in the program's
 * category (checked here and by the database: PROGRAM_CATEGORY_MISMATCH).
 */
export async function linkProgramPhotos(
  programId: unknown,
  imageIds: unknown,
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  if (!(await staffWith("gallery.manage"))) return { ok: false, error: DENIED };
  const ids = parseIdList(imageIds);
  if (!isUuid(programId) || !ids) return { ok: false, error: "কোনো ছবি নির্বাচন করা হয়নি।" };
  try {
    const db = await createClient();
    const { data: program, error: pError } = await db.from("programs").select("id, category_id").eq("id", programId).maybeSingle();
    if (pError) return { ok: false, error: programErrorMessage(pError) };
    if (!program) return { ok: false, error: NOT_FOUND };
    const { data: images, error: iError } = await db.from("gallery_images").select("id, category_id").in("id", ids);
    if (iError) return { ok: false, error: programErrorMessage(iError) };
    if (images.length !== ids.length) return { ok: false, error: "কিছু ছবি খুঁজে পাওয়া যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।" };
    if (images.some((i) => i.category_id !== program.category_id)) {
      return { ok: false, error: PROGRAM_ERRORS.PROGRAM_CATEGORY_MISMATCH };
    }
    const { data, error } = await db.from("gallery_images").update({ program_id: program.id }).in("id", ids).select("id");
    if (error) return { ok: false, error: programErrorMessage(error) };
    refreshPublic();
    return { ok: true, count: data.length };
  } catch (err) {
    console.error("[programs] link:", err instanceof Error ? err.message : err);
    return { ok: false, error: OFFLINE };
  }
}

/** Removes photos from a program (the photos stay in the gallery). */
export async function unlinkProgramPhotos(
  programId: unknown,
  imageIds: unknown,
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  if (!(await staffWith("gallery.manage"))) return { ok: false, error: DENIED };
  const ids = parseIdList(imageIds);
  if (!isUuid(programId) || !ids) return { ok: false, error: "কোনো ছবি নির্বাচন করা হয়নি।" };
  try {
    const db = await createClient();
    const { data, error } = await db
      .from("gallery_images")
      .update({ program_id: null })
      .in("id", ids)
      .eq("program_id", programId)
      .select("id");
    if (error) return { ok: false, error: programErrorMessage(error) };
    refreshPublic();
    return { ok: true, count: data.length };
  } catch (err) {
    console.error("[programs] unlink:", err instanceof Error ? err.message : err);
    return { ok: false, error: OFFLINE };
  }
}
