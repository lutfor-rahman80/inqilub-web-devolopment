#!/usr/bin/env node
// Downloads every file from the Supabase Storage buckets ("gallery", "members")
// into a local folder, preserving the folder structure (activities/<slug>/...).
//
// Usage:
//   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SECRET_KEY=sb_secret_xxx \
//     node scripts/backup-storage.mjs ./backups/2026-10-27
//
// Existing files with the same size are skipped, so re-running only fetches
// new photos. Restore = upload the folders back with the same paths
// (e.g. via the Supabase dashboard), then run "ফোল্ডার সিঙ্ক" in the admin panel.
import { createClient } from "@supabase/supabase-js";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const outDir = process.argv[2] ?? `./backups/storage-${new Date().toISOString().slice(0, 10)}`;
const BUCKETS = ["gallery", "members"];

if (!url || !key) {
  console.error("Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SECRET_KEY.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

async function listAll(bucket, prefix = "") {
  const files = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
    for (const item of data) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) files.push(...(await listAll(bucket, full))); // folder
      else if (item.name !== ".emptyFolderPlaceholder") files.push({ path: full, size: item.metadata?.size ?? -1 });
    }
    if (data.length < 1000) break;
  }
  return files;
}

let downloaded = 0, skipped = 0, failed = 0;
for (const bucket of BUCKETS) {
  const files = await listAll(bucket);
  console.log(`${bucket}: ${files.length} files`);
  for (const f of files) {
    const target = path.join(outDir, bucket, ...f.path.split("/"));
    try {
      const existing = await stat(target).catch(() => null);
      if (existing && existing.size === f.size) { skipped++; continue; }
      const { data, error } = await supabase.storage.from(bucket).download(f.path);
      if (error) throw error;
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, Buffer.from(await data.arrayBuffer()));
      downloaded++;
    } catch (err) {
      failed++;
      console.error(`FAILED ${bucket}/${f.path}: ${err.message ?? err}`);
    }
  }
}
console.log(`Done → ${outDir}  (downloaded ${downloaded}, unchanged ${skipped}, failed ${failed})`);
process.exit(failed ? 1 : 0);
