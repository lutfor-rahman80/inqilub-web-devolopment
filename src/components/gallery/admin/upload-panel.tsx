"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CheckCircle2, ImagePlus, Loader2, RotateCcw, Upload, X, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { prepareImage } from "@/lib/gallery/compress";
import { GALLERY_CACHE_CONTROL, imagePaths } from "@/lib/gallery/paths";
import { GALLERY_BUCKET, IMAGE_LIMITS } from "@/lib/storage";
import { bn } from "@/lib/format";
import { Alert, Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { discardUploads, registerGalleryImages, reserveGalleryUploads } from "@/app/admin/(panel)/gallery/actions";
import { setUploadBusy } from "./upload-activity";

export type CategoryOption = { id: string; slug: string; name: string; isActive: boolean };
/** A program (কর্মসূচি) photos can be linked to; only programs of the photo's category are offered. */
export type ProgramOption = { id: string; categoryId: string; label: string };

type Status = "ready" | "processing" | "uploading" | "uploaded" | "registering" | "done" | "error";
/** Files that reached storage but whose registration did not get an answer (retry registers them again). */
type Uploaded = { categoryId: string; fileId: string; path: string; thumbPath: string; width: number; height: number };
type Item = { key: string; file: File; preview: string; status: Status; error?: string; uploaded?: Uploaded };

const STATUS_TEXT: Record<Status, string> = {
  ready: "প্রস্তুত",
  processing: "ছোট করা হচ্ছে…",
  uploading: "আপলোড হচ্ছে…",
  uploaded: "আপলোড হয়েছে",
  registering: "যুক্ত করা হচ্ছে…",
  done: "যুক্ত হয়েছে",
  error: "ব্যর্থ",
};

const ACCEPT = IMAGE_LIMITS.acceptedTypes as readonly string[];
const MAX_FILES = IMAGE_LIMITS.maxFilesPerUpload;
const CONCURRENCY = 2;

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function mb(bytes: number) {
  return bn((bytes / (1024 * 1024)).toFixed(1));
}

function size(bytes: number) {
  return bytes < 1024 * 1024 ? `${bn(Math.max(1, Math.round(bytes / 1024)))} KB` : `${mb(bytes)} MB`;
}

function todayDhaka() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());
}

function uploadError(err: { message?: string; statusCode?: string | number } | null): string {
  const status = Number((err as { statusCode?: string | number } | null)?.statusCode ?? 0);
  if (status === 413) return "ফাইলটি অনেক বড়।";
  if (status === 401 || status === 403) return "আপলোডের অনুমতি নেই। আবার লগইন করে দেখুন।";
  return "আপলোড ব্যর্থ হয়েছে। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।";
}

async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await fn(items[next++]);
    }),
  );
}

