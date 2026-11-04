"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, LoaderCircle, Trash2, Upload, X } from "lucide-react";
import { Alert } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { MEMBERS_BUCKET } from "@/lib/storage";
import { bn } from "@/lib/format";
import { uuidV4 } from "@/lib/membership/uuid";
import { prepareMemberPhoto, validatePhotoFile, type PreparedPhoto } from "@/lib/membership/photo";
import { removeMemberPhoto, setMemberPhoto } from "@/app/admin/(panel)/members/actions";
import { MemberAvatar } from "@/components/membership/member-avatar";
import { Modal } from "./modal";
import { useMemberVersion } from "./member-version";

/**
 * Member photo: choose → preview (square crop, ≤600px WebP) → upload straight
 * to the "members" bucket (storage RLS requires members.manage) → the server
 * action links it to the member and removes the previous file.
 */
export function PhotoManager({ memberId, name, photoPath }: { memberId: string; name: string; photoPath: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ photo: PreparedPhoto; url: string } | null>(null);
  const [busy, setBusy] = useState<null | "prepare" | "upload" | "remove">(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [, startTransition] = useTransition();
  const version = useMemberVersion();
  const setPhotoBusy = version?.setPhotoBusy;

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview.url);
  }, [preview]);

  // The edit form waits while the record's photo (and so its version) is changing.
  useEffect(() => {
    setPhotoBusy?.(busy === "upload" || busy === "remove");
    return () => setPhotoBusy?.(false);
  }, [busy, setPhotoBusy]);

  async function onPick(file: File | undefined) {
    setError(null);
    setMessage(null);
    if (!file) return;
    const invalid = validatePhotoFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy("prepare");
    try {
      const photo = await prepareMemberPhoto(file);
      setPreview({ photo, url: URL.createObjectURL(photo.blob) });
    } catch {
      setError("ছবিটি পড়া যায়নি। অন্য একটি ছবি বেছে নিন।");
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function upload() {
    if (!preview) return;
    setBusy("upload");
    setError(null);
    const path = `photos/${uuidV4()}.${preview.photo.ext}`;
    const storage = createClient().storage.from(MEMBERS_BUCKET);
    try {
      const { error: upError } = await storage.upload(path, preview.photo.blob, {
        contentType: preview.photo.contentType,
        // Short browser/CDN cache: when a member is hidden from the directory
        // the photo is moved to a new name and the old public URL must die soon.
        cacheControl: "3600",
        upsert: false,
      });
      if (upError) {
        setError("ছবি আপলোড করা যায়নি। ইন্টারনেট সংযোগ ও অনুমতি দেখে আবার চেষ্টা করুন।");
        return;
      }
      const res = await setMemberPhoto(memberId, path);
      if (!res.ok) {
        await storage.remove([path]).catch(() => undefined);
        setError(res.error);
        return;
      }
      version?.set(res.data.updatedAt);
      setPreview(null);
      setMessage("ছবি সংরক্ষণ করা হয়েছে।");
      startTransition(() => router.refresh());
    } catch {
      await storage.remove([path]).catch(() => undefined);
      setError("ছবি আপলোড করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("remove");
    setError(null);
    try {
      const res = await removeMemberPhoto(memberId);
      if (!res.ok) setError(res.error);
      else {
        if (res.data.updatedAt) version?.set(res.data.updatedAt);
        setConfirmRemove(false);
        setMessage("ছবি সরিয়ে ফেলা হয়েছে।");
        startTransition(() => router.refresh());
      }
    } catch {
      setError("ছবি সরানো যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4" data-testid="photo-manager">
      <div className="flex items-center gap-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.url} alt="নতুন ছবির প্রিভিউ" width={112} height={112} className="size-28 rounded-full object-cover ring-4 ring-gold-400" />
        ) : (
          <MemberAvatar name={name} photoPath={photoPath} size={112} eager />
        )}
        <div className="min-w-0 text-sm text-muted">
          {preview ? (
            <p>
              প্রিভিউ: বর্গাকার, সর্বোচ্চ ৬০০ পিক্সেল ({bn(Math.max(1, Math.round(preview.photo.size / 1024)))} KB)। ঠিক থাকলে
              সংরক্ষণ করুন।
            </p>
          ) : photoPath ? (
            <p>বর্তমান ছবি। নতুন ছবি দিলে আগেরটি মুছে যাবে।</p>
          ) : (
            <p>এখনো ছবি যুক্ত করা হয়নি। সদস্য তালিকায় নামের আদ্যক্ষর দেখানো হয়।</p>
          )}
        </div>
      </div>

      {error && <Alert>{error}</Alert>}
      {message && !error && <Alert tone="success">{message}</Alert>}

      <input
        ref={inputRef}
        id={`photo-input-${memberId}`}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => onPick(e.target.files?.[0])}
        disabled={busy !== null}
        data-testid="photo-input"
      />

      <div className="flex flex-wrap gap-2">
        {preview ? (
          <>
            <Button onClick={upload} disabled={busy !== null} data-testid="photo-save">
              {busy === "upload" ? <LoaderCircle className="size-5 motion-safe:animate-spin" aria-hidden="true" /> : <Upload className="size-5" aria-hidden="true" />}
              {busy === "upload" ? "আপলোড হচ্ছে…" : "ছবি সংরক্ষণ করুন"}
            </Button>
            <Button variant="ghost" onClick={() => setPreview(null)} disabled={busy !== null}>
              <X className="size-5" aria-hidden="true" />
              বাতিল
            </Button>
          </>
        ) : (
          <>
            <label
              htmlFor={`photo-input-${memberId}`}
              className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-brand-700 bg-white px-5 font-semibold text-brand-800 hover:bg-brand-50 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-gold-500 ${
                busy ? "pointer-events-none opacity-60" : ""
              }`}
            >
              {busy === "prepare" ? <LoaderCircle className="size-5 motion-safe:animate-spin" aria-hidden="true" /> : <ImagePlus className="size-5" aria-hidden="true" />}
              {photoPath ? "ছবি পরিবর্তন করুন" : "ছবি যুক্ত করুন"}
            </label>
            {photoPath && (
              <Button variant="ghost" className="text-red-700 hover:bg-red-50" onClick={() => setConfirmRemove(true)} disabled={busy !== null}>
                <Trash2 className="size-5" aria-hidden="true" />
                ছবি সরান
              </Button>
            )}
          </>
        )}
      </div>
      <p className="text-sm text-muted">JPG, PNG বা WebP (সর্বোচ্চ ১০ MB)। ছবিটি স্বয়ংক্রিয়ভাবে বর্গাকারে কেটে ছোট করা হবে।</p>

      {confirmRemove && (
        <Modal title="ছবি সরাবেন?" onClose={() => setConfirmRemove(false)} busy={busy === "remove"} size="sm">
          <p>{name}-এর ছবি স্থায়ীভাবে মুছে যাবে। সদস্য তালিকায় তখন নামের আদ্যক্ষর দেখানো হবে।</p>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmRemove(false)} disabled={busy === "remove"} data-autofocus>বাতিল</Button>
            <Button variant="danger" onClick={remove} disabled={busy === "remove"}>
              {busy === "remove" && <LoaderCircle className="size-5 motion-safe:animate-spin" aria-hidden="true" />}
              ছবি সরান
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
