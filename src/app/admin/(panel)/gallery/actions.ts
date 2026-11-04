"use server";

import { revalidatePath } from "next/cache";
import { assertPermission, type Permission, type Staff } from "@/lib/auth";
import type { ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GALLERY_BUCKET } from "@/lib/storage";
import { galleryErrorMessage } from "@/lib/gallery/errors";
import { heroPlacements, inHeroOrder, type HeroPlacement } from "@/lib/gallery/hero";
import { isUuid, moveTarget, parseUploadPath, reservedFilePaths } from "@/lib/gallery/paths";
import {
  fieldErrorsOf,
  idListSchema,
  imagePatchSchema,
  itemsInCategory,
  MAX_FILES_PER_UPLOAD,
  registerSchema,
  uuidSchema,
  type ImagePatchInput,
  type RegisterInput,
} from "@/lib/gallery/schemas";
import { runFolderSync, type SyncSummary } from "@/lib/gallery/sync";
import { PROGRAM_ERRORS } from "@/lib/programs/errors";

const DENIED = "এই কাজের অনুমতি আপনার নেই।";
const NOT_FOUND = "ছবিটি খুঁজে পাওয়া যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার দেখুন।";
const PROGRAM_NOT_FOUND = "নির্বাচিত কর্মসূচিটি খুঁজে পাওয়া যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার বেছে নিন।";

type UserClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Permission check FIRST (throws → Bengali error), then the work through the
 * signed-in user's client so Row-Level Security enforces the same rule again.
 */
async function guarded<T>(
  permission: Permission,
  fn: (staff: Staff, supabase: UserClient) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  let staff: Staff;
  try {
    staff = await assertPermission(permission);
  } catch {
    return { ok: false, error: DENIED };
  }
  try {
    return await fn(staff, await createClient());
  } catch (err) {
    console.error("[gallery action]", err instanceof Error ? err.message : err);
    return { ok: false, error: galleryErrorMessage(err) };
  }
}

function refreshPublic() {
  revalidatePath("/", "layout");
}

/**
 * Removes the files of upload reservations that the caller has just
 * claimed or released (see migration 20261027100001): only the canonical
 * names of those server-issued file ids, and never a name that a gallery
 * row refers to. The service key is needed because staff without
 * gallery.delete may not delete storage objects themselves.
 */
async function removeReservedFiles(supabase: UserClient, files: { slug: string; fileId: string }[]): Promise<number> {
  if (files.length === 0) return 0;
  const candidates = files.flatMap((f) => reservedFilePaths(f.slug, f.fileId));
  const [byPath, byThumb] = await Promise.all([
    supabase.from("gallery_images").select("storage_path").in("storage_path", candidates),
    supabase.from("gallery_images").select("thumb_path").in("thumb_path", candidates),
  ]);
  if (byPath.error || byThumb.error) return 0;
  const used = new Set([...byPath.data.map((r) => r.storage_path), ...byThumb.data.map((r) => r.thumb_path)]);
  const removable = candidates.filter((p) => !used.has(p));
  if (removable.length === 0) return 0;
  const { data, error } = await createAdminClient().storage.from(GALLERY_BUCKET).remove(removable);
  if (error) {
    console.error("[gallery] remove reserved files:", error.message);
    return 0;
  }
  return data.length;
}

// ---------------------------------------------------------------------------
// Upload: reserve names → browser uploads → register (or discard)
// ---------------------------------------------------------------------------

/**
 * Reserves file names for a browser upload. Staff sessions can only create
 * storage objects at reserved names (storage RLS), so every uploaded file is
 * traceable to the person and upload that created it.
 */
export async function reserveGalleryUploads(
  categoryId: string,
  count: number,
): Promise<ActionResult<{ slug: string; fileIds: string[] }>> {
  return guarded<{ slug: string; fileIds: string[] }>("gallery.manage", async (_staff, supabase) => {
    if (!uuidSchema.safeParse(categoryId).success) return { ok: false, error: "ক্যাটাগরি খুঁজে পাওয়া যায়নি।" };
    if (!Number.isInteger(count) || count < 1 || count > MAX_FILES_PER_UPLOAD) {
      return { ok: false, error: "একবারে ১ থেকে ৩০টি ছবি আপলোড করা যায়।" };
    }
    const { data, error } = await supabase.rpc("gallery_reserve_uploads", { p_category_id: categoryId, p_count: count });
    if (error) return { ok: false, error: galleryErrorMessage(error) };
    if (!data || data.length !== count) return { ok: false, error: "আপলোড শুরু করা যায়নি। আবার চেষ্টা করুন।" };
    return { ok: true, data: { slug: data[0].slug, fileIds: data.map((r) => r.file_id) } };
  });
}

