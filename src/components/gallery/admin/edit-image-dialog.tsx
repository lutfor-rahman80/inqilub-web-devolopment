"use client";

import { useId, useState } from "react";
import { ExternalLink, ImageIcon, Loader2, Save, Trash2 } from "lucide-react";
import { bn, formatDateTime, toAsciiDigits } from "@/lib/format";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { deleteGalleryImages, moveGalleryImage, updateGalleryImage } from "@/app/admin/(panel)/gallery/actions";
import { heroPlacementText } from "@/lib/gallery/hero";
import { setCategoryCover } from "@/app/admin/(panel)/categories/actions";
import type { AdminImage } from "./image-manager";
import type { CategoryOption, ProgramOption } from "./upload-panel";
import { Modal } from "./modal";
import { formatBytes } from "./storage-usage";

function todayDhaka() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());
}

export function EditImageDialog({
  image,
  categories,
  programs = [],
  canDelete,
  canSetCover,
  onClose,
  onDone,
}: {
  image: AdminImage;
  categories: CategoryOption[];
  programs?: ProgramOption[];
  canDelete: boolean;
  canSetCover: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const uid = useId();
  const [caption, setCaption] = useState(image.caption);
  const [eventDate, setEventDate] = useState(image.eventDate ?? "");
  const [sortOrder, setSortOrder] = useState(bn(image.sortOrder));
  const [categoryId, setCategoryId] = useState(image.categoryId);
  const [isPublished, setIsPublished] = useState(image.isPublished);
  const [isFeatured, setIsFeatured] = useState(image.isFeatured);
  const [programId, setProgramId] = useState(image.programId ?? "");
  const [busy, setBusy] = useState<"save" | "cover" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const id = (name: string) => `${uid}-${name}`;
  const described = (name: string, hint = false) =>
    fieldErrors[name] ? `${id(name)}-error` : hint ? `${id(name)}-hint` : undefined;

  async function save() {
    setBusy("save");
    setError(null);
    setFieldErrors({});
    try {
      const patch: Parameters<typeof updateGalleryImage>[1] = {};
      if (caption !== image.caption) patch.caption = caption;
      if ((eventDate || null) !== image.eventDate) patch.eventDate = eventDate || null;
      if (Number(toAsciiDigits(sortOrder)) !== image.sortOrder || !/^-?\d+$/.test(toAsciiDigits(sortOrder).trim())) {
        patch.sortOrder = sortOrder;
      }
      if (isPublished !== image.isPublished) patch.isPublished = isPublished;
      if (isFeatured !== image.isFeatured) patch.isFeatured = isFeatured;
      // Moving to another category unlinks the program (database rule), so only send it when staying.
      if (categoryId === image.categoryId && (programId || null) !== image.programId) patch.programId = programId || null;

      let heroNote = "";
      if (Object.keys(patch).length > 0) {
        const res = await updateGalleryImage(image.id, patch);
        if (!res.ok) {
          setError(res.error);
          setFieldErrors(res.fieldErrors ?? {});
          return;
        }
        // A marked photo the homepage does not show (over the limit of six, unpublished…): say so.
        const hero = res.data.hero;
        if (hero && hero.status !== "shown" && categoryId === image.categoryId) heroNote = ` ${heroPlacementText(hero).added}`;
      }
      if (categoryId !== image.categoryId) {
        const res = await moveGalleryImage(image.id, categoryId);
        if (!res.ok) {
          setError(res.error);
          return;
        }
      }
      onDone(`পরিবর্তন সংরক্ষিত হয়েছে।${heroNote}`);
    } catch {
      setError("সার্ভারের সাথে সংযোগ করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setBusy(null);
    }
  }

  async function toggleCover() {
    setBusy("cover");
    setError(null);
    try {
      const res = await setCategoryCover(image.categoryId, image.isCover ? null : image.id);
      if (!res.ok) setError(res.error);
      else onDone(image.isCover ? "প্রচ্ছদ ছবি সরানো হয়েছে।" : `ছবিটি «${image.categoryName}»-এর প্রচ্ছদ করা হয়েছে।`);
    } catch {
      setError("সার্ভারের সাথে সংযোগ করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("delete");
    setError(null);
    try {
      const res = await deleteGalleryImages([image.id]);
      if (!res.ok) setError(res.error);
      else
        onDone(
          res.data.filesLeft > 0
            ? "ছবিটি মুছে ফেলা হয়েছে, তবে স্টোরেজের কিছু ফাইল মোছা যায়নি।"
            : "ছবিটি স্থায়ীভাবে মুছে ফেলা হয়েছে।",
        );
    } catch {
      setError("সার্ভারের সাথে সংযোগ করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setBusy(null);
    }
  }

  const moving = categoryId !== image.categoryId;
  const categoryPrograms = programs.filter((p) => p.categoryId === image.categoryId);
  // A linked program this user cannot see (e.g. an unpublished one) is still offered so it is not dropped by accident.
  const programMissing = Boolean(image.programId) && !categoryPrograms.some((p) => p.id === image.programId);

  return (
    <Modal title="ছবি সম্পাদনা" onClose={onClose} busy={busy !== null} labelledBy={`${uid}-title`}>
      <div className="grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div>
          <div className="overflow-hidden rounded-xl bg-stone-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.thumb}
              alt={image.caption || "ক্যাপশনবিহীন ছবি"}
              width={image.thumbWidth}
              height={image.thumbHeight}
              decoding="async"
              className="h-auto w-full"
            />
          </div>
          <a
            href={image.src}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex min-h-11 items-center gap-1.5 font-medium text-brand-800 underline-offset-4 hover:underline"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            পূর্ণ আকারে দেখুন
            <span className="sr-only">(নতুন ট্যাবে খুলবে)</span>
          </a>
          <dl className="mt-2 space-y-1 text-sm text-muted">
            <div>
              <dt className="inline">ফাইল: </dt>
              <dd className="inline break-all">
                <code dir="ltr" data-testid="storage-path">{image.storagePath}</code>
              </dd>
            </div>
            <div>
              <dt className="inline">মাপ: </dt>
              <dd className="inline">
                {bn(image.width)}×{bn(image.height)}px{image.sizeBytes ? ` · ${formatBytes(image.sizeBytes)}` : ""}
              </dd>
            </div>
            <div>
              <dt className="inline">যুক্ত হয়েছে: </dt>
              <dd className="inline">
                {formatDateTime(image.createdAt)} ({image.source === "sync" ? "ফোল্ডার সিঙ্ক" : "আপলোড"})
              </dd>
            </div>
          </dl>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <Field
            id={id("caption")}
            label="ক্যাপশন"
            error={fieldErrors.caption}
            hint={`ফাঁকা রাখলে দৃষ্টিপ্রতিবন্ধী পাঠকদের জন্য ছবির বিবরণ (alt) হিসেবে ক্যাটাগরির নাম ব্যবহার হবে। ${bn(caption.length)}/৩০০ অক্ষর`}
          >
            <Textarea
              id={id("caption")}
              value={caption}
              maxLength={300}
              rows={3}
              onChange={(e) => setCaption(e.target.value)}
              aria-invalid={Boolean(fieldErrors.caption) || undefined}
              aria-describedby={described("caption", true)}
            />
          </Field>
          <div className="grid gap-4 min-[480px]:grid-cols-2">
            <Field id={id("eventDate")} label="অনুষ্ঠানের তারিখ" error={fieldErrors.eventDate}>
              <Input
                id={id("eventDate")}
                type="date"
                value={eventDate}
                min="1990-01-01"
                max={todayDhaka()}
                onChange={(e) => setEventDate(e.target.value)}
                aria-invalid={Boolean(fieldErrors.eventDate) || undefined}
                aria-describedby={described("eventDate")}
              />
            </Field>
            <Field
              id={id("sortOrder")}
              label="প্রদর্শন ক্রম"
              required
              error={fieldErrors.sortOrder}
              hint="ছোট সংখ্যা আগে; সমান হলে নতুন ছবি আগে।"
            >
              <Input
                id={id("sortOrder")}
                inputMode="numeric"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                aria-invalid={Boolean(fieldErrors.sortOrder) || undefined}
                aria-describedby={described("sortOrder", true)}
              />
            </Field>
          </div>
          <Field
            id={id("category")}
            label="ক্যাটাগরি"
            required
            hint={moving ? "সংরক্ষণ করলে ছবির ফাইল নতুন ক্যাটাগরির ফোল্ডারে সরানো হবে।" : undefined}
          >
            <Select
              id={id("category")}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              aria-describedby={moving ? `${id("category")}-hint` : undefined}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.isActive ? "" : " (নিষ্ক্রিয়)"}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            id={id("program")}
            label="কর্মসূচি"
            error={fieldErrors.programId}
            hint={
              moving
                ? "ক্যাটাগরি বদলালে ছবিটি আগের কর্মসূচি থেকে সরে যাবে; সংরক্ষণের পর নতুন ক্যাটাগরির কর্মসূচি বেছে নিন।"
                : "শুধু একই ক্যাটাগরির কর্মসূচি বেছে নেওয়া যায়।"
            }
          >
            <Select
              id={id("program")}
              value={moving ? "" : programId}
              onChange={(e) => setProgramId(e.target.value)}
              disabled={moving}
              aria-invalid={Boolean(fieldErrors.programId) || undefined}
              aria-describedby={fieldErrors.programId ? `${id("program")}-error` : `${id("program")}-hint`}
            >
              <option value="">— কোনো কর্মসূচি নয় —</option>
              {programMissing && image.programId && (
                <option value={image.programId}>{image.programTitle ?? "বর্তমান কর্মসূচি"}</option>
              )}
              {categoryPrograms.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </Select>
          </Field>
          <fieldset className="space-y-1">
            <legend className="sr-only">প্রকাশ</legend>
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                className="size-5 accent-brand-700"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                aria-describedby={`${id("published")}-hint`}
              />
              ওয়েবসাইটে প্রকাশিত
            </label>
            <p id={`${id("published")}-hint`} className="text-sm text-muted">
              অপ্রকাশ করলে ছবিটি ওয়েবসাইট থেকে সরে যায়, কিন্তু আগে শেয়ার হওয়া সরাসরি লিংকে খোলা যেতে পারে। কারও গোপনীয়তার অনুরোধে
              সরাতে হলে ছবিটি {canDelete ? "মুছে ফেলুন" : "মুছে ফেলার জন্য অ্যাডমিনকে বলুন"}।
            </p>
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" className="size-5 accent-brand-700" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
              হিরো স্লাইডারে দেখান (হোমপেজের উপরে)
            </label>
          </fieldset>

          {/* Field errors are shown at their fields; the alert is for everything else. */}
          {error && Object.keys(fieldErrors).length === 0 && <Alert>{error}</Alert>}
          {Object.keys(fieldErrors).length > 0 && <Alert>ফর্মের ভুলগুলো ঠিক করুন।</Alert>}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy !== null}>
              {busy === "save" ? (
                <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <Save className="size-5" aria-hidden="true" />
              )}
              সংরক্ষণ করুন
            </Button>
            <Button variant="ghost" onClick={onClose} disabled={busy !== null}>
              বাতিল
            </Button>
          </div>
        </form>
      </div>

      {(canSetCover || canDelete) && (
        <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-4">
          {canSetCover && (
            <Button variant="outline" onClick={toggleCover} disabled={busy !== null || moving}>
              {busy === "cover" ? (
                <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <ImageIcon className="size-5" aria-hidden="true" />
              )}
              {image.isCover ? "ক্যাটাগরির প্রচ্ছদ থেকে সরান" : "ক্যাটাগরির প্রচ্ছদ করুন"}
            </Button>
          )}
          {canDelete && !confirmDelete && (
            <Button variant="danger" onClick={() => setConfirmDelete(true)} disabled={busy !== null} className="ms-auto">
              <Trash2 className="size-5" aria-hidden="true" />
              মুছে ফেলুন
            </Button>
          )}
          {canDelete && confirmDelete && (
            <div role="group" aria-label="মুছে ফেলা নিশ্চিত করুন" className="w-full rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="font-medium text-red-800">ছবিটি ডাটাবেস ও স্টোরেজ থেকে স্থায়ীভাবে মুছে যাবে। নিশ্চিত?</p>
              <p className="mt-1 text-sm text-red-800">
                মুছে ফেলার পরও আগে লোড হওয়া কপি (ব্রাউজার বা CDN-এর ক্যাশে) সর্বোচ্চ এক দিন পর্যন্ত দেখা যেতে পারে।
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button variant="danger" onClick={remove} disabled={busy !== null} autoFocus>
                  {busy === "delete" && <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                  হ্যাঁ, স্থায়ীভাবে মুছুন
                </Button>
                <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={busy !== null}>
                  না
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
