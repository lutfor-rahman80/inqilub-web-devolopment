"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, ImageOff, Lock, Save, Wand2 } from "lucide-react";
import {
  createProgram,
  listCategoryImages,
  updateProgram,
  type CategoryImage,
} from "@/app/admin/(panel)/programs/actions";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckField } from "@/components/admin/check-field";
import { PendingButton } from "@/components/admin/pending-button";
import { useUnsavedChangesGuard } from "@/components/admin/use-unsaved-guard";
import { bn } from "@/lib/format";
import { adminPhotoLabel } from "@/lib/gallery/labels";
import { PROGRAM_LIMITS, type FieldErrors } from "@/lib/programs/schemas";
import { suggestProgramSlug } from "@/lib/programs/slug";
import { dhakaToday, programStatus } from "@/lib/programs/status";
import { programs as programMessages } from "@/i18n/messages/programs";
import { StatusBadge } from "../status-badge";
import { ProgramDeleteButton } from "./program-delete-button";

export type ProgramFormValues = {
  category_id: string;
  slug: string;
  title_bn: string;
  title_en: string;
  summary_bn: string;
  summary_en: string;
  body_bn: string;
  body_en: string;
  location_bn: string;
  location_en: string;
  starts_on: string;
  ends_on: string;
  status_override: "" | "postponed" | "cancelled";
  cover_image_id: string;
  is_published: boolean;
  sort_order: string;
};

export type CategoryChoice = { id: string; slug: string; name: string; isActive: boolean };

const STATUS_LABELS = programMessages.bn.status;