export type RegisterOutcome = {
  registered: string[];
  failed: { path: string; error: string }[];
};

/** Registers files the browser has just uploaded to reserved names in activities/<slug>/ (+ thumbs/). */
export async function registerGalleryImages(input: RegisterInput): Promise<ActionResult<RegisterOutcome>> {
  return guarded<RegisterOutcome>("gallery.manage", async (staff, supabase) => {
    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors = fieldErrorsOf(parsed.error);
      return { ok: false, error: Object.values(fieldErrors)[0] ?? "তথ্য সঠিক নয়।", fieldErrors };
    }
    const v = parsed.data;

    const { data: category, error: catError } = await supabase
      .from("activity_categories")
      .select("id, slug")
      .eq("id", v.categoryId)
      .maybeSingle();
    if (catError) return { ok: false, error: galleryErrorMessage(catError) };
    if (!category) return { ok: false, error: "ক্যাটাগরি খুঁজে পাওয়া যায়নি।" };

    // Optional program: must exist and belong to the same category (the database checks it too).
    if (v.programId) {
      const { data: program, error: programError } = await supabase
        .from("programs")
        .select("id, category_id")
        .eq("id", v.programId)
        .maybeSingle();
      if (programError) return { ok: false, error: galleryErrorMessage(programError) };
      if (!program) return { ok: false, error: PROGRAM_NOT_FOUND, fieldErrors: { programId: PROGRAM_NOT_FOUND } };
      if (program.category_id !== category.id) {
        return { ok: false, error: PROGRAM_ERRORS.PROGRAM_CATEGORY_MISMATCH, fieldErrors: { programId: PROGRAM_ERRORS.PROGRAM_CATEGORY_MISMATCH } };
      }
    }

    // Nothing is cleaned up for mismatched input: the paths are not trusted.
    if (!itemsInCategory(category.slug, v.items)) {
      return { ok: false, error: "ফাইলের ফোল্ডার নির্বাচিত ক্যাটাগরির সাথে মিলছে না। আবার আপলোড করুন।" };
    }
    const items = v.items.map((item, index) => ({ ...item, index, fileId: parseUploadPath(item.path)!.fileId }));
    if (new Set(items.map((i) => i.fileId)).size !== items.length) {
      return { ok: false, error: "একই ফাইল দুইবার দেওয়া হয়েছে।" };
    }

    const registered: string[] = [];
    const failed: RegisterOutcome["failed"] = [];

    // A retried registration (e.g. the first response was lost) is idempotent,
    // but only for this person's own uploads to this category.
    const { data: existing, error: existingError } = await supabase
      .from("gallery_images")
      .select("storage_path, category_id, source, uploaded_by")
      .in("storage_path", items.map((i) => i.path));
    if (existingError) return { ok: false, error: galleryErrorMessage(existingError) };
    const existingByPath = new Map(existing.map((r) => [r.storage_path, r]));
    const fresh = items.filter((item) => {
      const row = existingByPath.get(item.path);
      if (!row) return true;
      if (row.source === "upload" && row.uploaded_by === staff.id && row.category_id === category.id) {
        registered.push(item.path);
      } else {
        failed.push({ path: item.path, error: "এই ফাইলটি আগেই অন্যভাবে গ্যালারিতে যুক্ত হয়েছে।" });
      }
      return false;
    });

    // Claim the reservations: each one can be registered (or discarded) only once.
    let claimedIds = new Set<string>();
    if (fresh.length > 0) {
      const { data: claimed, error: claimError } = await supabase.rpc("gallery_claim_uploads", {
        p_category_id: category.id,
        p_file_ids: fresh.map((i) => i.fileId),
      });
      if (claimError) return { ok: false, error: galleryErrorMessage(claimError) };
      claimedIds = new Set(claimed);
    }
    const claimedItems = fresh.filter((item) => {
      if (claimedIds.has(item.fileId)) return true;
      failed.push({ path: item.path, error: "আপলোডের মেয়াদ শেষ হয়ে গেছে। ছবিটি আবার আপলোড করুন।" });
      return false;
    });

    const cleanup = (list: typeof claimedItems) =>
      removeReservedFiles(supabase, list.map((i) => ({ slug: category.slug, fileId: i.fileId })));

    if (claimedItems.length > 0) {
      const { data: infos, error: infoError } = await supabase.rpc("gallery_object_info", {
        p_paths: claimedItems.flatMap((i) => [i.path, i.thumbPath]),
      });
      if (infoError) {
        await cleanup(claimedItems);
        return { ok: false, error: galleryErrorMessage(infoError) };
      }
      const info = new Map(infos.map((o) => [o.name, o]));
      const base = Date.now();
      const rows = [];
      const bad: typeof claimedItems = [];
      for (const item of claimedItems) {
        const full = info.get(item.path);
        const thumb = info.get(item.thumbPath);
        if (!full || !thumb) {
          failed.push({ path: item.path, error: "ফাইলটি স্টোরেজে পাওয়া যায়নি। আবার আপলোড করুন।" });
          bad.push(item);
          continue;
        }
        if (full.mime_type !== "image/webp" && full.mime_type !== "image/jpeg") {
          failed.push({ path: item.path, error: "ফাইলের ধরন সমর্থিত নয়।" });
          bad.push(item);
          continue;
        }
        rows.push({
          category_id: category.id,
          storage_path: item.path,
          thumb_path: item.thumbPath,
          width: item.width,
          height: item.height,
          size_bytes: full.size_bytes ?? null,
          caption: v.caption,
          event_date: v.eventDate,
          is_published: v.publish,
          program_id: v.programId ?? null,
          source: "upload",
          uploaded_by: staff.id,
          // Same transaction → same now(); spread by milliseconds so the
          // selection order is kept ("newest first" shows the first file first).
          created_at: new Date(base - item.index).toISOString(),
        });
      }
      await cleanup(bad);

      if (rows.length > 0) {
        const { error: insertError } = await supabase.from("gallery_images").insert(rows);
        if (insertError) {
          await cleanup(claimedItems.filter((i) => !bad.includes(i)));
          return { ok: false, error: galleryErrorMessage(insertError) };
        }
        registered.push(...rows.map((r) => r.storage_path));
      }
    }

    if (registered.length > 0) refreshPublic();
    return { ok: true, data: { registered, failed } };
  });
}

