"use client";

import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { Check, Loader2, Save, Trash2 } from "lucide-react";
import { bn } from "@/lib/format";
import { adminPhotoLabel } from "@/lib/gallery/labels";
import { Alert, Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CATEGORY_ICONS, CategoryIcon } from "@/components/ui/category-icon";
import { deleteCategory, type CategoryFormState } from "@/app/admin/(panel)/categories/actions";
import { ConfirmDialog } from "./confirm-dialog";

const ICON_LABELS: Record<string, string> = {
  "hand-heart": "সাহায্যের হাত",
  "life-buoy": "লাইফবয়",
  droplet: "রক্তের ফোঁটা",
  "graduation-cap": "শিক্ষা",
  "book-open": "খোলা বই",
  "moon-star": "চাঁদ-তারা",
  shirt: "পোশাক",
  stethoscope: "চিকিৎসা",
  megaphone: "মাইক",
  trophy: "ট্রফি",
  "book-heart": "বই ও হৃদয়",
  gift: "উপহার",
  "heart-handshake": "সহযোগিতা",
};

export type CoverOption = { id: string; thumb: string; caption: string; isPublished: boolean };

export type CategoryValues = {
  slug: string;
  name_bn: string;
  summary: string;
  description: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  cover_image_id: string | null;
  name_en: string;
  summary_en: string;
  description_en: string;
};

