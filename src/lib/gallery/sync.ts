import "server-only";
import sharp, { type Metadata, type OutputInfo } from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import { GALLERY_BUCKET, IMAGE_LIMITS } from "@/lib/storage";
import { categoryDir, GALLERY_CACHE_CONTROL, THUMBS_DIR } from "./paths";
import { FALLBACK_DIMENSION, FALLBACK_QUALITIES, FULL_QUALITIES, FULL_TARGET_BYTES, OVERSIZE_FACTOR } from "./limits";
import {
  convertTargets,
  findMissing,
  isFile,
  photoSubfolders,
  planCategory,
  presentPaths,
  type ListedEntry,
  type NestedFolder,
  type RegisteredRow,
  type SyncCandidate,
} from "./sync-plan";

/**
 * "ফোল্ডার সিঙ্ক": registers photos that were put straight into a category
 * folder (e.g. through the Supabase dashboard) and reports database rows
 * whose files are missing.
 *
 * Callers MUST check `gallery.manage` first. Storage listing/conversion uses
 * the admin client (maintenance); database rows are written through the
 * signed-in user's client so Row-Level Security applies as well.
 */

type UserClient = Awaited<ReturnType<typeof createClient>>;

export const SYNC_BATCH_SIZE = 15;
const LIST_PAGE = 1000;
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

export type SyncFailure = { path: string; reason: string };
export type SyncMissing = { id: string; path: string; caption: string; what: "image" | "thumb" };
/** Files/folders that sync cannot place in a category (reported, left untouched). */
export type SyncIgnored = { path: string; reason: "outside-category" | "too-deep" };
export type SyncSummary = {
  registered: number;
  failed: SyncFailure[];
  missing: SyncMissing[];
  /** Unregistered files still waiting (excluding the ones the caller asked to skip). */
  remaining: number;
  unknownFolders: string[];
  unreadableFolders: string[];
  ignored: SyncIgnored[];
};

async function listAll(admin: ReturnType<typeof createAdminClient>, prefix: string): Promise<ListedEntry[] | null> {
  const out: ListedEntry[] = [];
  for (let offset = 0; ; offset += LIST_PAGE) {
    const { data, error } = await admin.storage
      .from(GALLERY_BUCKET)
      .list(prefix, { limit: LIST_PAGE, offset, sortBy: { column: "name", order: "asc" } });
    if (error) {
      console.error(`[gallery-sync] list ${prefix}:`, error.message);
      return null;
    }
    out.push(...data.map((e) => ({ name: e.name, id: e.id ?? null })));
    if (data.length < LIST_PAGE) return out;
  }
}

async function registeredRows(supabase: UserClient): Promise<RegisteredRow[] | null> {
  const rows: RegisteredRow[] = [];
  for (let from = 0; ; from += LIST_PAGE) {
    const { data, error } = await supabase
      .from("gallery_images")
      .select("id, storage_path, thumb_path, caption")
      .order("id", { ascending: true })
      .range(from, from + LIST_PAGE - 1);
    if (error) {
      console.error("[gallery-sync] rows:", error.message);
      return null;
    }
    rows.push(...data);
    if (data.length < LIST_PAGE) return rows;
  }
}

/** Runs `fn` over items with at most `limit` in flight. */
async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      await fn(item);
    }
  });
  await Promise.all(workers);
}

/**
 * Full-size WebP within the size target (about 200 KB): lower the quality
 * step by step, and scale very detailed photos down to 1280px.
 */
async function encodeFull(input: Buffer, max: number): Promise<{ data: Buffer; info: OutputInfo }> {
  const encode = (dimension: number, quality: number) =>
    sharp(input, { failOn: "error" })
      .autoOrient()
      .resize({ width: dimension, height: dimension, fit: "inside", withoutEnlargement: true })
      .webp({ quality: Math.round(quality * 100) })
      .toBuffer({ resolveWithObject: true });
  let out = await encode(max, FULL_QUALITIES[0]);
  for (const q of FULL_QUALITIES.slice(1)) {
    if (out.info.size <= FULL_TARGET_BYTES) return out;
    out = await encode(max, q);
  }
  if (out.info.size > FULL_TARGET_BYTES * OVERSIZE_FACTOR) {
    for (const q of FALLBACK_QUALITIES) {
      out = await encode(Math.min(max, FALLBACK_DIMENSION), q);
      if (out.info.size <= FULL_TARGET_BYTES * OVERSIZE_FACTOR) break;
    }
  }
  return out;
}