/**
 * After a failed upload step: releases the caller's own, never-registered
 * reservations and removes their files. Anything else is left alone.
 */
export async function discardUploads(fileIds: string[]): Promise<ActionResult<{ removed: number }>> {
  return guarded<{ removed: number }>("gallery.manage", async (_staff, supabase) => {
    if (!Array.isArray(fileIds) || fileIds.length > 60 || !fileIds.every(isUuid)) {
      return { ok: false, error: "অবৈধ অনুরোধ।" };
    }
    if (fileIds.length === 0) return { ok: true, data: { removed: 0 } };
    const { data, error } = await supabase.rpc("gallery_release_uploads", { p_file_ids: fileIds });
    if (error) return { ok: false, error: galleryErrorMessage(error) };
    const removed = await removeReservedFiles(
      supabase,
      data.map((r) => ({ slug: r.slug, fileId: r.file_id })),
    );
    return { ok: true, data: { removed } };
  });
}

// ---------------------------------------------------------------------------
// Editing
// ---------------------------------------------------------------------------

/**
 * Where a photo marked “হিরো স্লাইডার” stands on the homepage (shown as number n, or why not),
 * computed the same way as the homepage and the admin gallery (src/lib/gallery/hero.ts).
 */
async function heroPlacementOf(supabase: UserClient, id: string): Promise<HeroPlacement | null> {
  const { data, error } = await inHeroOrder(
    supabase.from("gallery_images").select("id, is_published, category:activity_categories!gallery_images_category_id_fkey(is_active)").eq("is_featured", true),
  );
  if (error) return null;
  const placements = heroPlacements(data.map((r) => ({ id: r.id, isPublished: r.is_published, categoryActive: r.category?.is_active === true })));
  return placements.get(id) ?? null;
}

