import { z } from "zod";
import { toAsciiDigits } from "@/lib/format";
import { CATEGORY_ICONS } from "@/components/ui/category-icon";
import { isUploadPair, SLUG_MAX, SLUG_RE } from "./paths";

/**
 * Server-side validation for the gallery and activity-category admin
 * (pure; unit tested). Limits mirror the database constraints.
 */

export const CAPTION_MAX = 300;
export const CATEGORY_LIMITS = { name: 120, summary: 400, description: 5000 } as const;
export const SORT_ORDER_RANGE = { min: -100000, max: 100000 } as const;

export const ICON_KEYS = Object.keys(CATEGORY_ICONS);

/** Same as IMAGE_LIMITS.maxFilesPerUpload (kept here so this module has no env dependency). */
export const MAX_FILES_PER_UPLOAD = 30;

const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
  error: "অবৈধ শনাক্তকারী।",
});

/** "Today" in Asia/Dhaka as YYYY-MM-DD. */
export function dhakaToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(now);
}

/** Valid calendar date (YYYY-MM-DD), not before 1990 and not in the future (Dhaka). */
export function isValidEventDate(value: string, now: Date = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return false;
  return value >= "1990-01-01" && value <= dhakaToday(now);
}

/** Caption: single line, collapsed whitespace, ≤ 300 characters. */
export const captionSchema = z
  .string()
  .transform((v) => v.replace(/\s+/g, " ").trim())
  .pipe(z.string().max(CAPTION_MAX, { error: "ক্যাপশন সর্বোচ্চ ৩০০ অক্ষরের হতে পারে।" }));

/** Optional event date: "" / null → null; Bengali digits accepted. */
export const eventDateSchema = z
  .union([z.string(), z.null()])
  .transform((v) => (v === null ? "" : toAsciiDigits(v).trim()))
  .refine((v) => v === "" || isValidEventDate(v), { error: "সঠিক তারিখ দিন (ভবিষ্যতের তারিখ নয়)।" })
  .transform((v) => (v === "" ? null : v));

/** Integer display order (Bengali digits accepted). */
export const sortOrderSchema = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === "number" ? String(v) : toAsciiDigits(v).trim()))
  .refine((v) => /^-?\d+$/.test(v), { error: "ক্রম একটি পূর্ণ সংখ্যা হতে হবে।" })
  .transform(Number)
  .refine((n) => n >= SORT_ORDER_RANGE.min && n <= SORT_ORDER_RANGE.max, {
    error: "ক্রম −১০০০০০ থেকে ১০০০০০ এর মধ্যে হতে হবে।",
  });

const dimension = z.number().int().min(1).max(20000);

/** registerGalleryImages input (after the browser uploaded the files). */
export const registerSchema = z
  .object({
    categoryId: uuid,
    caption: captionSchema,
    eventDate: eventDateSchema,
    publish: z.boolean(),
    /** Optional program (কর্মসূচি) of the same category for every uploaded photo. */
    programId: z.union([uuid, z.null()]).optional(),
    items: z
      .array(
        z.object({
          path: z.string().max(200),
          thumbPath: z.string().max(200),
          width: dimension,
          height: dimension,
        }),
      )
      .min(1, { error: "কোনো ছবি নেই।" })
      .max(MAX_FILES_PER_UPLOAD, { error: "একবারে সর্বোচ্চ ৩০টি ছবি নিবন্ধন করা যায়।" }),
  })
  .superRefine((v, ctx) => {
    const seen = new Set<string>();
    v.items.forEach((item, i) => {
      if (seen.has(item.path)) {
        ctx.addIssue({ code: "custom", path: ["items", i, "path"], message: "একই ফাইল দুইবার দেওয়া হয়েছে।" });
      }
      seen.add(item.path);
    });
  });
export type RegisterInput = z.input<typeof registerSchema>;

/** Validates that every item belongs to the category folder (slug comes from the database). */
export function itemsInCategory(slug: string, items: { path: string; thumbPath: string }[]): boolean {
  return items.every((it) => isUploadPair(slug, it.path, it.thumbPath));
}

