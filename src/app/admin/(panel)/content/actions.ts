"use server";

import { isDeepStrictEqual } from "node:util";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { errorMessage } from "@/lib/errors";
import { DENIED, staffWith } from "@/lib/admin/guard";
import {
  CONTENT_SECTIONS,
  FORM_ERROR,
  parseAbout,
  parseContactSettings,
  parseDirectorySettings,
  parseMembershipSettings,
  parseOrganization,
  parseSocialSettings,
  type ContentSection,
  type FieldErrors,
  type Parsed,
} from "@/lib/admin/schemas";

export type SaveContentResult =
  | { ok: true; updatedAt: string; unchanged?: boolean }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

const CONFLICT =
  "এর মধ্যে অন্য কেউ এই অংশটি পরিবর্তন করেছেন। আপনার লেখা হারাতে না চাইলে কপি করে রাখুন, তারপর পৃষ্ঠাটি রিফ্রেশ করে আবার পরিবর্তন করুন।";

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function parseSection(section: ContentSection, raw: Record<string, unknown>): Parsed<Record<string, unknown>> {
  switch (section) {
    case "organization":
      return parseOrganization(raw);
    case "about":
      return parseAbout(raw);
    case "contact":
      return parseContactSettings(raw);
    case "membership":
      return parseMembershipSettings({ is_open: raw.is_open, declaration: raw.declaration, en: raw.en });
    case "directory":
      return parseDirectorySettings({
        enabled: raw.enabled,
        committee_term_bn: raw.committee_term_bn,
        committee_term_en: raw.committee_term_en,
      });
    case "social":
      return parseSocialSettings(raw);
  }
}

/**
 * Saves one section of the website content (a `site_settings` row).
 * content.manage is checked here first; the write then runs as the signed-in
 * user, so Row-Level Security checks the same permission again. Keys the form
 * does not know about are kept (merged), and a concurrent change by someone
 * else is detected through `updated_at` instead of being silently overwritten.
 */
export async function saveContentSection(
  sectionInput: unknown,
  rawInput: unknown,
  expectedUpdatedAt: unknown,
): Promise<SaveContentResult> {
  const staff = await staffWith("content.manage");
  if (!staff) return { ok: false, error: DENIED };

  const section = CONTENT_SECTIONS.find((s) => s === sectionInput);
  if (!section) return { ok: false, error: FORM_ERROR };

  const parsed = parseSection(section, asRecord(rawInput));
  if (!parsed.ok) return { ok: false, error: FORM_ERROR, fieldErrors: parsed.fieldErrors };

  const db = await createClient();
  const { data: current, error: readError } = await db
    .from("site_settings")
    .select("value, updated_at")
    .eq("key", section)
    .maybeSingle();
  if (readError) return { ok: false, error: errorMessage(readError) };

  if (!current) {
    const { data, error } = await db
      .from("site_settings")
      .insert({ key: section, value: parsed.data as never, updated_by: staff.id })
      .select("updated_at")
      .single();
    if (error) return { ok: false, error: error.code === "23505" ? CONFLICT : errorMessage(error) };
    revalidatePath("/", "layout");
    return { ok: true, updatedAt: data.updated_at };
  }

  const expected = typeof expectedUpdatedAt === "string" && expectedUpdatedAt ? expectedUpdatedAt : current.updated_at;
  // Top-level keys the form does not know are kept; a known nested object (e.g. "en") is
  // merged one level deep so English fields another form version does not show survive too.
  const previous = asRecord(current.value);
  const value: Record<string, unknown> = { ...previous, ...parsed.data };
  const parsedEn = (parsed.data as Record<string, unknown>).en;
  if (parsedEn && typeof parsedEn === "object") value.en = { ...asRecord(previous.en), ...(parsedEn as Record<string, unknown>) };
  // Nothing changed: no write, so "last changed" and the audit log stay as they are.
  if (isDeepStrictEqual(value, current.value)) return { ok: true, updatedAt: current.updated_at, unchanged: true };
  const { data, error } = await db
    .from("site_settings")
    .update({ value: value as never, updated_by: staff.id })
    .eq("key", section)
    .eq("updated_at", expected)
    .select("updated_at");
  if (error) return { ok: false, error: errorMessage(error) };
  if (!data || data.length === 0) {
    // Nothing updated: either someone saved in between, or Row-Level
    // Security refused the write (permission removed meanwhile).
    const { data: now } = await db.from("site_settings").select("updated_at").eq("key", section).maybeSingle();
    return { ok: false, error: now && now.updated_at !== expected ? CONFLICT : DENIED };
  }

  revalidatePath("/", "layout");
  return { ok: true, updatedAt: data[0].updated_at };
}