/** Updates the given fields; `hero` tells where the photo stands in the hero slider when it is marked (else null). */
export async function updateGalleryImage(id: string, patch: ImagePatchInput): Promise<ActionResult<{ hero: HeroPlacement | null }>> {
  return guarded<{ hero: HeroPlacement | null }>("gallery.manage", async (_staff, supabase) => {
    if (!uuidSchema.safeParse(id).success) return { ok: false, error: NOT_FOUND };
    const parsed = imagePatchSchema.safeParse(patch);
    if (!parsed.success) {
      const fieldErrors = fieldErrorsOf(parsed.error);
      return { ok: false, error: Object.values(fieldErrors)[0] ?? "তথ্য সঠিক নয়।", fieldErrors };
    }
    const p = parsed.data;
    const update: {
      caption?: string;
      event_date?: string | null;
      sort_order?: number;
      is_published?: boolean;
      is_featured?: boolean;
      program_id?: string | null;
    } = {};
    if (p.caption !== undefined) update.caption = p.caption;
    if (p.eventDate !== undefined) update.event_date = p.eventDate;
    if (p.sortOrder !== undefined) update.sort_order = p.sortOrder;
    if (p.isPublished !== undefined) update.is_published = p.isPublished;
    if (p.isFeatured !== undefined) update.is_featured = p.isFeatured;
    if (p.programId !== undefined) update.program_id = p.programId;

    const { data, error } = await supabase.from("gallery_images").update(update).eq("id", id).select("id, is_featured").maybeSingle();
    if (error) return { ok: false, error: galleryErrorMessage(error) };
    if (!data) return { ok: false, error: NOT_FOUND };
    refreshPublic();
    return { ok: true, data: { hero: data.is_featured ? await heroPlacementOf(supabase, id) : null } };
  });
}

/** Bulk publish / unpublish. */
export async function setImagesPublished(ids: string[], published: boolean): Promise<ActionResult<{ count: number }>> {
  return guarded<{ count: number }>("gallery.manage", async (_staff, supabase) => {
    const parsed = idListSchema.safeParse(ids);
    if (!parsed.success || typeof published !== "boolean") {
      return { ok: false, error: parsed.error?.issues[0]?.message ?? "অবৈধ অনুরোধ।" };
    }
    const { data, error } = await supabase
      .from("gallery_images")
      .update({ is_published: published })
      .in("id", parsed.data)
      .select("id");
    if (error) return { ok: false, error: galleryErrorMessage(error) };
    if (data.length > 0) refreshPublic();
    return { ok: true, data: { count: data.length } };
  });
}

/** One step up/down within the image's category. */
export async function reorderGalleryImage(id: string, up: boolean): Promise<ActionResult> {
  return guarded<undefined>("gallery.manage", async (_staff, supabase) => {
    if (!uuidSchema.safeParse(id).success || typeof up !== "boolean") return { ok: false, error: NOT_FOUND };
    const { error } = await supabase.rpc("gallery_move_image", { p_image_id: id, p_up: up });
    if (error) return { ok: false, error: galleryErrorMessage(error) };
    refreshPublic();
    return { ok: true };
  });
}

/**
 * Changes an image's category: MOVES the full-size file and the thumbnail to
 * the new category folder, then updates the row. If the database update
 * fails the files are moved back, so storage and database stay in sync.
 */
