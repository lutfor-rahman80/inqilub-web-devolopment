"use server";

import { revalidatePath } from "next/cache";
import { assertPermission, type Staff } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { FORM_ERROR, isUuid, type FieldErrors } from "@/lib/programs/schemas";
import { parsePress } from "@/lib/press/schemas";

/**
 * Notice (press_items: news coverage and interviews) admin actions: permission check first (content.manage), then
 * the signed-in user's client so Row-Level Security applies again.
 */

const DENIED = "এই কাজের অনুমতি আপনার নেই।";
const NOT_FOUND = "প্রতিবেদনটি খুঁজে পাওয়া যায়নি। হয়তো এটি মুছে ফেলা হয়েছে।";
const CONFLICT =
  "এর মধ্যে অন্য কেউ এই প্রতিবেদনটি পরিবর্তন করেছেন। আপনার লেখা কপি করে রাখুন, তারপর পৃষ্ঠাটি রিফ্রেশ করে আবার পরিবর্তন করুন।";
const OFFLINE = "একটি সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।";

export type PressSaveResult =
  | { ok: true; id: string; updatedAt: string; isPublished: boolean }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

async function editor(): Promise<Staff | null> {
  try {
    return await assertPermission("content.manage");
  } catch {
    return null;
  }
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function saveError(error: { code?: string; message?: string }): PressSaveResult {
  const msg = error.message ?? "";
  // Check constraints the form also validates (in case they ever differ).
  if (error.code === "23514" && msg.includes("url")) {
    return { ok: false, error: FORM_ERROR, fieldErrors: { url: "লিংকটি গ্রহণযোগ্য নয়। পুরো https:// লিংকটি দিন।" } };
  }
  if (error.code === "23503") {
    return { ok: false, error: FORM_ERROR, fieldErrors: { program_id: "নির্বাচিত কর্মসূচিটি আর নেই। অন্যটি বেছে নিন।" } };
  }
  return { ok: false, error: errorMessage(error) };
}

export async function createPress(raw: unknown): Promise<PressSaveResult> {
  const staff = await editor();
  if (!staff) return { ok: false, error: DENIED };
  const parsed = parsePress(asRecord(raw));
  if (!parsed.ok) return { ok: false, error: FORM_ERROR, fieldErrors: parsed.fieldErrors };
  try {
    const db = await createClient();
    const { data, error } = await db
      .from("press_items")
      .insert({ ...parsed.data, created_by: staff.id })
      .select("id, updated_at, is_published")
      .single();
    if (error) return saveError(error);
    revalidatePath("/", "layout");
    return { ok: true, id: data.id, updatedAt: data.updated_at, isPublished: data.is_published };
  } catch (err) {
    console.error("[press] create:", err instanceof Error ? err.message : err);
    return { ok: false, error: OFFLINE };
  }
}

/** Edit an item; refuses to overwrite a newer change made by someone else. */
export async function updatePress(id: unknown, raw: unknown, expectedUpdatedAt: unknown): Promise<PressSaveResult> {
  if (!(await editor())) return { ok: false, error: DENIED };
  if (!isUuid(id)) return { ok: false, error: NOT_FOUND };
  const parsed = parsePress(asRecord(raw));
  if (!parsed.ok) return { ok: false, error: FORM_ERROR, fieldErrors: parsed.fieldErrors };
  try {
    const db = await createClient();
    let query = db.from("press_items").update(parsed.data).eq("id", id);
    if (typeof expectedUpdatedAt === "string" && expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);
    const { data, error } = await query.select("id, updated_at, is_published");
    if (error) return saveError(error);
    if (!data || data.length === 0) {
      const { data: exists } = await db.from("press_items").select("id").eq("id", id).maybeSingle();
      return { ok: false, error: exists ? CONFLICT : NOT_FOUND };
    }
    revalidatePath("/", "layout");
    return { ok: true, id: data[0].id, updatedAt: data[0].updated_at, isPublished: data[0].is_published };
  } catch (err) {
    console.error("[press] update:", err instanceof Error ? err.message : err);
    return { ok: false, error: OFFLINE };
  }
}

export async function deletePress(id: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await editor())) return { ok: false, error: DENIED };
  if (!isUuid(id)) return { ok: false, error: NOT_FOUND };
  try {
    const db = await createClient();
    const { data, error } = await db.from("press_items").delete().eq("id", id).select("id");
    if (error) return { ok: false, error: errorMessage(error) };
    if (!data || data.length === 0) return { ok: false, error: NOT_FOUND };
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error("[press] delete:", err instanceof Error ? err.message : err);
    return { ok: false, error: OFFLINE };
  }
}
