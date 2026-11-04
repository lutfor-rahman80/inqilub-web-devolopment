"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { errorMessage } from "@/lib/errors";
import { DENIED, staffWith } from "@/lib/admin/guard";
import { FORM_ERROR } from "@/lib/admin/schemas";
import { isUuid } from "@/lib/admin/text";
import { parseAnnouncementForm, type AnnouncementFieldErrors } from "@/lib/site/announcement-schema";

export type AnnouncementResult =
  | { ok: true; id: string; updatedAt: string; isPublished: boolean }
  | { ok: false; error: string; fieldErrors?: AnnouncementFieldErrors };

const NOT_FOUND = "ঘোষণাটি খুঁজে পাওয়া যায়নি। হয়তো এটি মুছে ফেলা হয়েছে।";
const CONFLICT =
  "এর মধ্যে অন্য কেউ এই ঘোষণাটি পরিবর্তন করেছেন। আপনার লেখা কপি করে রাখুন, তারপর পৃষ্ঠাটি রিফ্রেশ করে আবার পরিবর্তন করুন।";

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/** New announcement with optional English title/body (content.manage; RLS checks it again). */
export async function createAnnouncement(raw: unknown): Promise<AnnouncementResult> {
  const staff = await staffWith("content.manage");
  if (!staff) return { ok: false, error: DENIED };
  const parsed = parseAnnouncementForm(asRecord(raw));
  if (!parsed.ok) return { ok: false, error: FORM_ERROR, fieldErrors: parsed.fieldErrors };

  const db = await createClient();
  const { data, error } = await db
    .from("announcements")
    .insert({ ...parsed.data, created_by: staff.id })
    .select("id, updated_at, is_published")
    .single();
  if (error) return { ok: false, error: errorMessage(error) };
  revalidatePath("/", "layout");
  return { ok: true, id: data.id, updatedAt: data.updated_at, isPublished: data.is_published };
}

/** Edit an announcement; refuses to overwrite a newer change made by someone else. */
export async function updateAnnouncement(id: unknown, raw: unknown, expectedUpdatedAt: unknown): Promise<AnnouncementResult> {
  if (!(await staffWith("content.manage"))) return { ok: false, error: DENIED };
  if (!isUuid(id)) return { ok: false, error: NOT_FOUND };
  const parsed = parseAnnouncementForm(asRecord(raw));
  if (!parsed.ok) return { ok: false, error: FORM_ERROR, fieldErrors: parsed.fieldErrors };

  const db = await createClient();
  let query = db.from("announcements").update(parsed.data).eq("id", id);
  if (typeof expectedUpdatedAt === "string" && expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);
  const { data, error } = await query.select("id, updated_at, is_published");
  if (error) return { ok: false, error: errorMessage(error) };
  if (!data || data.length === 0) {
    const { data: exists } = await db.from("announcements").select("id").eq("id", id).maybeSingle();
    return { ok: false, error: exists ? CONFLICT : NOT_FOUND };
  }
  revalidatePath("/", "layout");
  return { ok: true, id: data[0].id, updatedAt: data[0].updated_at, isPublished: data[0].is_published };
}

/** Permanently delete an announcement. */
export async function deleteAnnouncement(id: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await staffWith("content.manage"))) return { ok: false, error: DENIED };
  if (!isUuid(id)) return { ok: false, error: NOT_FOUND };
  const db = await createClient();
  const { data, error } = await db.from("announcements").delete().eq("id", id).select("id");
  if (error) return { ok: false, error: errorMessage(error) };
  if (!data || data.length === 0) return { ok: false, error: NOT_FOUND };
  revalidatePath("/", "layout");
  return { ok: true };
}