export function CategoryForm({
  mode,
  categoryId,
  initial,
  action,
  coverOptions = [],
  imageCount = 0,
  justCreated = false,
}: {
  mode: "create" | "edit";
  categoryId?: string;
  initial: CategoryValues;
  action: (state: CategoryFormState, form: FormData) => Promise<CategoryFormState>;
  coverOptions?: CoverOption[];
  imageCount?: number;
  justCreated?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [v, setV] = useState({ ...initial, sort_order: bn(initial.sort_order) });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const fe = state.fieldErrors ?? {};
  const set = <K extends keyof typeof v>(key: K, value: (typeof v)[K]) => setV((prev) => ({ ...prev, [key]: value }));
  const desc = (name: string, hint: boolean) => (fe[name] ? `${name}-error` : hint ? `${name}-hint` : undefined);

  return (
    <div className="space-y-6">
      {/*
        Submitted through onSubmit (not the `action` prop): React resets a form
        after an `action` runs, which put the DOM state of these controlled
        radios/checkbox back to their initial values while React state kept the
        new ones — a second save then silently sent the old values.
      */}
      <form
        className="space-y-6"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => formAction(data));
        }}
      >
        {state.error && <Alert>{state.error}</Alert>}
        {state.saved && !pending && (
          <Alert tone="success">পরিবর্তন সংরক্ষিত হয়েছে। ওয়েবসাইটেও হালনাগাদ হয়েছে।</Alert>
        )}
        {justCreated && !state.saved && !state.error && (
          <Alert tone="success">নতুন ক্যাটাগরি তৈরি হয়েছে। এখন এই ফোল্ডারে ছবি আপলোড করা যাবে।</Alert>
        )}

        <Card className="space-y-5 p-4 sm:p-6">
          {mode === "create" ? (
            <Field
              id="slug"
              label="ফোল্ডার নাম (ইংরেজিতে)"
              required
              error={fe.slug}
              hint={
                <>
                  ছবিগুলো <code dir="ltr">activities/{v.slug || "folder-name"}/</code> ফোল্ডারে থাকবে। শুধু ছোট হাতের ইংরেজি অক্ষর, সংখ্যা ও
                  হাইফেন (যেমন <code dir="ltr">tree-plantation</code>)। <strong>এটি স্থায়ী — পরে আর বদলানো যাবে না।</strong>
                </>
              }
            >
              <Input
                id="slug"
                name="slug"
                dir="ltr"
                required
                maxLength={60}
                autoComplete="off"
                spellCheck={false}
                value={v.slug}
                onChange={(e) => set("slug", e.target.value.toLowerCase())}
                aria-invalid={Boolean(fe.slug) || undefined}
                aria-describedby={desc("slug", true)}
              />
            </Field>
          ) : (
            <div>
              <p className="font-medium">ফোল্ডার নাম</p>
              <p className="mt-1">
                <code dir="ltr" className="rounded bg-cream px-2 py-1 text-brand-800">activities/{initial.slug}/</code>
              </p>
              <p className="mt-1 text-sm text-muted">ফোল্ডার নাম স্থায়ী; ছবির ফাইলগুলো এই ফোল্ডারে থাকে বলে এটি বদলানো যায় না।</p>
            </div>
          )}

          <Field id="name_bn" label="ক্যাটাগরির নাম" required error={fe.name_bn}>
            <Input
              id="name_bn"
              name="name_bn"
              required
              maxLength={120}
              value={v.name_bn}
              onChange={(e) => set("name_bn", e.target.value)}
              aria-invalid={Boolean(fe.name_bn) || undefined}
              aria-describedby={desc("name_bn", false)}
            />
          </Field>

          <Field id="summary" label="সংক্ষিপ্ত বিবরণ" error={fe.summary} hint={`কার্যক্রমের তালিকায় নামের নিচে দেখাবে। (${bn(v.summary.length)}/৪০০)`}>
            <Textarea
              id="summary"
              name="summary"
              rows={2}
              maxLength={400}
              value={v.summary}
              onChange={(e) => set("summary", e.target.value)}
              aria-invalid={Boolean(fe.summary) || undefined}
              aria-describedby={desc("summary", true)}
            />
          </Field>

          <Field
            id="description"
            label="বিস্তারিত বিবরণ"
            error={fe.description}
            hint={`কার্যক্রমের নিজস্ব পৃষ্ঠায় দেখাবে। অনুচ্ছেদ আলাদা করতে মাঝে একটি ফাঁকা লাইন দিন; শুধু সাধারণ লেখা। (${bn(v.description.length)}/৫০০০)`}
          >
            <Textarea
              id="description"
              name="description"
              rows={8}
              maxLength={5000}
              value={v.description}
              onChange={(e) => set("description", e.target.value)}
              aria-invalid={Boolean(fe.description) || undefined}
              aria-describedby={desc("description", true)}
            />
          </Field>

          <fieldset aria-describedby={fe.icon ? "icon-error" : undefined}>
            <legend className="font-medium">আইকন</legend>
            <div className="mt-2 grid grid-cols-3 gap-2 min-[480px]:grid-cols-4 md:grid-cols-7">
              {Object.keys(CATEGORY_ICONS).map((key) => (
                <label
                  key={key}
                  className={`flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center text-sm transition-colors has-[input:focus-visible]:outline-3 has-[input:focus-visible]:outline-gold-500 ${
                    v.icon === key ? "border-brand-700 bg-brand-50 text-brand-900 ring-2 ring-brand-700/25" : "border-line bg-white hover:bg-brand-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="icon"
                    value={key}
                    checked={v.icon === key}
                    onChange={() => set("icon", key)}
                    className="sr-only"
                  />
                  <CategoryIcon name={key} className="size-7 text-brand-700" />
                  <span className="leading-tight">{ICON_LABELS[key] ?? key}</span>
                </label>
              ))}
            </div>
            {fe.icon && <p id="icon-error" role="alert" className="mt-1 text-sm font-medium text-red-700">{fe.icon}</p>}
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="sort_order" label="প্রদর্শন ক্রম" required error={fe.sort_order} hint="ছোট সংখ্যা আগে দেখাবে।">
              <Input
                id="sort_order"
                name="sort_order"
                inputMode="numeric"
                required
                value={v.sort_order}
                onChange={(e) => set("sort_order", e.target.value)}
                aria-invalid={Boolean(fe.sort_order) || undefined}
                aria-describedby={desc("sort_order", true)}
              />
            </Field>
            <div className="space-y-1.5">
              <p className="font-medium">অবস্থা</p>
              <label className="flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  name="is_active"
                  className="size-5 accent-brand-700"
                  checked={v.is_active}
                  onChange={(e) => set("is_active", e.target.checked)}
                  aria-describedby="is_active-hint"
                />
                সক্রিয় (ওয়েবসাইটে দেখাবে)
              </label>
              <p id="is_active-hint" className="text-sm text-muted">নিষ্ক্রিয় করলে কার্যক্রমটি ও এর ছবিগুলো ওয়েবসাইটে দেখাবে না।</p>
            </div>
          </div>
        </Card>

        <Card className="space-y-5 p-4 sm:p-6">
          <div>
            <h2 className="text-xl font-bold">ইংরেজি (ঐচ্ছিক)</h2>
            <p className="mt-1 text-muted">
              ইংরেজি ওয়েবসাইটের (/en) জন্য। কোনো ঘর ফাঁকা থাকলে সেখানে বাংলা লেখাটিই দেখানো হবে এবং জানিয়ে দেওয়া হবে যে ইংরেজি অনুবাদ এখনো যুক্ত হয়নি।
            </p>
          </div>
          <Field id="name_en" label="নাম (ইংরেজি)" error={fe.name_en}>
            <Input
              id="name_en"
              name="name_en"
              lang="en"
              dir="ltr"
              maxLength={120}
              value={v.name_en}
              onChange={(e) => set("name_en", e.target.value)}
              aria-invalid={Boolean(fe.name_en) || undefined}
              aria-describedby={desc("name_en", false)}
            />
          </Field>
          <Field id="summary_en" label="সংক্ষিপ্ত বিবরণ (ইংরেজি)" error={fe.summary_en} hint={`(${bn(v.summary_en.length)}/৪০০)`}>
            <Textarea
              id="summary_en"
              name="summary_en"
              lang="en"
              dir="ltr"
              rows={2}
              maxLength={400}
              value={v.summary_en}
              onChange={(e) => set("summary_en", e.target.value)}
              aria-invalid={Boolean(fe.summary_en) || undefined}
              aria-describedby={desc("summary_en", true)}
            />
          </Field>
          <Field id="description_en" label="বিস্তারিত বিবরণ (ইংরেজি)" error={fe.description_en} hint={`(${bn(v.description_en.length)}/৫০০০)`}>
            <Textarea
              id="description_en"
              name="description_en"
              lang="en"
              dir="ltr"
              rows={6}
              maxLength={5000}
              value={v.description_en}
              onChange={(e) => set("description_en", e.target.value)}
              aria-invalid={Boolean(fe.description_en) || undefined}
              aria-describedby={desc("description_en", true)}
            />
          </Field>
        </Card>

        {mode === "edit" && (
          <Card className="p-4 sm:p-6">
            <fieldset aria-describedby={fe.cover_image_id ? "cover-error" : "cover-hint"}>
              <legend className="font-medium">প্রচ্ছদ ছবি</legend>
              <p id="cover-hint" className="text-sm text-muted">
                কার্যক্রমের তালিকায় এই ছবি দেখাবে। নির্বাচন না করলে প্রথম প্রকাশিত ছবি ব্যবহার হবে।
              </p>
              {fe.cover_image_id && (
                <p id="cover-error" role="alert" className="mt-1 text-sm font-medium text-red-700">{fe.cover_image_id}</p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 md:grid-cols-5">
                <label
                  className={`flex aspect-[4/3] cursor-pointer items-center justify-center rounded-xl border p-2 text-center text-sm has-[input:focus-visible]:outline-3 has-[input:focus-visible]:outline-gold-500 ${
                    v.cover_image_id === null ? "border-brand-700 bg-brand-50 ring-2 ring-brand-700/25" : "border-dashed border-line bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="cover_image_id"
                    value=""
                    checked={v.cover_image_id === null}
                    onChange={() => set("cover_image_id", null)}
                    className="sr-only"
                  />
                  স্বয়ংক্রিয় (প্রথম ছবি)
                </label>
                {coverOptions.map((img, index) => (
                  <label
                    key={img.id}
                    className={`relative cursor-pointer overflow-hidden rounded-xl border has-[input:focus-visible]:outline-3 has-[input:focus-visible]:outline-gold-500 ${
                      v.cover_image_id === img.id ? "border-brand-700 ring-4 ring-brand-700/40" : "border-line"
                    }`}
                  >
                    <input
                      type="radio"
                      name="cover_image_id"
                      value={img.id}
                      checked={v.cover_image_id === img.id}
                      onChange={() => set("cover_image_id", img.id)}
                      className="sr-only"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.thumb} alt={adminPhotoLabel(index + 1, img.caption)} width={240} height={180} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" />
                    {v.cover_image_id === img.id && (
                      <span className="absolute end-1 top-1 inline-flex size-7 items-center justify-center rounded-full bg-brand-700 text-white">
                        <Check className="size-4" aria-hidden="true" />
                      </span>
                    )}
                    {!img.isPublished && (
                      <span className="absolute inset-x-0 bottom-0 bg-black/60 px-1 text-center text-xs text-white">অপ্রকাশিত</span>
                    )}
                  </label>
                ))}
              </div>
              {coverOptions.length === 0 && (
                <p className="mt-2 text-sm text-muted">এই ক্যাটাগরিতে এখনো কোনো ছবি নেই।</p>
              )}
            </fieldset>
          </Card>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Save className="size-5" aria-hidden="true" />}
            {mode === "create" ? "ক্যাটাগরি তৈরি করুন" : "সংরক্ষণ করুন"}
          </Button>
          <Link href="/admin/categories" className="inline-flex min-h-11 items-center rounded-xl px-4 font-semibold text-brand-800 hover:bg-brand-50">
            তালিকায় ফিরে যান
          </Link>
        </div>
      </form>

      {mode === "edit" && categoryId && (
        <Card className="border-red-200 p-4 sm:p-6">
          <h2 className="text-lg font-bold text-red-800">ক্যাটাগরি মুছে ফেলা</h2>
          {imageCount > 0 ? (
            <p className="mt-1 text-muted">
              এই ক্যাটাগরিতে {bn(imageCount)}টি ছবি আছে, তাই এটি মুছে ফেলা যাবে না। ওয়েবসাইট থেকে সরাতে চাইলে উপরে “সক্রিয়” টিক তুলে দিয়ে নিষ্ক্রিয় করুন।
            </p>
          ) : (
            <>
              <p className="mt-1 text-muted">এই ক্যাটাগরিতে কোনো ছবি নেই, তাই এটি স্থায়ীভাবে মুছে ফেলা যাবে।</p>
              {deleteError && <div className="mt-2"><Alert>{deleteError}</Alert></div>}
              <Button variant="danger" className="mt-3" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-5" aria-hidden="true" />
                ক্যাটাগরি মুছে ফেলুন
              </Button>
            </>
          )}
        </Card>
      )}

      {confirmDelete && categoryId && (
        <ConfirmDialog
          title="ক্যাটাগরি মুছে ফেলবেন?"
          confirmLabel="হ্যাঁ, মুছে ফেলুন"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            const res = await deleteCategory(categoryId);
            // On success the action redirects to the list.
            if (res && !res.ok) {
              setDeleteError(res.error);
              setConfirmDelete(false);
            }
          }}
        >
          «{initial.name_bn}» ক্যাটাগরিটি স্থায়ীভাবে মুছে যাবে।
        </ConfirmDialog>
      )}
    </div>
  );
}
