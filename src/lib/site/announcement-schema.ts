import { z } from "zod";
import { bn } from "@/lib/format";
import { multiLine, oneLine } from "@/lib/admin/text";

/**
 * Announcement (ঘোষণা) admin validation — mirrors the table constraints:
 * Bengali title 2–200 characters (required), body ≤ 20000; optional English
 * title (2–200) and body (≤ 20000). Empty English → null, so English pages
 * show the Bengali text (marked lang="bn"). Pure; messages are Bengali (the
 * admin panel is Bengali-only).
 */

export const ANNOUNCEMENT_LIMITS = { titleMin: 2, titleMax: 200, bodyMax: 20000 } as const;

export type AnnouncementValues = {
  title: string;
  body: string;
  title_en: string;
  body_en: string;
  is_published: boolean;
  is_pinned: boolean;
};

export type AnnouncementData = {
  title: string;
  body: string;
  title_en: string | null;
  body_en: string | null;
  is_published: boolean;
  is_pinned: boolean;
};

export type AnnouncementFieldErrors = Partial<Record<keyof AnnouncementValues | "form", string>>;
export type AnnouncementParsed = { ok: true; data: AnnouncementData } | { ok: false; fieldErrors: AnnouncementFieldErrors };

const L = ANNOUNCEMENT_LIMITS;

const schema = z
  .object({
    title: z
      .string()
      .min(L.titleMin, { error: `শিরোনাম লিখুন (কমপক্ষে ${bn(L.titleMin)} অক্ষর)।` })
      .max(L.titleMax, { error: `শিরোনাম সর্বোচ্চ ${bn(L.titleMax)} অক্ষরের হতে পারে।` }),
    body: z.string().max(L.bodyMax, { error: `বিস্তারিত সর্বোচ্চ ${bn(L.bodyMax)} অক্ষরের হতে পারে।` }),
    title_en: z.string().refine((v) => v === "" || (v.length >= L.titleMin && v.length <= L.titleMax), {
      error: `ইংরেজি শিরোনাম ${bn(L.titleMin)}–${bn(L.titleMax)} অক্ষরের হতে হবে (অথবা খালি রাখুন)।`,
    }),
    body_en: z.string().max(L.bodyMax, { error: `ইংরেজি বিস্তারিত সর্বোচ্চ ${bn(L.bodyMax)} অক্ষরের হতে পারে।` }),
    is_published: z.boolean(),
    is_pinned: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.body_en && !v.title_en) {
      ctx.addIssue({ code: "custom", path: ["title_en"], message: "ইংরেজি বিস্তারিত দিলে ইংরেজি শিরোনামও লিখুন।" });
    }
  });

const str = (v: unknown) => (typeof v === "string" ? v : "");
const bool = (v: unknown) => v === true || v === "on" || v === "true" || v === "1";

export function parseAnnouncementForm(raw: Record<string, unknown>): AnnouncementParsed {
  const result = schema.safeParse({
    title: oneLine(str(raw.title)),
    body: multiLine(str(raw.body)),
    title_en: oneLine(str(raw.title_en)),
    body_en: multiLine(str(raw.body_en)),
    is_published: bool(raw.is_published),
    is_pinned: bool(raw.is_pinned),
  });
  if (!result.success) {
    const fieldErrors: AnnouncementFieldErrors = {};
    for (const issue of result.error.issues) {
      const key = (issue.path[0] as keyof AnnouncementValues | undefined) ?? "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors };
  }
  const d = result.data;
  return {
    ok: true,
    data: {
      title: d.title,
      body: d.body,
      title_en: d.title_en || null,
      body_en: d.body_en || null,
      is_published: d.is_published,
      is_pinned: d.is_pinned,
    },
  };
}
