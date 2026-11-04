"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImagePlus, Link2Off, Loader2, X } from "lucide-react";
import {
  linkProgramPhotos,
  listCategoryImages,
  unlinkProgramPhotos,
  type CategoryImage,
} from "@/app/admin/(panel)/programs/actions";
import { Alert } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { bn } from "@/lib/format";
import { adminPhotoLabel } from "@/lib/gallery/labels";

/**
 * Photos of one program: the linked photos (each can be removed) and a
 * chooser with the program category's other photos. Only photos of the same
 * category can be linked (the database enforces it too).
 */
export function PhotoLinker({
  programId,
  categoryId,
  categoryName,
  linked,
  canManage,
}: {
  programId: string;
  categoryId: string;
  categoryName: string;
  linked: CategoryImage[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [chooser, setChooser] = useState<{ list: CategoryImage[]; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function load(append: boolean) {
    setLoading(true);
    try {
      const r = await listCategoryImages(categoryId, append && chooser ? chooser.list.length : 0);
      if (!r.ok) setMessage({ ok: false, text: r.error });
      else setChooser((prev) => ({ list: append && prev ? [...prev.list, ...r.images] : r.images, total: r.total }));
    } catch {
      setMessage({ ok: false, text: "ছবির তালিকা লোড করা যায়নি। আবার চেষ্টা করুন।" });
    } finally {
      setLoading(false);
    }
  }

  function run(fn: () => Promise<{ ok: true; count: number } | { ok: false; error: string }>, success: (n: number) => string, after?: () => void) {
    setMessage(null);
    startTransition(async () => {
      try {
        const r = await fn();
        if (!r.ok) {
          setMessage({ ok: false, text: r.error });
          return;
        }
        setMessage({ ok: true, text: success(r.count) });
        after?.();
        router.refresh();
      } catch {
        setMessage({ ok: false, text: "সার্ভারের সাথে সংযোগ করা যায়নি। আবার চেষ্টা করুন।" });
      }
    });
  }

  const linkedIds = new Set(linked.map((l) => l.id));
  const candidates = (chooser?.list ?? []).filter((img) => !linkedIds.has(img.id));
  const selectedIds = candidates.filter((c) => selected.has(c.id)).map((c) => c.id);

  return (
    <Card className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="program-photos-heading" className="text-xl font-bold">কর্মসূচির ছবি ({bn(linked.length)}টি)</h2>
          <p className="mt-1 text-muted">
            এখানে যুক্ত ছবিগুলো কর্মসূচির পাতায় দেখাবে (শুধু প্রকাশিত ছবি)। শুধু «{categoryName}» ক্যাটাগরির ছবি যুক্ত করা যায়।
          </p>
        </div>
        {canManage && !chooser && (
          <Button variant="outline" onClick={() => void load(false)} disabled={loading}>
            {loading ? <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ImagePlus className="size-5" aria-hidden="true" />}
            ছবি যুক্ত করুন
          </Button>
        )}
      </div>

      <div aria-live="polite" className="empty:hidden">
        {message && !pending && <Alert tone={message.ok ? "success" : "error"}>{message.text}</Alert>}
      </div>

      {!canManage && (
        <p className="text-sm text-muted">ছবি যুক্ত করতে বা সরাতে “গ্যালারি ব্যবস্থাপনা” অনুমতি প্রয়োজন।</p>
      )}

      {linked.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-cream px-4 py-6 text-center text-muted">
          এখনো কোনো ছবি যুক্ত হয়নি।{" "}
          {canManage && (
            <>
              গ্যালারিতে আপলোড করার সময় “কর্মসূচি” বেছে নিলেও ছবি সরাসরি যুক্ত হয়।{" "}
              <Link href="/admin/gallery" className="font-semibold text-brand-700 underline underline-offset-4">গ্যালারিতে যান</Link>
            </>
          )}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 md:grid-cols-4 xl:grid-cols-6" aria-label="যুক্ত ছবি" data-testid="linked-photos">
          {linked.map((img, i) => {
            const label = adminPhotoLabel(i + 1, img.caption);
            return (
              <li key={img.id} className="overflow-hidden rounded-xl border border-line bg-white" data-image-id={img.id}>
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.thumb} alt={label} width={240} height={180} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" />
                  {!img.isPublished && <span className="absolute inset-x-0 bottom-0 bg-black/65 px-1 text-center text-xs text-white">অপ্রকাশিত</span>}
                </div>
                {canManage && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () => unlinkProgramPhotos(programId, [img.id]),
                        () => "ছবিটি কর্মসূচি থেকে সরানো হয়েছে (গ্যালারিতে আছে)।",
                      )
                    }
                    className="flex min-h-11 w-full items-center justify-center gap-1.5 border-t border-line text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                    aria-label={`কর্মসূচি থেকে সরান: ${label}`}
                  >
                    <Link2Off className="size-4" aria-hidden="true" /> সরান
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canManage && chooser && (
        <section aria-labelledby="chooser-heading" className="rounded-xl border border-line bg-cream p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="chooser-heading" className="font-serif text-lg font-semibold text-brand-900">
              «{categoryName}» ক্যাটাগরির অন্যান্য ছবি
            </h3>
            <Button variant="ghost" size="sm" className="min-h-11" onClick={() => { setChooser(null); setSelected(new Set()); }}>
              <X className="size-4" aria-hidden="true" /> বন্ধ করুন
            </Button>
          </div>
          {candidates.length === 0 ? (
            <p className="mt-2 text-muted">
              এই ক্যাটাগরিতে যুক্ত করার মতো আর কোনো ছবি নেই।{" "}
              <Link href="/admin/gallery" className="font-semibold text-brand-700 underline underline-offset-4">গ্যালারিতে নতুন ছবি আপলোড করুন</Link>
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted">ছবিতে টিক দিয়ে নির্বাচন করুন। অন্য কর্মসূচিতে যুক্ত ছবি বেছে নিলে সেটি এই কর্মসূচিতে সরে আসবে।</p>
              <ul className="mt-3 grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 md:grid-cols-4 xl:grid-cols-6" aria-label="যুক্ত করার মতো ছবি">
                {candidates.map((img, i) => {
                  const label = adminPhotoLabel(i + 1, img.caption);
                  const checked = selected.has(img.id);
                  return (
                    <li key={img.id}>
                      <label
                        className={`relative block cursor-pointer overflow-hidden rounded-xl border bg-white has-[input:focus-visible]:outline-3 has-[input:focus-visible]:outline-gold-500 ${
                          checked ? "border-brand-700 ring-4 ring-brand-700/40" : "border-line"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.thumb} alt="" width={240} height={180} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" />
                        <span className="absolute start-1 top-1 inline-flex size-9 items-center justify-center rounded-lg bg-white/90 shadow">
                          <input
                            type="checkbox"
                            className="size-5 accent-brand-700"
                            checked={checked}
                            onChange={() =>
                              setSelected((prev) => {
                                const next = new Set(prev);
                                if (next.has(img.id)) next.delete(img.id);
                                else next.add(img.id);
                                return next;
                              })
                            }
                          />
                          <span className="sr-only">নির্বাচন করুন: {label}</span>
                        </span>
                        <span className="absolute inset-x-1 bottom-1 flex flex-wrap gap-1">
                          {!img.isPublished && <Badge tone="amber">অপ্রকাশিত</Badge>}
                          {img.programId && <Badge tone="blue">অন্য কর্মসূচিতে</Badge>}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {candidates.length > 0 && (
              <Button
                disabled={pending || selectedIds.length === 0}
                onClick={() =>
                  run(
                    () => linkProgramPhotos(programId, selectedIds),
                    (n) => `${bn(n)}টি ছবি কর্মসূচিতে যুক্ত হয়েছে।`,
                    () => {
                      setSelected(new Set());
                      setChooser((prev) =>
                        prev ? { ...prev, list: prev.list.map((x) => (selectedIds.includes(x.id) ? { ...x, programId } : x)) } : prev,
                      );
                    },
                  )
                }
              >
                {pending ? <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ImagePlus className="size-5" aria-hidden="true" />}
                নির্বাচিত ছবি যুক্ত করুন{selectedIds.length ? ` (${bn(selectedIds.length)})` : ""}
              </Button>
            )}
            {chooser.list.length < chooser.total && (
              <Button variant="ghost" className="border border-line bg-white" disabled={loading} onClick={() => void load(true)}>
                আরও ছবি দেখান ({bn(chooser.total - chooser.list.length)}টি বাকি)
              </Button>
            )}
          </div>
        </section>
      )}
    </Card>
  );
}
