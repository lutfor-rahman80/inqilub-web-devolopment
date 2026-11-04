"use server";

import { revalidatePath } from "next/cache";
import { errorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { DENIED, staffWith } from "@/lib/admin/guard";
import { FORM_ERROR } from "@/lib/admin/schemas";
import { isUuid } from "@/lib/admin/text";
import { isFaqDirection, parseFaq, type FaqFieldErrors } from "@/lib/faq/schemas";

/**
 * FAQ (প্রশ্নোত্তর) admin actions: the permission check comes first
 * (content.manage), then the signed-in user's client does the work, so
 * Row-Level Security and the move_faq() permission check apply again.
 */

const NOT_FOUND = "প্রশ্নটি খুঁজে পাওয়া যায়নি। হয়তো এটি মুছে ফেলা হয়েছে।";
const CONFLICT =
  "এর মধ্যে অন্য কেউ এই প্রশ্নটি পরিবর্তন করেছেন। আপনার লেখা কপি করে রাখুন, তারপর পৃষ্ঠাটি রিফ্রেশ করে আবার পরিবর্তন করুন।";
const OFFLINE = "একটি সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।";

export type FaqSaveResult =
  | { ok: true; id: string; updatedAt: string; isPublished: boolean }
  | { ok: false; error: string; fieldErrors?: FaqFieldErrors };
export type FaqSimpleResult = { ok: true } | { ok: false; error: string };

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function logError(what: string, err: unknown) {
  console.error(`[faq] ${what}:`, err instanceof Error ? err.message : err);
}

/** New entry, added at the end of the list (content.manage; RLS checks it again). */
export async function createFaq(raw: unknown): Promise<FaqSaveResult> {
  if (!(await staffWith("content.manage"))) return { ok: false, error: DENIED };
  const parsed = parseFaq(asRecord(raw));
  if (!parsed.ok) return { ok: false, error: FORM_ERROR, fieldErrors: parsed.fieldErrors };
  try {
    const db = await createClient();
    const { data: last, error: lastError } = await db
      .from("faqs")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastError) return { ok: false, error: errorMessage(lastError) };
    const sortOrder = Math.min((last?.sort_order ?? 0) + 10, 2_000_000_000);
    const { data, error } = await db
      .from("faqs")
      .insert({ ...parsed.data, sort_order: sortOrder })
      .select("id, updated_at, is_published")
      .single();
    if (error) return { ok: false, error: errorMessage(error) };
    revalidatePath("/", "layout");
    return { ok: true, id: data.id, updatedAt: data.updated_at, isPublished: data.is_published };
  } catch (err) {
    logError("create", err);
    return { ok: false, error: OFFLINE };
  }
}

/** Edit an entry; refuses to overwrite a newer change made by someone else. */
export async function updateFaq(id: unknown, raw: unknown, expectedUpdatedAt: unknown): Promise<FaqSaveResult> {
  if (!(await staffWith("content.manage"))) return { ok: false, error: DENIED };
  if (!isUuid(id)) return { ok: false, error: NOT_FOUND };
  const parsed = parseFaq(asRecord(raw));
  if (!parsed.ok) return { ok: false, error: FORM_ERROR, fieldErrors: parsed.fieldErrors };
  try {
    const db = await createClient();
    let query = db.from("faqs").update(parsed.data).eq("id", id);
    if (typeof expectedUpdatedAt === "string" && expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);
    const { data, error } = await query.select("id, updated_at, is_published");
    if (error) return { ok: false, error: errorMessage(error) };
    if (!data || data.length === 0) {
      const { data: exists } = await db.from("faqs").select("id").eq("id", id).maybeSingle();
      return { ok: false, error: exists ? CONFLICT : NOT_FOUND };
    }
    revalidatePath("/", "layout");
    return { ok: true, id: data[0].id, updatedAt: data[0].updated_at, isPublished: data[0].is_published };
  } catch (err) {
    logError("update", err);
    return { ok: false, error: OFFLINE };
  }
}

/** Publish or hide one entry from the list page. */
export async function setFaqPublished(id: unknown, published: unknown): Promise<FaqSimpleResult> {
  if (!(await staffWith("content.manage"))) return { ok: false, error: DENIED };
  if (!isUuid(id) || typeof published !== "boolean") return { ok: false, error: NOT_FOUND };
  try {
    const db = await createClient();
    const { data, error } = await db.from("faqs").update({ is_published: published }).eq("id", id).select("id");
    if (error) return { ok: false, error: errorMessage(error) };
    if (!data || data.length === 0) return { ok: false, error: NOT_FOUND };
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    logError("publish", err);
    return { ok: false, error: OFFLINE };
  }
}

/** Move one entry a place up or down (atomic, in the database: public.move_faq). */
export async function moveFaq(id: unknown, direction: unknown): Promise<FaqSimpleResult> {
  if (!(await staffWith("content.manage"))) return { ok: false, error: DENIED };
  if (!isUuid(id) || !isFaqDirection(direction)) return { ok: false, error: NOT_FOUND };
  try {
    const db = await createClient();
    const { error } = await db.rpc("move_faq", { p_id: id, p_direction: direction });
    if (error) return { ok: false, error: error.message.includes("NOT_FOUND") ? NOT_FOUND : errorMessage(error) };
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    logError("move", err);
    return { ok: false, error: OFFLINE };
  }
}

/** Permanently delete an entry. */
export async function deleteFaq(id: unknown): Promise<FaqSimpleResult> {
  if (!(await staffWith("content.manage"))) return { ok: false, error: DENIED };
  if (!isUuid(id)) return { ok: false, error: NOT_FOUND };
  try {
    const db = await createClient();
    const { data, error } = await db.from("faqs").delete().eq("id", id).select("id");
    if (error) return { ok: false, error: errorMessage(error) };
    if (!data || data.length === 0) return { ok: false, error: NOT_FOUND };
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    logError("delete", err);
    return { ok: false, error: OFFLINE };
  }
}
