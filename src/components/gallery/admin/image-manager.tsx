"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Pencil, Star, Trash2 } from "lucide-react";
import { bn, formatDate } from "@/lib/format";
import { adminPhotoLabel } from "@/lib/gallery/labels";
import { heroPlacementText, type HeroPlacement } from "@/lib/gallery/hero";
import { Alert } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import {
  deleteGalleryImages,
  reorderGalleryImage,
  setImagesPublished,
  updateGalleryImage,
} from "@/app/admin/(panel)/gallery/actions";
import type { CategoryOption, ProgramOption } from "./upload-panel";
import { EditImageDialog } from "./edit-image-dialog";
import { ConfirmDialog } from "./confirm-dialog";

export type AdminImage = {
  id: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  isCover: boolean;
  storagePath: string;
  src: string;
  thumb: string;
  width: number;
  height: number;
  thumbWidth: number;
  thumbHeight: number;
  sizeBytes: number | null;
  caption: string;
  eventDate: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  /** Marked photos: shown on the homepage (as number n) or why not; null when not marked. */
  hero: HeroPlacement | null;
  programId: string | null;
  /** Title of the linked program (null when none, or not visible to this user). */
  programTitle: string | null;
  sortOrder: number;
  source: "upload" | "sync";
  createdAt: string;
};

type Message = { tone: "success" | "error"; text: string } | null;

const iconBtn =
  "inline-flex size-11 items-center justify-center rounded-xl border border-line bg-white text-brand-900 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50";

