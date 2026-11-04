import { z } from "zod";
import { bn, toAsciiDigits } from "@/lib/format";
import { PROGRAM_SLUG_MAX, PROGRAM_SLUG_RE } from "./filters";

/**
 * Server-side validation for the program (কর্মসূচি) admin form. Pure (no
 * server-only imports) so the browser can show the same rules and the unit
 * tests can run it. Limits mirror the database constraints.
 */

export const PROGRAM_LIMITS = {
  title: 200,
  summary: 500,
  body: 20000,
  location: 200,
  sortMin: -100000,
  sortMax: 100000,
} as const;

export type FieldErrors = Record<string, string>;
export type Parsed<T> = { ok: true; data: T } | { ok: false; fieldErrors: FieldErrors };

export const FORM_ERROR = "ফর্মের কিছু তথ্য সঠিক নয়। চিহ্নিত ঘরগুলো ঠিক করে আবার চেষ্টা করুন।";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

const str = (v: unknown) => (typeof v === "string" ? v : "");
const bool = (v: unknown) => v === true || v === "on" || v === "true" || v === "1";

/** Single line: whitespace collapsed and trimmed. */
export const oneLine = (v: unknown) => str(v).replace(/\s+/g, " ").trim();
/** Multi-line: CRLF → LF, trailing spaces removed, 3+ blank lines → one blank line. */
export const multiLine = (v: unknown) =>
  str(v)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/** A real calendar date YYYY-MM-DD between 2000-01-02 and 2100-12-31. */
export function isProgramDate(value: string): boolean {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return false;
  return value > "2000-01-01" && value <= "2100-12-31";
}

const max = (label: string, n: number) => ({ error: `${label} সর্বোচ্চ ${bn(n)} অক্ষরের হতে পারে।` });
const optional = (label: string, n: number) =>
  z
    .string()
    .max(n, max(label, n))
    .transform((v) => (v === "" ? null : v));

export const programSchema = z
  .object({
    category_id: z.string().refine(isUuid, { error: "কার্যক্রমের ক্ষেত্র (ক্যাটাগরি) নির্বাচন করুন।" }),
    slug: z
      .string()
      .min(3, { error: "স্লাগ লিখুন (কমপক্ষে ৩ অক্ষর)।" })
      .max(PROGRAM_SLUG_MAX, max("স্লাগ", PROGRAM_SLUG_MAX))
      .regex(PROGRAM_SLUG_RE, {
        error: "শুধু ছোট হাতের ইংরেজি অক্ষর (a-z), সংখ্যা (0-9) ও হাইফেন (-) ব্যবহার করুন; শুরু/শেষে বা পরপর দুটি হাইফেন নয়।",
      }),
    title_bn: z
      .string()
      .min(2, { error: "বাংলা শিরোনাম লিখুন (কমপক্ষে ২ অক্ষর)।" })
      .max(PROGRAM_LIMITS.title, max("শিরোনাম", PROGRAM_LIMITS.title)),
    title_en: z
      .string()
      .max(PROGRAM_LIMITS.title, max("ইংরেজি শিরোনাম", PROGRAM_LIMITS.title))
      .refine((v) => v === "" || v.length >= 2, { error: "ইংরেজি শিরোনাম কমপক্ষে ২ অক্ষরের হতে হবে (না থাকলে ফাঁকা রাখুন)।" })
      .transform((v) => (v === "" ? null : v)),
    summary_bn: z.string().max(PROGRAM_LIMITS.summary, max("সংক্ষিপ্ত বিবরণ", PROGRAM_LIMITS.summary)),
    summary_en: optional("ইংরেজি সংক্ষিপ্ত বিবরণ", PROGRAM_LIMITS.summary),
    body_bn: z.string().max(PROGRAM_LIMITS.body, max("বিস্তারিত বিবরণ", PROGRAM_LIMITS.body)),
    body_en: optional("ইংরেজি বিস্তারিত বিবরণ", PROGRAM_LIMITS.body),
    location_bn: optional("স্থান", PROGRAM_LIMITS.location),
    location_en: optional("ইংরেজি স্থান", PROGRAM_LIMITS.location),
    starts_on: z.string().refine(isProgramDate, { error: "শুরুর তারিখ দিন (সঠিক তারিখ)।" }),
    ends_on: z
      .string()
      .refine((v) => v === "" || isProgramDate(v), { error: "সঠিক শেষের তারিখ দিন, অথবা ফাঁকা রাখুন।" })
      .transform((v) => (v === "" ? null : v)),
    status_override: z
      .enum(["", "postponed", "cancelled"], { error: "সঠিক অবস্থা নির্বাচন করুন।" })
      .transform((v) => (v === "" ? null : v)),
    cover_image_id: z
      .string()
      .refine((v) => v === "" || isUuid(v), { error: "সঠিক প্রচ্ছদ ছবি নির্বাচন করুন।" })
      .transform((v) => (v === "" ? null : v)),
    is_published: z.boolean(),
    sort_order: z
      .string()
      .refine((v) => /^-?\d{1,7}$/.test(v), { error: "ক্রম একটি পূর্ণ সংখ্যা হতে হবে।" })
      .transform(Number)
      .refine((n) => n >= PROGRAM_LIMITS.sortMin && n <= PROGRAM_LIMITS.sortMax, {
        error: "ক্রম −১০০০০০ থেকে ১০০০০০ এর মধ্যে হতে হবে।",
      }),
  })
  .superRefine((v, ctx) => {
    if (v.ends_on && v.starts_on && isProgramDate(v.starts_on) && v.ends_on < v.starts_on) {
      ctx.addIssue({ code: "custom", path: ["ends_on"], message: "শেষের তারিখ শুরুর তারিখের আগে হতে পারে না।" });
    }
  });

export type ProgramInput = z.output<typeof programSchema>;

/** Raw form values (strings/booleans from the browser or FormData) → clean row or Bengali field errors. */
export function parseProgram(raw: Record<string, unknown>): Parsed<ProgramInput> {
  const result = programSchema.safeParse({
    category_id: oneLine(raw.category_id),
    slug: oneLine(raw.slug).toLowerCase(),
    title_bn: oneLine(raw.title_bn),
    title_en: oneLine(raw.title_en),
    summary_bn: multiLine(raw.summary_bn),
    summary_en: multiLine(raw.summary_en),
    body_bn: multiLine(raw.body_bn),
    body_en: multiLine(raw.body_en),
    location_bn: oneLine(raw.location_bn),
    location_en: oneLine(raw.location_en),
    starts_on: toAsciiDigits(oneLine(raw.starts_on)),
    ends_on: toAsciiDigits(oneLine(raw.ends_on)),
    status_override: oneLine(raw.status_override),
    cover_image_id: oneLine(raw.cover_image_id),
    is_published: bool(raw.is_published),
    sort_order: toAsciiDigits(oneLine(raw.sort_order) || "0"),
  });
  if (result.success) return { ok: true, data: result.data };
  const fieldErrors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { ok: false, fieldErrors };
}

/** Image ids for link/unlink (1–100 distinct UUIDs). */
export function parseIdList(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) return null;
  if (!value.every(isUuid)) return null;
  return [...new Set(value.map((v) => v.toLowerCase()))];
}