export async function moveGalleryImage(id: string, categoryId: string): Promise<ActionResult<{ path: string }>> {
  return guarded<{ path: string }>("gallery.manage", async (_staff, supabase) => {
    if (!uuidSchema.safeParse(id).success || !uuidSchema.safeParse(categoryId).success) {
      return { ok: false, error: NOT_FOUND };
    }
    const [{ data: image, error: imgError }, { data: target, error: catError }] = await Promise.all([
      supabase.from("gallery_images").select("id, category_id, storage_path, thumb_path").eq("id", id).maybeSingle(),
      supabase.from("activity_categories").select("id, slug").eq("id", categoryId).maybeSingle(),
    ]);
    if (imgError || catError) return { ok: false, error: galleryErrorMessage(imgError ?? catError) };
    if (!image) return { ok: false, error: NOT_FOUND };
    if (!target) return { ok: false, error: "নতুন ক্যাটাগরি খুঁজে পাওয়া যায়নি।" };
    if (image.category_id === target.id) return { ok: true, data: { path: image.storage_path } };

    const newFull = moveTarget(image.storage_path, target.slug);
    const newThumb = image.thumb_path ? moveTarget(image.thumb_path, target.slug, true) : null;
    // Storage maintenance with the service key: staff sessions cannot move or
    // overwrite gallery objects (storage RLS). The permission was checked
    // above, and both paths come from the database row, not from the client.
    const bucket = createAdminClient().storage.from(GALLERY_BUCKET);

    const m1 = await bucket.move(image.storage_path, newFull);
    if (m1.error) {
      console.error("[gallery] move:", m1.error.message);
      return { ok: false, error: "ফাইলটি নতুন ফোল্ডারে সরানো যায়নি। আবার চেষ্টা করুন।" };
    }
    if (image.thumb_path && newThumb) {
      const m2 = await bucket.move(image.thumb_path, newThumb);
      if (m2.error) {
        console.error("[gallery] move thumb:", m2.error.message);
        await bucket.move(newFull, image.storage_path);
        return { ok: false, error: "থাম্বনেইল নতুন ফোল্ডারে সরানো যায়নি। আবার চেষ্টা করুন।" };
      }
    }

    const { data: updated, error: updError } = await supabase
      .from("gallery_images")
      .update({ category_id: target.id, storage_path: newFull, thumb_path: newThumb })
      .eq("id", image.id)
      .select("id")
      .maybeSingle();
    if (updError || !updated) {
      // Roll the files back so the row still points at real files.
      const back1 = await bucket.move(newFull, image.storage_path);
      const back2 = image.thumb_path && newThumb ? await bucket.move(newThumb, image.thumb_path) : { error: null };
      if (back1.error || back2.error) {
        console.error("[gallery] move rollback failed:", back1.error?.message, back2.error?.message);
      }
      return { ok: false, error: updError ? galleryErrorMessage(updError) : NOT_FOUND };
    }

    refreshPublic();
    return { ok: true, data: { path: newFull } };
  });
}

// ---------------------------------------------------------------------------
// Delete (gallery.delete)
// ---------------------------------------------------------------------------

/** Deletes the rows first, then their files (database is the source of truth). */
export async function deleteGalleryImages(ids: string[]): Promise<ActionResult<{ count: number; filesLeft: number }>> {
  return guarded<{ count: number; filesLeft: number }>("gallery.delete", async (_staff, supabase) => {
    const parsed = idListSchema.safeParse(ids);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "অবৈধ অনুরোধ।" };

    const { data: deleted, error } = await supabase
      .from("gallery_images")
      .delete()
      .in("id", parsed.data)
      .select("id, storage_path, thumb_path");
    if (error) return { ok: false, error: galleryErrorMessage(error) };
    if (deleted.length === 0) return { ok: false, error: NOT_FOUND };

    const paths = deleted.flatMap((r) => (r.thumb_path ? [r.storage_path, r.thumb_path] : [r.storage_path]));
    const { data: removed, error: rmError } = await supabase.storage.from(GALLERY_BUCKET).remove(paths);
    let left = paths.filter((p) => !(removed ?? []).some((o) => o.name === p));
    if (rmError || left.length > 0) {
      // The permission was verified above; finish the cleanup with the admin client
      // so a deleted photo cannot come back through folder sync.
      const retry = await createAdminClient().storage.from(GALLERY_BUCKET).remove(left.length ? left : paths);
      if (retry.error) console.error("[gallery] remove files:", retry.error.message);
      else left = left.filter((p) => !(retry.data ?? []).some((o) => o.name === p));
    }

    refreshPublic();
    return { ok: true, data: { count: deleted.length, filesLeft: left.length } };
  });
}

// ---------------------------------------------------------------------------
// Folder sync
// ---------------------------------------------------------------------------

/**
 * Processes one batch (≤15 files). The client calls it repeatedly, passing
 * the paths that failed so far, until `remaining` is 0.
 */
export async function syncGalleryFolders(exclude: string[] = []): Promise<ActionResult<SyncSummary>> {
  return guarded<SyncSummary>("gallery.manage", async (staff, supabase) => {
    if (!Array.isArray(exclude) || exclude.length > 2000 || !exclude.every((p) => typeof p === "string" && p.length <= 300)) {
      return { ok: false, error: "অবৈধ অনুরোধ।" };
    }
    const summary = await runFolderSync({ staffId: staff.id, supabase, exclude });
    if (!summary) return { ok: false, error: "ফোল্ডার পড়া যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।" };
    if (summary.registered > 0) refreshPublic();
    return { ok: true, data: summary };
  });
}