export function ImageManager({
  images,
  categories,
  programs = [],
  canDelete,
  canSetCover,
  reorderEnabled,
  filtered,
  offset = 0,
}: {
  images: AdminImage[];
  categories: CategoryOption[];
  programs?: ProgramOption[];
  canDelete: boolean;
  canSetCover: boolean;
  reorderEnabled: boolean;
  filtered: boolean;
  /** Number of images on earlier pages (labels show the overall position). */
  offset?: number;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);


  const editing = editingId ? images.find((i) => i.id === editingId) ?? null : null;

  async function act<R extends { ok: boolean; error?: string }>(key: string, fn: () => Promise<R>, success: string | ((res: R) => string)) {
    setBusy(key);
    setMessage(null);
    try {
      const res = await fn();
      setMessage(
        res.ok
          ? { tone: "success", text: typeof success === "string" ? success : success(res) }
          : { tone: "error", text: res.error ?? "সমস্যা হয়েছে।" },
      );
      return res.ok;
    } catch {
      setMessage({ tone: "error", text: "সার্ভারের সাথে সংযোগ করা যায়নি। আবার চেষ্টা করুন।" });
      return false;
    } finally {
      setBusy(null);
    }
  }

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  // Only images still on this page count (rows can disappear after a refresh).
  const selectedIds = images.filter((i) => selected.has(i.id)).map((i) => i.id);
  const selectedCount = selectedIds.length;
  const allSelected = images.length > 0 && selectedCount === images.length;

  const status = (
    <div aria-live="polite" className="mb-3 empty:hidden">
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
    </div>
  );

  if (images.length === 0) {
    return (
      <div>
        {status}
        <EmptyState title="কোনো ছবি পাওয়া যায়নি">
          {filtered ? "এই ফিল্টারে কোনো ছবি নেই। অন্য ক্যাটাগরি বা অবস্থা বেছে দেখুন।" : "উপরের ফর্ম থেকে প্রথম ছবিগুলো আপলোড করুন।"}
        </EmptyState>
      </div>
    );
  }

  return (
    <div>
      {status}

      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white px-3 py-2">
        <label className="flex min-h-11 items-center gap-2 pe-2 font-medium">
          <input
            type="checkbox"
            className="size-5 accent-brand-700"
            checked={allSelected}
            onChange={() => setSelected(allSelected ? new Set() : new Set(images.map((i) => i.id)))}
          />
          এই পৃষ্ঠার সব নির্বাচন
        </label>
        {selectedCount > 0 && (
          <>
            <span className="text-muted">{bn(selectedCount)}টি নির্বাচিত</span>
            <Button
              size="sm"
              variant="outline"
              className="min-h-11"
              disabled={busy !== null}
              onClick={() =>
                act("bulk", () => setImagesPublished(selectedIds, true), `${bn(selectedCount)}টি ছবি প্রকাশিত হয়েছে।`)
              }
            >
              <Eye className="size-4" aria-hidden="true" /> প্রকাশ করুন
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="min-h-11"
              disabled={busy !== null}
              onClick={() =>
                act("bulk", () => setImagesPublished(selectedIds, false), `${bn(selectedCount)}টি ছবি অপ্রকাশিত করা হয়েছে।`)
              }
            >
              <EyeOff className="size-4" aria-hidden="true" /> অপ্রকাশ করুন
            </Button>
            {canDelete && (
              <Button size="sm" variant="danger" className="min-h-11" disabled={busy !== null} onClick={() => setConfirmBulkDelete(true)}>
                <Trash2 className="size-4" aria-hidden="true" /> মুছে ফেলুন
              </Button>
            )}
            <Button size="sm" variant="ghost" className="min-h-11" onClick={() => setSelected(new Set())}>
              নির্বাচন বাতিল
            </Button>
            {busy === "bulk" && <Loader2 className="size-5 animate-spin text-brand-700 motion-reduce:animate-none" aria-label="চলছে" />}
          </>
        )}
      </div>

      <ul className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4" aria-label="গ্যালারির ছবি">
        {images.map((img, index) => {
          const label = adminPhotoLabel(offset + index + 1, img.caption);
          const pending = busy === img.id;
          return (
            <li
              key={img.id}
              data-image-id={img.id}
              className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
                selected.has(img.id) ? "border-brand-600 ring-2 ring-brand-600/30" : "border-line"
              }`}
            >
              <div className="relative aspect-[4/3] bg-stone-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.thumb}
                  alt={label}
                  width={img.thumbWidth}
                  height={img.thumbHeight}
                  loading="lazy"
                  decoding="async"
                  className={`size-full object-cover ${img.isPublished ? "" : "opacity-70 grayscale-[40%]"}`}
                />
                <label className="absolute start-1 top-1 inline-flex size-11 cursor-pointer items-center justify-center rounded-xl bg-white/90 shadow">
                  <input
                    type="checkbox"
                    className="size-5 accent-brand-700"
                    checked={selected.has(img.id)}
                    onChange={() => toggle(img.id)}
                  />
                  <span className="sr-only">নির্বাচন করুন: {label}</span>
                </label>
                <div className="absolute end-2 top-2 flex flex-wrap justify-end gap-1">
                  {img.isFeatured && <Badge tone="gold">হিরো স্লাইডার</Badge>}
                  {img.isCover && <Badge tone="blue">প্রচ্ছদ</Badge>}
                </div>
              </div>
              <div className="space-y-2 p-3">
                <div className="flex flex-wrap gap-1">
                  {img.isPublished ? <Badge tone="green">প্রকাশিত</Badge> : <Badge tone="amber">অপ্রকাশিত</Badge>}
                  {img.source === "sync" && <Badge tone="gray">সিঙ্ক থেকে</Badge>}
                </div>
                <p className={`line-clamp-2 min-h-[3.5rem] ${img.caption ? "" : "italic text-muted"}`}>
                  {img.caption || "ক্যাপশন নেই"}
                </p>
                <p className="text-sm text-muted">
                  {img.categoryName}
                  {img.eventDate ? ` · ${formatDate(img.eventDate)}` : ""}
                </p>
                {img.hero && (
                  <p
                    className={`text-sm font-medium ${img.hero.status === "shown" ? "text-brand-800" : "text-amber-800"}`}
                    data-testid="hero-placement"
                    data-status={img.hero.status}
                  >
                    {heroPlacementText(img.hero).badge}
                  </p>
                )}
                {img.programId && (
                  <p className="line-clamp-1 text-sm text-brand-800" title={img.programTitle ?? undefined}>
                    কর্মসূচি: {img.programTitle ?? "যুক্ত আছে"}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    className={iconBtn}
                    aria-pressed={img.isPublished}
                    disabled={busy !== null}
                    title={img.isPublished ? "প্রকাশিত — অপ্রকাশ করতে চাপুন" : "অপ্রকাশিত — প্রকাশ করতে চাপুন"}
                    aria-label={`প্রকাশিত: ${label}`}
                    onClick={() =>
                      act(
                        img.id,
                        () => updateGalleryImage(img.id, { isPublished: !img.isPublished }),
                        img.isPublished ? "ছবিটি অপ্রকাশিত করা হয়েছে।" : "ছবিটি প্রকাশিত হয়েছে।",
                      )
                    }
                  >
                    {img.isPublished ? <Eye className="size-5" aria-hidden="true" /> : <EyeOff className="size-5" aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    className={`${iconBtn} ${img.isFeatured ? "border-gold-500 bg-gold-50" : ""}`}
                    aria-pressed={img.isFeatured}
                    disabled={busy !== null}
                    title={img.isFeatured ? "হিরো স্লাইডারে (হোমপেজের উপরে) আছে — সরাতে চাপুন" : "হিরো স্লাইডারে (হোমপেজের উপরে) দেখাতে চাপুন"}
                    aria-label={`হিরো স্লাইডারে: ${label}`}
                    onClick={() =>
                      act(
                        img.id,
                        () => updateGalleryImage(img.id, { isFeatured: !img.isFeatured }),
                        // Marking: say whether the homepage actually shows it (at most six, in display order).
                        (res) =>
                          img.isFeatured
                            ? "হিরো স্লাইডার থেকে সরানো হয়েছে।"
                            : res.ok && res.data.hero
                              ? heroPlacementText(res.data.hero).added
                              : "হিরো স্লাইডারে (হোমপেজের উপরে) যুক্ত হয়েছে।",
                      )
                    }
                  >
                    <Star className={`size-5 ${img.isFeatured ? "fill-gold-500 text-gold-600" : ""}`} aria-hidden="true" />
                  </button>
                  {reorderEnabled && (
                    <>
                      <button
                        type="button"
                        className={iconBtn}
                        disabled={busy !== null || index === 0}
                        aria-label={`আগে আনুন: ${label}`}
                        title="ক্রমে এক ধাপ আগে"
                        onClick={() => act(img.id, () => reorderGalleryImage(img.id, true), "ক্রম পরিবর্তন হয়েছে।")}
                      >
                        <ArrowUp className="size-5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={iconBtn}
                        disabled={busy !== null || index === images.length - 1}
                        aria-label={`পরে পাঠান: ${label}`}
                        title="ক্রমে এক ধাপ পরে"
                        onClick={() => act(img.id, () => reorderGalleryImage(img.id, false), "ক্রম পরিবর্তন হয়েছে।")}
                      >
                        <ArrowDown className="size-5" aria-hidden="true" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className={`${iconBtn} ms-auto w-auto gap-1.5 px-3 font-semibold`}
                    disabled={busy !== null}
                    onClick={() => setEditingId(img.id)}
                    aria-label={`সম্পাদনা: ${label}`}
                  >
                    {pending ? (
                      <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    ) : (
                      <Pencil className="size-5" aria-hidden="true" />
                    )}
                    সম্পাদনা
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {editing && (
        <EditImageDialog
          key={editing.id}
          image={editing}
          categories={categories}
          programs={programs}
          canDelete={canDelete}
          canSetCover={canSetCover}
          onClose={() => setEditingId(null)}
          onDone={(text) => {
            setEditingId(null);
            setMessage({ tone: "success", text });
          }}
        />
      )}

      {confirmBulkDelete && (
        <ConfirmDialog
          title="নির্বাচিত ছবি মুছে ফেলবেন?"
          confirmLabel={`হ্যাঁ, ${bn(selectedCount)}টি ছবি মুছে ফেলুন`}
          onCancel={() => setConfirmBulkDelete(false)}
          onConfirm={async () => {
            const ok = await act(
              "bulk",
              () => deleteGalleryImages(selectedIds),
              `${bn(selectedCount)}টি ছবি স্থায়ীভাবে মুছে ফেলা হয়েছে।`,
            );
            setConfirmBulkDelete(false);
            if (ok) setSelected(new Set());
          }}
        >
          {bn(selectedCount)}টি ছবি ডাটাবেস ও স্টোরেজ থেকে স্থায়ীভাবে মুছে যাবে। এটি আর ফিরিয়ে আনা যাবে না। আগে লোড হওয়া কপি
          (ব্রাউজার বা CDN-এর ক্যাশে) সর্বোচ্চ এক দিন পর্যন্ত দেখা যেতে পারে।
        </ConfirmDialog>
      )}
    </div>
  );
}
