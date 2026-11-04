import { z } from "zod";
import { bn, toAsciiDigits } from "@/lib/format";
import { safeHttpsUrl } from "@/lib/site/urls";
import { dhakaToday } from "@/lib/programs/status";
import { isProgramDate, isUuid, multiLine, oneLine, type FieldErrors, type Parsed } from "@/lib/programs/schemas";

/**
 * Press items (public section name "Notice", decision Q9): news coverage and interviews. Validation is pure so
 * the browser, the server action and the unit tests share it; limits mirror
 * the database constraints (migration 20261028000002).
 */

export const PRESS_KINDS = ["news", "interview", "video_report"] as const;
export type PressKind = (typeof PRESS_KINDS)[number];
export const isPressKind = (v: unknown): v is PressKind => typeof v === "string" && (PRESS_KINDS as readonly string[]).includes(v);

export const PRESS_LIMITS = { title: 300, outlet: 120, url: 1000, summary: 600 } as const;

/** Same rule as the database check on press_items.url. */
export const PRESS_URL_RE = /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(?::443)?(?:\/[^\s\x00-\x1f\x7f<>"']*)?$/i;

/**
 * Normalized https link to the original publication, or null: no
 * credentials/custom port, a domain name (not an IP), and characters the
 * database accepts (an apostrophe is percent-encoded).
 */
export function normalizePressUrl(value: string | null | undefined): string | null {
  const safe = safeHttpsUrl(typeof value === "string" ? value.trim() : value);
  if (!safe) return null;
  const url = safe.replace(/'/g, "%27");
  if (url.length > PRESS_LIMITS.url || !PRESS_URL_RE.test(url)) return null;
  return url;
}

const max = (label: string, n: number) => ({ error: `${label} সর্বোচ্চ ${bn(n)} অক্ষরের হতে পারে।` });

export const pressSchema = z.object({
  kind: z.enum(PRESS_KINDS, { error: "ধরন নির্বাচন করুন (সংবাদ, সাক্ষাৎকার বা ভিডিও প্রতিবেদন)।" }),
  title_bn: z
    .string()
    .min(2, { error: "বাংলা শিরোনাম লিখুন (কমপক্ষে ২ অক্ষর)।" })
    .max(PRESS_LIMITS.title, max("শিরোনাম", PRESS_LIMITS.title)),
  title_en: z
    .string()
    .max(PRESS_LIMITS.title, max("ইংরেজি শিরোনাম", PRESS_LIMITS.title))
    .refine((v) => v === "" || v.length >= 2, { error: "ইংরেজি শিরোনাম কমপক্ষে ২ অক্ষরের হতে হবে (না থাকলে ফাঁকা রাখুন)।" })
    .transform((v) => (v === "" ? null : v)),
  outlet_bn: z
    .string()
    .min(1, { error: "সংবাদমাধ্যমের নাম লিখুন (যেমন পত্রিকা বা চ্যানেলের নাম)।" })
    .max(PRESS_LIMITS.outlet, max("সংবাদমাধ্যমের নাম", PRESS_LIMITS.outlet)),
  outlet_en: z
    .string()
    .max(PRESS_LIMITS.outlet, max("ইংরেজি নাম", PRESS_LIMITS.outlet))
    .transform((v) => (v === "" ? null : v)),
  url: z
    .string()
    .min(1, { error: "মূল সংবাদ বা ভিডিওর লিংক দিন।" })
    .transform((v, ctx) => {
      const url = normalizePressUrl(v);
      if (!url) {
        ctx.addIssue({
          code: "custom",
          message: "সঠিক https:// লিংক দিন (যেমন https://www.example.com/news/123)। শুধু নিরাপদ (https) ওয়েবসাইটের লিংক গ্রহণ করা হয়।",
        });
        return z.NEVER;
      }
      return url;
    }),
  published_on: z
    .string()
    .refine(isProgramDate, { error: "প্রকাশের তারিখ দিন (সঠিক তারিখ)।" })
    .refine((v) => v <= dhakaToday(), { error: "প্রকাশের তারিখ ভবিষ্যতের হতে পারে না।" }),
  summary_bn: z
    .string()
    .max(PRESS_LIMITS.summary, max("সংক্ষিপ্ত বিবরণ", PRESS_LIMITS.summary))
    .transform((v) => (v === "" ? null : v)),
  summary_en: z
    .string()
    .max(PRESS_LIMITS.summary, max("ইংরেজি সংক্ষিপ্ত বিবরণ", PRESS_LIMITS.summary))
    .transform((v) => (v === "" ? null : v)),
  program_id: z
    .string()
    .refine((v) => v === "" || isUuid(v), { error: "সঠিক কর্মসূচি নির্বাচন করুন।" })
    .transform((v) => (v === "" ? null : v)),
  is_published: z.boolean(),
});
export type PressInput = z.output<typeof pressSchema>;

const bool = (v: unknown) => v === true || v === "on" || v === "true" || v === "1";

export function parsePress(raw: Record<string, unknown>): Parsed<PressInput> {
  const result = pressSchema.safeParse({
    kind: oneLine(raw.kind),
    title_bn: oneLine(raw.title_bn),
    title_en: oneLine(raw.title_en),
    outlet_bn: oneLine(raw.outlet_bn),
    outlet_en: oneLine(raw.outlet_en),
    url: oneLine(raw.url),
    published_on: toAsciiDigits(oneLine(raw.published_on)),
    summary_bn: multiLine(raw.summary_bn),
    summary_en: multiLine(raw.summary_en),
    program_id: oneLine(raw.program_id),
    is_published: bool(raw.is_published),
  });
  if (result.success) return { ok: true, data: result.data };
  const fieldErrors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { ok: false, fieldErrors };
}

/** ?kind=news|interview|video_report (anything else → all). */
export function parsePressKind(value: string | string[] | undefined): PressKind | null {
  const v = (Array.isArray(value) ? value[0] : value)?.trim().toLowerCase() ?? "";
  return isPressKind(v) ? v : null;
}

export const PRESS_PAGE_SIZE = 12;