/** Partial update of one image from the edit dialog / quick toggles. */
export const imagePatchSchema = z
  .object({
    caption: captionSchema.optional(),
    eventDate: eventDateSchema.optional(),
    sortOrder: sortOrderSchema.optional(),
    isPublished: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    /** Program link (null = none); must be a program of the image's category. */
    programId: z.union([uuid, z.null()]).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { error: "কোনো পরিবর্তন নেই।" });
export type ImagePatchInput = z.input<typeof imagePatchSchema>;

export const idListSchema = z
  .array(uuid)
  .min(1, { error: "কোনো ছবি নির্বাচন করা হয়নি।" })
  .max(100, { error: "একবারে সর্বোচ্চ ১০০টি ছবি নির্বাচন করা যায়।" });

export const uuidSchema = uuid;

// ---------------------------------------------------------------------------
// Activity categories
// ---------------------------------------------------------------------------

const multiline = (max: number, message: string) =>
  z
    .string()
    .transform((v) => v.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim())
    .pipe(z.string().max(max, { error: message }));

export const slugSchema = z
  .string()
  .transform((v) => v.trim().toLowerCase())
  .pipe(
    z
      .string()
      .min(2, { error: "ফোল্ডার নাম কমপক্ষে ২ অক্ষরের হতে হবে।" })
      .max(SLUG_MAX, { error: "ফোল্ডার নাম সর্বোচ্চ ৬০ অক্ষরের হতে পারে।" })
      .regex(SLUG_RE, {
        error: "শুধু ছোট হাতের ইংরেজি অক্ষর (a-z), সংখ্যা (0-9) ও হাইফেন (-) ব্যবহার করুন; শুরু/শেষে হাইফেন নয়।",
      }),
  );

export const categoryFieldsSchema = z.object({
  name_bn: z
    .string()
    .transform((v) => v.replace(/\s+/g, " ").trim())
    .pipe(
      z
        .string()
        .min(1, { error: "ক্যাটাগরির নাম লিখুন।" })
        .max(CATEGORY_LIMITS.name, { error: "নাম সর্বোচ্চ ১২০ অক্ষরের হতে পারে।" }),
    ),
  summary: z
    .string()
    .transform((v) => v.replace(/\s+/g, " ").trim())
    .pipe(z.string().max(CATEGORY_LIMITS.summary, { error: "সংক্ষিপ্ত বিবরণ সর্বোচ্চ ৪০০ অক্ষরের হতে পারে।" })),
  description: multiline(CATEGORY_LIMITS.description, "বিস্তারিত বিবরণ সর্বোচ্চ ৫০০০ অক্ষরের হতে পারে।"),
  icon: z.string().refine((v) => ICON_KEYS.includes(v), { error: "তালিকা থেকে একটি আইকন নির্বাচন করুন।" }),
  sort_order: sortOrderSchema,
  is_active: z.boolean(),
  // Optional English texts (empty → null; the English website then shows the Bengali text).
  name_en: z
    .string()
    .optional()
    .transform((v) => (v ?? "").replace(/\s+/g, " ").trim())
    .pipe(z.string().max(CATEGORY_LIMITS.name, { error: "ইংরেজি নাম সর্বোচ্চ ১২০ অক্ষরের হতে পারে।" }))
    .transform((v) => (v === "" ? null : v)),
  summary_en: z
    .string()
    .optional()
    .transform((v) => (v ?? "").replace(/\s+/g, " ").trim())
    .pipe(z.string().max(CATEGORY_LIMITS.summary, { error: "ইংরেজি সংক্ষিপ্ত বিবরণ সর্বোচ্চ ৪০০ অক্ষরের হতে পারে।" }))
    .transform((v) => (v === "" ? null : v)),
  description_en: z
    .string()
    .optional()
    .transform((v) => v ?? "")
    .pipe(multiline(CATEGORY_LIMITS.description, "ইংরেজি বিস্তারিত বিবরণ সর্বোচ্চ ৫০০০ অক্ষরের হতে পারে।"))
    .transform((v) => (v === "" ? null : v)),
});
export type CategoryFields = z.output<typeof categoryFieldsSchema>;

export const categoryCreateSchema = categoryFieldsSchema.extend({ slug: slugSchema });

export type FieldErrors = Record<string, string>;

/** First message per top-level field. */
export function fieldErrorsOf(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Reads category form fields from FormData as plain strings/booleans. */
export function readCategoryForm(form: FormData) {
  const str = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : "";
  };
  return {
    slug: str("slug"),
    name_bn: str("name_bn"),
    summary: str("summary"),
    description: str("description"),
    icon: str("icon"),
    sort_order: str("sort_order") || "0",
    is_active: form.get("is_active") === "on" || form.get("is_active") === "true",
    name_en: str("name_en"),
    summary_en: str("summary_en"),
    description_en: str("description_en"),
  };
}