export function UploadPanel({ categories, programs = [] }: { categories: CategoryOption[]; programs?: ProgramOption[] }) {
  const uid = useId();
  const [categoryId, setCategoryId] = useState("");
  const [programId, setProgramId] = useState("");
  const [caption, setCaption] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [publish, setPublish] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [rejections, setRejections] = useState<string[]>([]);
  const [formError, setFormError] = useState<{ field: "category" | "files" | "date"; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ done: number; failed: number; published: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const itemsRef = useRef<Item[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const categorySelect = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Revoke preview URLs when the panel unmounts.
  useEffect(() => () => itemsRef.current.forEach((i) => URL.revokeObjectURL(i.preview)), []);

  // Folder sync waits while this page uploads.
  useEffect(() => {
    setUploadBusy(busy);
    return () => setUploadBusy(false);
  }, [busy]);

  // Warn before leaving while files are being uploaded.
  useEffect(() => {
    if (!busy) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [busy]);

  const update = (key: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  function addFiles(list: FileList | File[]) {
    const errors: string[] = [];
    const accepted: Item[] = [];
    let room = MAX_FILES - itemsRef.current.filter((i) => i.status !== "done").length;
    let overflow = 0;
    for (const file of Array.from(list)) {
      if (!ACCEPT.includes(file.type)) {
        errors.push(`«${file.name}» — শুধু JPG, PNG বা WebP ছবি আপলোড করা যাবে।`);
        continue;
      }
      if (file.size > IMAGE_LIMITS.maxInputBytes) {
        errors.push(`«${file.name}» — ফাইলের আকার ${mb(file.size)} MB; সর্বোচ্চ ১০ MB হতে পারে।`);
        continue;
      }
      if (file.size === 0) {
        errors.push(`«${file.name}» — ফাইলটি খালি।`);
        continue;
      }
      if (room <= 0) {
        overflow++;
        continue;
      }
      room--;
      accepted.push({ key: newId(), file, preview: URL.createObjectURL(file), status: "ready" });
    }
    if (overflow > 0) {
      errors.push(`একবারে সর্বোচ্চ ${bn(MAX_FILES)}টি ছবি আপলোড করা যায়; ${bn(overflow)}টি ছবি বাদ দেওয়া হয়েছে।`);
    }
    setRejections(errors);
    setResult(null);
    if (accepted.length > 0) {
      setFormError(null);
      setItems((prev) => [...prev, ...accepted]);
    }
  }

  function removeItem(key: string) {
    const item = itemsRef.current.find((i) => i.key === key);
    if (!item) return;
    URL.revokeObjectURL(item.preview);
    // Uploaded but never registered: give the reserved name back and remove the files.
    if (item.uploaded) void discardUploads([item.uploaded.fileId]).catch(() => undefined);
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function clearDone() {
    setItems((prev) => {
      prev.filter((i) => i.status === "done").forEach((i) => URL.revokeObjectURL(i.preview));
      return prev.filter((i) => i.status !== "done");
    });
    setResult(null);
  }

  async function start() {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) {
      setFormError({ field: "category", message: "ক্যাটাগরি (ফোল্ডার) নির্বাচন করুন।" });
      categorySelect.current?.focus();
      return;
    }
    if (eventDate && eventDate > todayDhaka()) {
      setFormError({ field: "date", message: "ভবিষ্যতের তারিখ দেওয়া যাবে না।" });
      return;
    }
    const all = itemsRef.current;
    const targets = all.filter((i) => i.status === "ready" || i.status === "error");
    if (targets.length === 0) {
      setFormError({ field: "files", message: "আপলোডের জন্য অন্তত একটি ছবি নির্বাচন করুন।" });
      return;
    }
    setFormError(null);
    setResult(null);
    setBusy(true);
    const order = new Map(all.map((i, n) => [i.key, n]));
    const release: string[] = [];

    // Files uploaded earlier whose registration got no answer: register them
    // again (idempotent) — unless the category was changed meanwhile.
    const uploaded: (Uploaded & { key: string })[] = [];
    const toUpload: Item[] = [];
    for (const item of targets) {
      if (item.uploaded && item.uploaded.categoryId === category.id) uploaded.push({ ...item.uploaded, key: item.key });
      else {
        if (item.uploaded) release.push(item.uploaded.fileId);
        toUpload.push(item);
      }
    }

    // The server hands out the file names (storage only accepts reserved names).
    let fileIds: string[] = [];
    if (toUpload.length > 0) {
      try {
        const res = await reserveGalleryUploads(category.id, toUpload.length);
        if (res.ok) fileIds = res.data.fileIds;
        else toUpload.forEach((i) => update(i.key, { status: "error", error: res.error, uploaded: undefined }));
      } catch {
        toUpload.forEach((i) =>
          update(i.key, { status: "error", error: "সার্ভারের সাথে সংযোগ করা যায়নি। আবার চেষ্টা করুন।", uploaded: undefined }),
        );
      }
    }

    const bucket = createClient().storage.from(GALLERY_BUCKET);
    const jobs = fileIds.length === toUpload.length ? toUpload.map((item, n) => ({ item, fileId: fileIds[n] })) : [];

    await pool(jobs, CONCURRENCY, async ({ item, fileId }) => {
      update(item.key, { status: "processing", error: undefined, uploaded: undefined });
      let prepared;
      try {
        prepared = await prepareImage(item.file);
      } catch {
        release.push(fileId);
        update(item.key, { status: "error", error: "ছবিটি প্রক্রিয়া করা যায়নি (ফাইলটি নষ্ট বা অসমর্থিত হতে পারে)।" });
        return;
      }
      update(item.key, { status: "uploading" });
      const paths = imagePaths(category.slug, fileId, prepared.ext);
      const options = { contentType: prepared.contentType, cacheControl: GALLERY_CACHE_CONTROL, upsert: false };
      try {
        const full = await bucket.upload(paths.full, prepared.full, options);
        if (full.error) {
          release.push(fileId);
          update(item.key, { status: "error", error: uploadError(full.error) });
          return;
        }
        const thumb = await bucket.upload(paths.thumb, prepared.thumb, options);
        if (thumb.error) {
          release.push(fileId);
          update(item.key, { status: "error", error: uploadError(thumb.error) });
          return;
        }
      } catch {
        release.push(fileId);
        update(item.key, { status: "error", error: uploadError(null) });
        return;
      }
      const info = { categoryId: category.id, fileId, path: paths.full, thumbPath: paths.thumb, width: prepared.width, height: prepared.height };
      uploaded.push({ ...info, key: item.key });
      update(item.key, { status: "uploaded", uploaded: info });
    });

    // Failed uploads: give back their reserved names and remove partial files.
    if (release.length > 0) await discardUploads(release).catch(() => undefined);

    let done = 0;
    if (uploaded.length > 0) {
      // Keep the order in which the files were selected (uploads finish in any order).
      uploaded.sort((a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0));
      uploaded.forEach((u) => update(u.key, { status: "registering" }));
      try {
        const res = await registerGalleryImages({
          categoryId: category.id,
          caption,
          eventDate: eventDate || null,
          publish,
          programId: programs.some((p) => p.id === programId && p.categoryId === category.id) ? programId : null,
          items: uploaded.map(({ path, thumbPath, width, height }) => ({ path, thumbPath, width, height })),
        });
        if (!res.ok) {
          await discardUploads(uploaded.map((u) => u.fileId)).catch(() => undefined);
          uploaded.forEach((u) => update(u.key, { status: "error", error: res.error, uploaded: undefined }));
        } else {
          const failed = new Map(res.data.failed.map((f) => [f.path, f.error]));
          for (const u of uploaded) {
            const error = failed.get(u.path);
            if (error) update(u.key, { status: "error", error, uploaded: undefined });
            else {
              done++;
              update(u.key, { status: "done", uploaded: undefined });
            }
          }
        }
      } catch {
        // The answer was lost: keep the files so "retry" registers them again.
        uploaded.forEach((u) =>
          update(u.key, { status: "error", error: "সার্ভারের সাথে সংযোগ করা যায়নি। আবার চেষ্টা করুন।" }),
        );
      }
    }
    setResult({ done, failed: targets.length - done, published: publish });
    setBusy(false);
  }

  const categoryPrograms = programs.filter((p) => p.categoryId === categoryId);
  const pending = items.filter((i) => i.status === "ready" || i.status === "error").length;
  const failedCount = items.filter((i) => i.status === "error").length;
  const doneCount = items.filter((i) => i.status === "done").length;
  const working = items.filter((i) => ["processing", "uploading", "uploaded", "registering"].includes(i.status)).length;
  const inputId = `${uid}-files`;

  return (
    <Card className="p-4 sm:p-6">
      <section aria-labelledby={`${uid}-title`}>
        <h2 id={`${uid}-title`} className="flex items-center gap-2 text-xl font-bold">
          <ImagePlus className="size-6 text-brand-700" aria-hidden="true" />
          ছবি আপলোড
        </h2>
        <p className="mt-1 text-muted">
          ছবিগুলো আপনার ব্রাউজারেই ছোট করে (WebP, সর্বোচ্চ ১৬০০px, সাধারণত ২০০ KB-এর মধ্যে, সাথে ৪৮০px থাম্বনেইল) নির্বাচিত ক্যাটাগরির ফোল্ডারে রাখা হবে।
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field id={`${uid}-category`} label="ক্যাটাগরি (ফোল্ডার)" required error={formError?.field === "category" ? formError.message : undefined}>
            <Select
              ref={categorySelect}
              id={`${uid}-category`}
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                // A program belongs to one category.
                setProgramId("");
              }}
              disabled={busy}
              required
              aria-invalid={formError?.field === "category" || undefined}
              aria-describedby={formError?.field === "category" ? `${uid}-category-error` : undefined}
            >
              <option value="">— ক্যাটাগরি নির্বাচন করুন —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.isActive ? "" : " (নিষ্ক্রিয়)"}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            id={`${uid}-date`}
            label="অনুষ্ঠানের তারিখ"
            hint="সব ছবিতে একই তারিখ বসবে।"
            error={formError?.field === "date" ? formError.message : undefined}
          >
            <Input
              id={`${uid}-date`}
              type="date"
              value={eventDate}
              max={todayDhaka()}
              min="1990-01-01"
              onChange={(e) => setEventDate(e.target.value)}
              disabled={busy}
              aria-invalid={formError?.field === "date" || undefined}
              aria-describedby={formError?.field === "date" ? `${uid}-date-error` : `${uid}-date-hint`}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field
              id={`${uid}-program`}
              label="কর্মসূচি"
              hint={
                !categoryId
                  ? "প্রথমে ক্যাটাগরি নির্বাচন করুন; তারপর সেই ক্যাটাগরির কর্মসূচি দেখা যাবে।"
                  : categoryPrograms.length === 0
                    ? "এই ক্যাটাগরিতে কোনো কর্মসূচি নেই। কর্মসূচি পাতা থেকে নতুন কর্মসূচি যুক্ত করা যায়।"
                    : "বেছে নিলে সব ছবি এই কর্মসূচির পাতায়ও দেখাবে।"
              }
            >
              <Select
                id={`${uid}-program`}
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
                disabled={busy || !categoryId || categoryPrograms.length === 0}
                aria-describedby={`${uid}-program-hint`}
              >
                <option value="">— কোনো কর্মসূচি নয় —</option>
                {categoryPrograms.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field
              id={`${uid}-caption`}
              label="ক্যাপশন"
              hint={`সব ছবিতে একই ক্যাপশন বসবে; পরে আলাদাভাবে বদলানো যাবে। ক্যাপশন না দিলে দৃষ্টিপ্রতিবন্ধী পাঠকদের জন্য ছবির বিবরণ (alt) হিসেবে ক্যাটাগরির নাম ব্যবহার হবে, তাই সংক্ষেপে ছবিতে কী আছে লিখে দেওয়া ভালো। (${bn(caption.length)}/৩০০)`}
            >
              <Input
                id={`${uid}-caption`}
                value={caption}
                maxLength={300}
                onChange={(e) => setCaption(e.target.value)}
                disabled={busy}
                aria-describedby={`${uid}-caption-hint`}
                placeholder="যেমন: শীতবস্ত্র বিতরণ কর্মসূচি"
              />
            </Field>
          </div>
        </div>

        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!busy && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
          }}
          className={`mt-5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors has-[input:focus-visible]:outline-3 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-gold-500 ${
            dragging ? "border-brand-600 bg-brand-50" : "border-line bg-cream hover:border-brand-200 hover:bg-brand-50/60"
          } ${busy ? "pointer-events-none opacity-60" : ""}`}
        >
          <Upload className="size-8 text-brand-700" aria-hidden="true" />
          <span className="font-semibold text-brand-900">ছবি নির্বাচন করুন অথবা এখানে টেনে আনুন</span>
          <span className="text-sm text-muted">JPG, PNG বা WebP · প্রতিটি সর্বোচ্চ ১০ MB · একবারে সর্বোচ্চ ৩০টি</span>
          <input
            ref={fileInput}
            id={inputId}
            type="file"
            multiple
            accept={ACCEPT.join(",")}
            className="sr-only"
            disabled={busy}
            aria-describedby={formError?.field === "files" ? `${uid}-files-error` : undefined}
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        {formError?.field === "files" && (
          <p id={`${uid}-files-error`} role="alert" className="mt-2 text-sm font-medium text-red-700">{formError.message}</p>
        )}

        {rejections.length > 0 && (
          <div className="mt-4">
            <Alert>
              <p className="font-semibold">কিছু ফাইল যুক্ত করা যায়নি:</p>
              <ul className="mt-1 list-disc space-y-0.5 ps-5 text-sm">
                {rejections.map((r, i) => (
                  <li key={i} className="break-words">{r}</li>
                ))}
              </ul>
            </Alert>
          </div>
        )}

        {items.length > 0 && (
          <ul className="mt-5 grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 md:grid-cols-4" aria-label="নির্বাচিত ছবি">
            {items.map((item) => (
              <li key={item.key} className="overflow-hidden rounded-xl border border-line bg-white" data-status={item.status}>
                <div className="relative aspect-[4/3] bg-stone-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.preview} alt="" width={240} height={180} decoding="async" className="size-full object-cover" />
                  {(item.status === "ready" || item.status === "error") && !busy && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.key)}
                      className="absolute end-1 top-1 inline-flex size-11 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                      aria-label={`«${item.file.name}» তালিকা থেকে বাদ দিন`}
                    >
                      <X className="size-5" aria-hidden="true" />
                    </button>
                  )}
                </div>
                <div className="space-y-0.5 p-2 text-sm">
                  <p className="truncate font-medium" title={item.file.name}>{item.file.name}</p>
                  <p
                    className={`flex items-center gap-1 ${
                      item.status === "error" ? "text-red-700" : item.status === "done" ? "text-brand-700" : "text-muted"
                    }`}
                  >
                    {item.status === "done" && <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />}
                    {item.status === "error" && <XCircle className="size-4 shrink-0" aria-hidden="true" />}
                    {["processing", "uploading", "uploaded", "registering"].includes(item.status) && (
                      <Loader2 className="size-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    )}
                    {STATUS_TEXT[item.status]} · {size(item.file.size)}
                  </p>
                  {item.error && <p className="text-red-700">{item.error}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5">
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              checked={publish}
              onChange={(e) => setPublish(e.target.checked)}
              disabled={busy}
              className="size-5 accent-brand-700"
              aria-describedby={`${uid}-publish-hint`}
            />
            আপলোডের পরপরই ওয়েবসাইটে প্রকাশ করুন
          </label>
          <p id={`${uid}-publish-hint`} className="text-sm text-muted">
            অপ্রকাশিত ছবি ওয়েবসাইটে দেখায় না, তবে ছবির সরাসরি লিংক জানা থাকলে সেটি খোলা যায়।
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={start} disabled={busy || pending === 0}>
            {busy ? <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Upload className="size-5" aria-hidden="true" />}
            {busy ? "আপলোড চলছে…" : failedCount > 0 && failedCount === pending ? "ব্যর্থগুলো আবার চেষ্টা করুন" : `আপলোড করুন${pending ? ` (${bn(pending)})` : ""}`}
          </Button>
          {doneCount > 0 && !busy && (
            <Button variant="ghost" onClick={clearDone}>
              <RotateCcw className="size-5" aria-hidden="true" />
              সম্পন্নগুলো তালিকা থেকে সরান
            </Button>
          )}
        </div>

        <div aria-live="polite" className="mt-3">
          {busy && (
            <p className="text-muted">
              {bn(items.filter((i) => i.status === "done").length)}টি সম্পন্ন · {bn(working)}টি চলমান — অনুগ্রহ করে পৃষ্ঠাটি বন্ধ করবেন না।
            </p>
          )}
          {result && !busy && (
            <Alert tone={result.failed > 0 ? "error" : "success"}>
              {result.done > 0 && <span>{bn(result.done)}টি ছবি সফলভাবে যুক্ত হয়েছে{result.published ? " ও প্রকাশিত হয়েছে" : " (অপ্রকাশিত)"}। </span>}
              {result.failed > 0 && <span>{bn(result.failed)}টি ছবি যুক্ত করা যায়নি — কারণ দেখে আবার চেষ্টা করুন।</span>}
            </Alert>
          )}
        </div>
      </section>
    </Card>
  );
}