type ProcessOutcome = { status: "registered" | "skipped" } | { status: "failed"; reason: string };

async function processCandidate(
  c: SyncCandidate,
  categoryId: string,
  staffId: string,
  supabase: UserClient,
  admin: ReturnType<typeof createAdminClient>,
): Promise<ProcessOutcome> {
  const bucket = admin.storage.from(GALLERY_BUCKET);
  const { data: blob, error: dlError } = await bucket.download(c.path);
  if (dlError || !blob) return { status: "failed", reason: "ফাইলটি ডাউনলোড করা যায়নি।" };
  if (blob.size > MAX_SOURCE_BYTES) return { status: "failed", reason: "ফাইলটি অনেক বড় (২৫ MB-এর বেশি)।" };
  const input = Buffer.from(await blob.arrayBuffer());

  let meta: Metadata;
  try {
    meta = await sharp(input, { failOn: "error" }).metadata();
  } catch {
    return { status: "failed", reason: "ছবিটি পড়া যায়নি (ফাইলটি ছবি নয় বা নষ্ট)।" };
  }

  const max = IMAGE_LIMITS.fullMaxDimension;
  const insertRow = async (row: { storage_path: string; thumb_path: string; width: number; height: number; size_bytes: number }) => {
    const { error } = await supabase.from("gallery_images").insert({
      ...row,
      category_id: categoryId,
      caption: "",
      is_published: false,
      is_featured: false,
      source: "sync",
      uploaded_by: staffId,
    });
    return error;
  };

  // An optimized upload whose registration never happened: register it as-is.
  if (c.kind === "adopt" && c.thumbPath && meta.format === "webp" && meta.width && meta.height
      && meta.width <= max && meta.height <= max && !meta.orientation) {
    const error = await insertRow({
      storage_path: c.path, thumb_path: c.thumbPath, width: meta.width, height: meta.height, size_bytes: input.length,
    });
    if (!error) return { status: "registered" };
    if (error.code === "23505") return { status: "skipped" };
    console.error("[gallery-sync] insert:", error.message);
    return { status: "failed", reason: "ডাটাবেসে নিবন্ধন করা যায়নি।" };
  }

  let full: { data: Buffer; info: OutputInfo };
  let thumb: { data: Buffer; info: OutputInfo };
  try {
    full = await encodeFull(input, max);
    thumb = await sharp(full.data)
      .resize({
        width: IMAGE_LIMITS.thumbMaxDimension,
        height: IMAGE_LIMITS.thumbMaxDimension,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 72 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    return { status: "failed", reason: "ছবিটি রূপান্তর করা যায়নি।" };
  }

  const target = convertTargets(c.slug, c.objectId);
  const opts = { contentType: "image/webp", cacheControl: GALLERY_CACHE_CONTROL, upsert: true };
  const up1 = await bucket.upload(target.full, full.data, opts);
  const up2 = up1.error ? up1 : await bucket.upload(target.thumb, thumb.data, opts);
  if (up1.error || up2.error) {
    console.error("[gallery-sync] upload:", (up1.error ?? up2.error)?.message);
    if (!up1.error && target.full !== c.path) await bucket.remove([target.full]);
    return { status: "failed", reason: "রূপান্তরিত ছবি আপলোড করা যায়নি।" };
  }

  const error = await insertRow({
    storage_path: target.full,
    thumb_path: target.thumb,
    width: full.info.width,
    height: full.info.height,
    size_bytes: full.info.size,
  });
  if (error && error.code !== "23505") {
    console.error("[gallery-sync] insert:", error.message);
    // Leave the original in place; remove only what this run created.
    if (target.full !== c.path) await bucket.remove([target.full, target.thumb]);
    return { status: "failed", reason: "ডাটাবেসে নিবন্ধন করা যায়নি।" };
  }

  // The optimized copy is registered (by this run or a concurrent one): drop the original.
  if (target.full !== c.path) {
    const { error: rmError } = await bucket.remove([c.path]);
    if (rmError) console.error("[gallery-sync] remove original:", rmError.message);
  }
  return { status: error ? "skipped" : "registered" };
}

export async function runFolderSync({
  staffId,
  supabase,
  exclude = [],
  batchSize = SYNC_BATCH_SIZE,
}: {
  staffId: string;
  supabase: UserClient;
  exclude?: string[];
  batchSize?: number;
}): Promise<SyncSummary | null> {
  const admin = createAdminClient();

  const [{ data: categories, error: catError }, rows, topLevel, { data: reservedIds, error: resError }] = await Promise.all([
    supabase.from("activity_categories").select("id, slug"),
    registeredRows(supabase),
    listAll(admin, "activities"),
    supabase.rpc("gallery_reserved_file_ids"),
  ]);
  if (catError || resError || !rows) {
    if (catError) console.error("[gallery-sync] categories:", catError.message);
    if (resError) console.error("[gallery-sync] reservations:", resError.message);
    return null;
  }
  // Names handed out to browser uploads that are still in progress.
  const reserved = new Set(reservedIds);

  const registered = new Set<string>();
  for (const r of rows) {
    registered.add(r.storage_path);
    if (r.thumb_path) registered.add(r.thumb_path);
  }

  const known = new Set(categories.map((c) => c.slug));
  const unknownFolders = (topLevel ?? [])
    .filter((e) => e.id === null && !known.has(e.name))
    .map((e) => `${categoryDir(e.name)}/`);
  const ignored: SyncIgnored[] = (topLevel ?? [])
    .filter(isFile)
    .map((e) => ({ path: `activities/${e.name}`, reason: "outside-category" }));

  const present = new Set<string>();
  const scannedDirs = new Set<string>();
  const unreadableFolders: string[] = [];
  const candidates: SyncCandidate[] = [];
  const categoryIdBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  await pool(categories, 4, async (cat) => {
    const dir = categoryDir(cat.slug);
    const [root, thumbs] = await Promise.all([listAll(admin, dir), listAll(admin, `${dir}/${THUMBS_DIR}`)]);
    if (!root || !thumbs) {
      unreadableFolders.push(`${dir}/`);
      return;
    }
    // Photos one level down (e.g. a folder dragged in through the dashboard).
    const nested: NestedFolder[] = [];
    for (const folder of photoSubfolders(root)) {
      const entries = await listAll(admin, `${dir}/${folder}`);
      if (!entries) {
        unreadableFolders.push(`${dir}/${folder}/`);
        continue;
      }
      nested.push({ folder, entries });
      for (const e of entries) {
        if (e.id === null) ignored.push({ path: `${dir}/${folder}/${e.name}/`, reason: "too-deep" });
      }
    }
    scannedDirs.add(dir);
    for (const p of presentPaths(cat.slug, root, thumbs)) present.add(p);
    candidates.push(...planCategory(cat.slug, root, thumbs, registered, { reserved, nested }));
  });

  const skip = new Set(exclude);
  const pending = candidates.filter((c) => !skip.has(c.path)).sort((a, b) => a.path.localeCompare(b.path));
  const batch = pending.slice(0, batchSize);

  let registeredCount = 0;
  const failed: SyncFailure[] = [];
  await pool(batch, 3, async (c) => {
    const outcome = await processCandidate(c, categoryIdBySlug.get(c.slug)!, staffId, supabase, admin).catch(
      (err: unknown): ProcessOutcome => {
        console.error("[gallery-sync] process:", err instanceof Error ? err.message : err);
        return { status: "failed", reason: "অপ্রত্যাশিত সমস্যা হয়েছে।" };
      },
    );
    if (outcome.status === "registered") registeredCount++;
    else if (outcome.status === "failed") failed.push({ path: c.path, reason: outcome.reason });
  });

  // Rows registered in this run point at files created in this run, which
  // the earlier listing has not seen; only report rows that existed before.
  const missing = findMissing(rows, present, scannedDirs);

  return {
    registered: registeredCount,
    failed,
    missing,
    remaining: Math.max(0, pending.length - batch.length),
    unknownFolders,
    unreadableFolders,
    ignored,
  };
}