export function ProgramForm({
  id,
  initial,
  categories,
  updatedAt: initialUpdatedAt,
  slugLocked: initialSlugLocked = false,
  initialImages = [],
  initialImagesTotal = 0,
  justCreated = false,
}: {
  id?: string;
  initial: ProgramFormValues;
  categories: CategoryChoice[];
  updatedAt?: string;
  slugLocked?: boolean;
  initialImages?: CategoryImage[];
  initialImagesTotal?: number;
  justCreated?: boolean;
}) {
  const router = useRouter();
  const isEdit = Boolean(id);
  const [v, setV] = useState(initial);
  const [savedCategory, setSavedCategory] = useState(initial.category_id);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [slugLocked, setSlugLocked] = useState(initialSlugLocked);
  const [savedPublished, setSavedPublished] = useState(initial.is_published);
  const [savedSlug, setSavedSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(
    justCreated ? { ok: true, message: "কর্মসূচিটি তৈরি হয়েছে। এখন ছবি যুক্ত করতে পারেন।" } : null,
  );
  const [fe, setFe] = useState<FieldErrors>({});
  const [dirty, setDirty] = useState(false);
  const [images, setImages] = useState<{ categoryId: string; list: CategoryImage[]; total: number }>({
    categoryId: initial.category_id,
    list: initialImages,
    total: initialImagesTotal,
  });
  const [imagesState, setImagesState] = useState<"idle" | "loading" | "error">("idle");
  const formRef = useRef<HTMLFormElement>(null);

  useUnsavedChangesGuard(dirty);

  useEffect(() => {
    if (Object.keys(fe).length) formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [fe]);

  const category = categories.find((c) => c.id === v.category_id);
  const suggestion = suggestProgramSlug({ titleEn: v.title_en, startsOn: v.starts_on, categorySlug: category?.slug });
  const preview = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.starts_on)) return null;
    return programStatus(
      { starts_on: v.starts_on, ends_on: v.ends_on || null, status_override: v.status_override || null },
      dhakaToday(),
    );
  }, [v.starts_on, v.ends_on, v.status_override]);

  function set<K extends keyof ProgramFormValues>(key: K, value: ProgramFormValues[K]) {
    setDirty(true);
    setV((prev) => {
      const next = { ...prev, [key]: value };
      // Until the slug is edited by hand (and while it may still change), keep it in step with the suggestion.
      if (!slugTouched && !slugLocked && (key === "title_en" || key === "starts_on" || key === "category_id")) {
        const cat = categories.find((c) => c.id === next.category_id);
        next.slug = suggestProgramSlug({ titleEn: next.title_en, startsOn: next.starts_on, categorySlug: cat?.slug });
      }
      return next;
    });
  }

  async function loadImages(categoryId: string, append = false) {
    if (!categoryId) {
      setImages({ categoryId: "", list: [], total: 0 });
      return;
    }
    setImagesState("loading");
    try {
      const offset = append && images.categoryId === categoryId ? images.list.length : 0;
      const r = await listCategoryImages(categoryId, offset);
      if (!r.ok) {
        setImagesState("error");
        return;
      }
      setImages((prev) => ({
        categoryId,
        list: append && prev.categoryId === categoryId ? [...prev.list, ...r.images] : r.images,
        total: r.total,
      }));
      setImagesState("idle");
    } catch {
      setImagesState("error");
    }
  }

  function changeCategory(categoryId: string) {
    set("category_id", categoryId);
    // The cover must belong to the program's category.
    setV((prev) => ({ ...prev, cover_image_id: "" }));
    void loadImages(categoryId);
  }

  function submit() {
    setStatus(null);
    startTransition(async () => {
      try {
        const r = id ? await updateProgram(id, v, updatedAt) : await createProgram(v);
        if (!r.ok) {
          setFe(r.fieldErrors ?? {});
          setStatus({ ok: false, message: r.error });
          return;
        }
        setFe({});
        setDirty(false);
        if (!id) {
          router.push(`/admin/programs/${r.id}?created=1`);
          return;
        }
        setUpdatedAt(r.updatedAt);
        setSlugLocked(r.slugLocked);
        setSavedPublished(r.isPublished);
        setSavedSlug(r.slug);
        setSavedCategory(v.category_id);
        setStatus({
          ok: true,
          message: r.isPublished
            ? "পরিবর্তন সংরক্ষিত হয়েছে। কর্মসূচিটি ওয়েবসাইটে প্রকাশিত।"
            : "পরিবর্তন সংরক্ষিত হয়েছে। কর্মসূচিটি খসড়া হিসেবে আছে (ওয়েবসাইটে দেখা যাবে না)।",
        });
        router.refresh();
      } catch {
        setStatus({ ok: false, message: "সংরক্ষণ করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।" });
      }
    });
  }

  const err = (name: keyof ProgramFormValues) => fe[name];
  const describe = (name: string, hint: boolean) => (fe[name] ? `${name}-error` : hint ? `${name}-hint` : undefined);
  const count = (value: string, max: number) => `${bn(value.length)}/${bn(max)}`;
  const categoryChanged = isEdit && v.category_id !== savedCategory;

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-5"
    >
      {status && !pending && <Alert tone={status.ok ? "success" : "error"}>{status.message}</Alert>}

      <Card className="space-y-5 p-4 sm:p-6">
        <h2 className="text-xl font-bold">মূল তথ্য</h2>
        <Field
          id="category_id"
          label="কার্যক্রমের ক্ষেত্র (ক্যাটাগরি)"
          required
          error={err("category_id")}
          hint={
            categoryChanged
              ? "সংরক্ষণ করলে আগের ক্যাটাগরির যেসব ছবি এই কর্মসূচির সাথে যুক্ত ছিল সেগুলোর সংযোগ মুছে যাবে, প্রচ্ছদও বাদ যাবে।"
              : "কর্মসূচির ছবি ও প্রচ্ছদ শুধু এই ক্যাটাগরির ছবি থেকে বেছে নেওয়া যায়।"
          }
        >
          <Select
            id="category_id"
            value={v.category_id}
            onChange={(e) => changeCategory(e.target.value)}
            required
            aria-invalid={err("category_id") ? true : undefined}
            aria-describedby={describe("category_id", true)}
          >
            <option value="">— নির্বাচন করুন —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.isActive ? "" : " (নিষ্ক্রিয়)"}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="starts_on" label="শুরুর তারিখ" required error={err("starts_on")}>
            <Input
              id="starts_on"
              type="date"
              min="2000-01-02"
              max="2100-12-31"
              value={v.starts_on}
              onChange={(e) => set("starts_on", e.target.value)}
              required
              aria-invalid={err("starts_on") ? true : undefined}
              aria-describedby={describe("starts_on", false)}
            />
          </Field>
          <Field id="ends_on" label="শেষের তারিখ" error={err("ends_on")} hint="এক দিনের কর্মসূচি হলে ফাঁকা রাখুন।">
            <Input
              id="ends_on"
              type="date"
              min={v.starts_on || "2000-01-02"}
              max="2100-12-31"
              value={v.ends_on}
              onChange={(e) => set("ends_on", e.target.value)}
              aria-invalid={err("ends_on") ? true : undefined}
              aria-describedby={describe("ends_on", true)}
            />
          </Field>
          <Field id="location_bn" label="স্থান (বাংলা)" error={err("location_bn")} hint="কর্মসূচিটি কোথায় হয়েছে বা হবে (যেমন বিদ্যালয়ের মাঠ ও এলাকার নাম)। জানা না থাকলে ফাঁকা রাখুন।">
            <Input
              id="location_bn"
              value={v.location_bn}
              maxLength={PROGRAM_LIMITS.location}
              onChange={(e) => set("location_bn", e.target.value)}
              aria-invalid={err("location_bn") ? true : undefined}
              aria-describedby={describe("location_bn", true)}
            />
          </Field>
          <Field id="location_en" label="স্থান (ইংরেজি)" error={err("location_en")}>
            <Input
              id="location_en"
              lang="en"
              dir="ltr"
              value={v.location_en}
              maxLength={PROGRAM_LIMITS.location}
              onChange={(e) => set("location_en", e.target.value)}
              aria-invalid={err("location_en") ? true : undefined}
              aria-describedby={describe("location_en", false)}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 sm:items-start">
          <Field
            id="status_override"
            label="বিশেষ অবস্থা"
            required
            error={err("status_override")}
            hint="সাধারণত “স্বয়ংক্রিয়” রাখুন: তারিখ অনুযায়ী আসন্ন, চলমান বা সম্পন্ন দেখাবে।"
          >
            <Select
              id="status_override"
              value={v.status_override}
              onChange={(e) => set("status_override", e.target.value as ProgramFormValues["status_override"])}
              aria-invalid={err("status_override") ? true : undefined}
              aria-describedby={describe("status_override", true)}
            >
              <option value="">স্বয়ংক্রিয় (তারিখ অনুযায়ী)</option>
              <option value="postponed">স্থগিত</option>
              <option value="cancelled">বাতিল</option>
            </Select>
          </Field>
          <div className="rounded-xl border border-line bg-cream px-4 py-3" aria-live="polite">
            <p className="text-sm text-muted">আজকের হিসাবে ওয়েবসাইটে অবস্থা</p>
            <p className="mt-1">{preview ? <StatusBadge status={preview} label={STATUS_LABELS[preview]} /> : "শুরুর তারিখ দিন"}</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-5 p-4 sm:p-6">
        <h2 className="text-xl font-bold">বাংলা লেখা</h2>
        <Field id="title_bn" label="শিরোনাম" required error={err("title_bn")}>
          <Input
            id="title_bn"
            value={v.title_bn}
            maxLength={PROGRAM_LIMITS.title}
            required
            onChange={(e) => set("title_bn", e.target.value)}
            aria-invalid={err("title_bn") ? true : undefined}
            aria-describedby={describe("title_bn", false)}
          />
        </Field>
        <Field
          id="summary_bn"
          label="সংক্ষিপ্ত বিবরণ"
          error={err("summary_bn")}
          hint={`তালিকার কার্ডে ও সোশ্যাল মিডিয়ায় শেয়ার করলে দেখাবে; এক-দুই বাক্যে লিখুন। (${count(v.summary_bn, PROGRAM_LIMITS.summary)})`}
        >
          <Textarea
            id="summary_bn"
            rows={2}
            value={v.summary_bn}
            maxLength={PROGRAM_LIMITS.summary}
            onChange={(e) => set("summary_bn", e.target.value)}
            aria-invalid={err("summary_bn") ? true : undefined}
            aria-describedby={describe("summary_bn", true)}
          />
        </Field>
        <Field
          id="body_bn"
          label="বিস্তারিত বিবরণ"
          error={err("body_bn")}
          hint="সাধারণ লেখা হিসেবে দেখানো হবে (HTML কাজ করে না)। নতুন অনুচ্ছেদের জন্য মাঝে একটি ফাঁকা লাইন রাখুন।"
        >
          <Textarea
            id="body_bn"
            rows={8}
            value={v.body_bn}
            maxLength={PROGRAM_LIMITS.body}
            onChange={(e) => set("body_bn", e.target.value)}
            aria-invalid={err("body_bn") ? true : undefined}
            aria-describedby={describe("body_bn", true)}
            className="max-h-[70vh] min-h-40 leading-relaxed field-sizing-content"
          />
        </Field>
      </Card>

      <Card className="space-y-5 p-4 sm:p-6">
        <div>
          <h2 className="text-xl font-bold">ইংরেজি লেখা (ঐচ্ছিক)</h2>
          <p className="mt-1 text-muted">
            ইংরেজি ওয়েবসাইটের (/en) জন্য। কোনো ঘর ফাঁকা থাকলে সেখানে বাংলা লেখাটিই দেখানো হবে এবং জানিয়ে দেওয়া হবে যে ইংরেজি অনুবাদ এখনো যুক্ত হয়নি।
          </p>
        </div>
        <Field id="title_en" label="শিরোনাম (ইংরেজি)" error={err("title_en")} hint="ইংরেজি শিরোনাম থেকে স্লাগ (ওয়েবসাইটের ঠিকানা) প্রস্তাব করা হয়।">
          <Input
            id="title_en"
            lang="en"
            dir="ltr"
            value={v.title_en}
            maxLength={PROGRAM_LIMITS.title}
            onChange={(e) => set("title_en", e.target.value)}
            aria-invalid={err("title_en") ? true : undefined}
            aria-describedby={describe("title_en", true)}
          />
        </Field>
        <Field id="summary_en" label="সংক্ষিপ্ত বিবরণ (ইংরেজি)" error={err("summary_en")} hint={count(v.summary_en, PROGRAM_LIMITS.summary)}>
          <Textarea
            id="summary_en"
            lang="en"
            dir="ltr"
            rows={2}
            value={v.summary_en}
            maxLength={PROGRAM_LIMITS.summary}
            onChange={(e) => set("summary_en", e.target.value)}
            aria-invalid={err("summary_en") ? true : undefined}
            aria-describedby={describe("summary_en", true)}
          />
        </Field>
        <Field id="body_en" label="বিস্তারিত বিবরণ (ইংরেজি)" error={err("body_en")}>
          <Textarea
            id="body_en"
            lang="en"
            dir="ltr"
            rows={6}
            value={v.body_en}
            maxLength={PROGRAM_LIMITS.body}
            onChange={(e) => set("body_en", e.target.value)}
            aria-invalid={err("body_en") ? true : undefined}
            aria-describedby={describe("body_en", false)}
            className="max-h-[70vh] min-h-32 leading-relaxed field-sizing-content"
          />
        </Field>
      </Card>

      <Card className="space-y-4 p-4 sm:p-6">
        <h2 className="text-xl font-bold">ওয়েবসাইটের ঠিকানা (স্লাগ)</h2>
        <Field
          id="slug"
          label="স্লাগ"
          required
          error={err("slug")}
          hint={
            slugLocked ? (
              <>এই কর্মসূচি একবার প্রকাশিত হয়েছে, তাই ঠিকানাটি স্থায়ী — শেয়ার করা লিংক যেন নষ্ট না হয়।</>
            ) : (
              <>
                এটি কর্মসূচির পাতার ঠিকানা হবে: <code dir="ltr">/programs/{v.slug || "…"}</code>। শুধু ছোট হাতের ইংরেজি অক্ষর, সংখ্যা ও হাইফেন।{" "}
                <strong>প্রথমবার প্রকাশের পর আর বদলানো যাবে না।</strong>
              </>
            )
          }
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Input
                id="slug"
                dir="ltr"
                lang="en"
                autoComplete="off"
                spellCheck={false}
                maxLength={80}
                value={v.slug}
                readOnly={slugLocked}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"));
                }}
                required
                aria-invalid={err("slug") ? true : undefined}
                aria-describedby={describe("slug", true)}
                className={slugLocked ? "bg-stone-50 pe-10 text-muted" : ""}
              />
              {slugLocked && <Lock className="absolute end-3 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />}
            </div>
            {!slugLocked && suggestion && suggestion !== v.slug && (
              <Button
                variant="outline"
                onClick={() => {
                  setSlugTouched(false);
                  set("slug", suggestion);
                }}
              >
                <Wand2 className="size-5" aria-hidden="true" />
                প্রস্তাবিত: <span dir="ltr" className="max-w-[14rem] truncate">{suggestion}</span>
              </Button>
            )}
          </div>
        </Field>
      </Card>

      <Card className="space-y-4 p-4 sm:p-6">
        <fieldset aria-describedby={fe.cover_image_id ? "cover-error" : "cover-hint"}>
          <legend className="text-xl font-bold">প্রচ্ছদ ছবি</legend>
          <p id="cover-hint" className="mt-1 text-muted">
            তালিকার কার্ডে ও কর্মসূচির পাতার উপরে দেখাবে। শুধু এই ক্যাটাগরির ছবি বেছে নেওয়া যায়; ওয়েবসাইটে শুধু প্রকাশিত ছবিই দেখাবে।
          </p>
          {fe.cover_image_id && (
            <p id="cover-error" role="alert" className="mt-1 text-sm font-medium text-red-700">{fe.cover_image_id}</p>
          )}
          {!v.category_id ? (
            <p className="mt-3 text-muted">প্রথমে কার্যক্রমের ক্ষেত্র নির্বাচন করুন।</p>
          ) : imagesState === "error" ? (
            <div className="mt-3">
              <Alert>ছবির তালিকা লোড করা যায়নি।</Alert>
              <Button variant="outline" className="mt-2" onClick={() => void loadImages(v.category_id)}>আবার চেষ্টা করুন</Button>
            </div>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 md:grid-cols-5" aria-busy={imagesState === "loading" || undefined}>
                <label
                  className={`flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center text-sm has-[input:focus-visible]:outline-3 has-[input:focus-visible]:outline-gold-500 ${
                    v.cover_image_id === "" ? "border-brand-700 bg-brand-50 ring-2 ring-brand-700/25" : "border-dashed border-line bg-white"
                  }`}
                >
                  <input type="radio" name="cover" value="" checked={v.cover_image_id === ""} onChange={() => set("cover_image_id", "")} className="sr-only" />
                  <ImageOff className="size-6 text-muted" aria-hidden="true" />
                  প্রচ্ছদ নেই (ক্যাটাগরির আইকন)
                </label>
                {images.categoryId === v.category_id &&
                  images.list.map((img, index) => (
                    <label
                      key={img.id}
                      className={`relative cursor-pointer overflow-hidden rounded-xl border has-[input:focus-visible]:outline-3 has-[input:focus-visible]:outline-gold-500 ${
                        v.cover_image_id === img.id ? "border-brand-700 ring-4 ring-brand-700/40" : "border-line"
                      }`}
                    >
                      <input
                        type="radio"
                        name="cover"
                        value={img.id}
                        checked={v.cover_image_id === img.id}
                        onChange={() => set("cover_image_id", img.id)}
                        className="sr-only"
                      />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.thumb}
                        alt={adminPhotoLabel(index + 1, img.caption)}
                        width={240}
                        height={180}
                        loading="lazy"
                        decoding="async"
                        className="aspect-[4/3] w-full object-cover"
                      />
                      {v.cover_image_id === img.id && (
                        <span className="absolute end-1 top-1 inline-flex size-7 items-center justify-center rounded-full bg-brand-700 text-white">
                          <Check className="size-4" aria-hidden="true" />
                        </span>
                      )}
                      {!img.isPublished && (
                        <span className="absolute inset-x-0 bottom-0 bg-black/65 px-1 text-center text-xs text-white">অপ্রকাশিত</span>
                      )}
                    </label>
                  ))}
              </div>
              {imagesState === "loading" && <p className="mt-2 text-sm text-muted" aria-live="polite">ছবি লোড হচ্ছে…</p>}
              {imagesState === "idle" && images.categoryId === v.category_id && images.list.length === 0 && (
                <p className="mt-2 text-sm text-muted">
                  এই ক্যাটাগরিতে এখনো কোনো ছবি নেই। <Link href="/admin/gallery" className="font-semibold text-brand-700 underline underline-offset-4">গ্যালারিতে আপলোড করুন</Link>।
                </p>
              )}
              {images.categoryId === v.category_id && images.list.length < images.total && (
                <Button variant="ghost" className="mt-2 border border-line bg-white" disabled={imagesState === "loading"} onClick={() => void loadImages(v.category_id, true)}>
                  আরও ছবি দেখান ({bn(images.total - images.list.length)}টি বাকি)
                </Button>
              )}
            </>
          )}
        </fieldset>
      </Card>

      <Card className="space-y-4 p-4 sm:p-6">
        <h2 className="text-xl font-bold">প্রকাশ</h2>
        <div className="grid gap-4 md:grid-cols-2 md:items-start">
          <CheckField
            id="is_published"
            label="ওয়েবসাইটে প্রকাশ করুন"
            hint="টিক না দিলে খসড়া হিসেবে থাকবে; শুধু অ্যাডমিন প্যানেলে দেখা যাবে।"
            checked={v.is_published}
            onChange={(e) => set("is_published", e.target.checked)}
          />
          <Field id="sort_order" label="প্রদর্শন ক্রম" required error={err("sort_order")} hint="একই তারিখের কর্মসূচির মধ্যে ছোট সংখ্যা আগে দেখাবে।">
            <Input
              id="sort_order"
              inputMode="numeric"
              value={v.sort_order}
              onChange={(e) => set("sort_order", e.target.value)}
              aria-invalid={err("sort_order") ? true : undefined}
              aria-describedby={describe("sort_order", true)}
            />
          </Field>
        </div>
      </Card>

      {Object.keys(fe).length > 0 && !pending && status && !status.ok && (
        <p className="text-sm text-red-700">চিহ্নিত {bn(Object.keys(fe).length)}টি ঘর ঠিক করুন।</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <PendingButton type="submit" pending={pending} icon={<Save className="size-5" aria-hidden="true" />}>
          {pending ? "সংরক্ষণ হচ্ছে…" : isEdit ? "পরিবর্তন সংরক্ষণ করুন" : "কর্মসূচি তৈরি করুন"}
        </PendingButton>
        <Link href="/admin/programs" className={buttonClass("ghost", "md", "border border-line bg-white")}>
          তালিকায় ফিরে যান
        </Link>
        {isEdit && savedPublished && (
          <Link href={`/programs/${savedSlug}`} target="_blank" className={buttonClass("ghost", "md")}>
            ওয়েবসাইটে দেখুন <ExternalLink className="size-4" aria-hidden="true" />
            <span className="sr-only">(নতুন ট্যাবে খুলবে)</span>
          </Link>
        )}
        {isEdit && id && (
          <span className="ms-auto">
            <ProgramDeleteButton id={id} title={initial.title_bn} label="কর্মসূচি মুছে ফেলুন" />
          </span>
        )}
      </div>
    </form>
  );
}
