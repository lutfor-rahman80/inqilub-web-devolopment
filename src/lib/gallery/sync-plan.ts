import { categoryDir, fileIdOf, PLACEHOLDER_FILE, THUMBS_DIR, UUID_RE } from "./paths";

/**
 * Pure planning for "ফোল্ডার সিঙ্ক" (unit tested). Decides which files in a
 * category folder must be registered and which database rows point at files
 * that no longer exist.
 */

/** An entry from Storage `list()`: folders have `id === null`. */
export type ListedEntry = { name: string; id: string | null };

export type SyncCandidate = {
  slug: string;
  path: string;
  /** Storage object id; used as the new file name so repeated/concurrent runs converge. */
  objectId: string;
  /**
   * "adopt": an optimized upload (<uuid>.webp with a matching thumbnail) whose
   * registration never happened — register as-is.
   * "convert": anything else — auto-rotate, resize, re-encode to WebP.
   */
  kind: "adopt" | "convert";
  thumbPath: string | null;
};

const UUID_WEBP = new RegExp(`^${UUID_RE.source.slice(1, -1)}\\.webp$`, "i");

export function isFile(entry: ListedEntry): boolean {
  return entry.id !== null && entry.name !== PLACEHOLDER_FILE && !entry.name.startsWith(".");
}

/** A sub-folder of a category folder (e.g. a whole event folder dragged in through the dashboard). */
export type NestedFolder = { folder: string; entries: ListedEntry[] };

/** Names of the sub-folders of a category folder that may hold photos (everything but thumbs/). */
export function photoSubfolders(rootEntries: ListedEntry[]): string[] {
  return rootEntries.filter((e) => e.id === null && e.name !== THUMBS_DIR).map((e) => e.name);
}

/**
 * Files of one category folder that are not registered yet: files directly
 * in the folder, plus files one level down in sub-folders (converted into the
 * category folder). Names reserved by a browser upload that is still in
 * progress are skipped, so sync never takes over someone's upload.
 */
export function planCategory(
  slug: string,
  rootEntries: ListedEntry[],
  thumbEntries: ListedEntry[],
  registered: Set<string>,
  { reserved = new Set<string>(), nested = [] }: { reserved?: Set<string>; nested?: NestedFolder[] } = {},
): SyncCandidate[] {
  const dir = categoryDir(slug);
  const isReserved = (name: string) => {
    const id = fileIdOf(name);
    return id !== null && reserved.has(id);
  };
  const thumbNames = new Set(thumbEntries.filter(isFile).map((e) => e.name));
  const out: SyncCandidate[] = [];
  for (const entry of rootEntries) {
    if (!isFile(entry)) continue; // folders (thumbs/ etc.) and placeholders
    if (isReserved(entry.name)) continue; // a browser upload in progress
    const path = `${dir}/${entry.name}`;
    if (registered.has(path)) continue;
    const thumbPath = `${dir}/${THUMBS_DIR}/${entry.name}`;
    const adopt = UUID_WEBP.test(entry.name) && thumbNames.has(entry.name) && !registered.has(thumbPath);
    out.push({
      slug,
      path,
      objectId: entry.id!,
      kind: adopt ? "adopt" : "convert",
      thumbPath: adopt ? thumbPath : null,
    });
  }
  for (const { folder, entries } of nested) {
    if (folder === THUMBS_DIR) continue;
    for (const entry of entries) {
      if (!isFile(entry)) continue;
      out.push({ slug, path: `${dir}/${folder}/${entry.name}`, objectId: entry.id!, kind: "convert", thumbPath: null });
    }
  }
  return out;
}

/** Every file path present in a category folder (root + thumbs). */
export function presentPaths(slug: string, rootEntries: ListedEntry[], thumbEntries: ListedEntry[]): Set<string> {
  const dir = categoryDir(slug);
  const set = new Set<string>();
  for (const e of rootEntries) if (isFile(e)) set.add(`${dir}/${e.name}`);
  for (const e of thumbEntries) if (isFile(e)) set.add(`${dir}/${THUMBS_DIR}/${e.name}`);
  return set;
}

export type RegisteredRow = { id: string; storage_path: string; thumb_path: string | null; caption: string };

/** Registered rows whose full image (or thumbnail) is missing from storage. */
export function findMissing(
  rows: RegisteredRow[],
  present: Set<string>,
  scannedDirs: Set<string>,
): { id: string; path: string; caption: string; what: "image" | "thumb" }[] {
  const out: { id: string; path: string; caption: string; what: "image" | "thumb" }[] = [];
  for (const row of rows) {
    const dir = row.storage_path.slice(0, row.storage_path.lastIndexOf("/"));
    if (!scannedDirs.has(dir)) continue; // folder could not be listed: do not guess
    if (!present.has(row.storage_path)) {
      out.push({ id: row.id, path: row.storage_path, caption: row.caption, what: "image" });
    } else if (row.thumb_path && !present.has(row.thumb_path)) {
      out.push({ id: row.id, path: row.thumb_path, caption: row.caption, what: "thumb" });
    }
  }
  return out;
}

/** Sync target for a converted file (same folder, object id as file name). */
export function convertTargets(slug: string, objectId: string) {
  const dir = categoryDir(slug);
  return { full: `${dir}/${objectId}.webp`, thumb: `${dir}/${THUMBS_DIR}/${objectId}.webp` };
}
