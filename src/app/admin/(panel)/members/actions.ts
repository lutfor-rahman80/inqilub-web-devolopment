"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { errorMessage, type ActionResult } from "@/lib/errors";
import { MEMBERS_BUCKET } from "@/lib/storage";
import { DENIED, staffWith } from "@/lib/membership/admin-guard";
import { isPubliclyListed } from "@/lib/membership/display";
import {
  parseMemberCreate,
  parseMemberUpdate,
  readMemberForm,
  type MemberFieldErrors,
  type MemberStatusValue,
} from "@/lib/membership/member-schema";

/** The saved record as the edit form shows it (normalised by the server). */
export type SavedMemberValues = {
  full_name: string;
  designation_id: number;
  status: MemberStatusValue;
  mobile: string;
  email: string;
  blood_group: string;
  joined_on: string;
  date_of_birth: string;
  sort_order: number;
  notes: string;
  directory_consent: boolean;
  show_in_directory: boolean;
  public_phone_consent: boolean;
  public_phone: string;
  guardian_consent: boolean;
};

export type MemberFormResult =
  | { ok: true; id: string; updatedAt: string; saved?: SavedMemberValues; warning?: string }
  | { ok: false; error: string; fieldErrors?: MemberFieldErrors };

const idSchema = z.uuid();
const FORM_ERROR = "ফর্মের কিছু তথ্য সঠিক নয়। চিহ্নিত ঘরগুলো ঠিক করুন।";
const NOT_FOUND = "সদস্য রেকর্ডটি খুঁজে পাওয়া যায়নি।";
const CONFLICT = "এর মধ্যে অন্য কেউ এই সদস্য রেকর্ড পরিবর্তন করেছেন। পৃষ্ঠাটি রিফ্রেশ করে আবার পরিবর্তন করুন।";
// Photos are uploaded by the browser to members/photos/<uuid>.<ext>.
const PHOTO_PATH = /^photos\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg)$/;
const SAVED_COLUMNS =
  "id, updated_at, full_name, designation_id, status, mobile, email, blood_group, joined_on, date_of_birth, sort_order, notes, directory_consent, show_in_directory, public_phone_consent, public_phone, guardian_consent";

function dbFieldError(error: { code?: string; message?: string }): MemberFormResult | null {
  const msg = error.message ?? "";
  if (error.code === "23503" || msg.includes("designation")) {
    return { ok: false, error: FORM_ERROR, fieldErrors: { designation_id: "সঠিক পদবী নির্বাচন করুন।" } };
  }
  if (msg.includes("members_directory_requires_consent")) {
    return { ok: false, error: FORM_ERROR, fieldErrors: { show_in_directory: "সদস্যের সম্মতি ছাড়া সদস্য তালিকায় প্রকাশ করা যাবে না।" } };
  }
  if (msg.includes("members_phone_requires_consent")) {
    return { ok: false, error: FORM_ERROR, fieldErrors: { public_phone: "সদস্যের সম্মতি ছাড়া ফোন নম্বর প্রকাশ করা যাবে না।" } };
  }
  if (msg.includes("date_of_birth")) {
    return { ok: false, error: FORM_ERROR, fieldErrors: { date_of_birth: "সঠিক জন্ম তারিখ দিন (১৯২০ সালের পরের)।" } };
  }
  if (error.code === "23505" && msg.includes("member_no")) {
    return { ok: false, error: FORM_ERROR, fieldErrors: { member_no: "এই সদস্য নম্বর ইতিমধ্যে অন্য সদস্যের।" } };
  }
  return null;
}

/** New unguessable object name for a photo (same extension). */
function freshPhotoPath(oldPath: string): string {
  const ext = oldPath.endsWith(".jpg") ? "jpg" : "webp";
  return `photos/${randomUUID()}.${ext}`;
}

/**
 * Edit a member record (members.manage; RLS and column grants enforce it again).
 *
 * Privacy: the members bucket is public-read and a listed member's photo URL
 * has been in the public directory HTML. When a member stops being listed
 * (consent withdrawn, hidden, made inactive or archived, or — under 18 — the
 * guardian consent removed or a date of birth entered) the photo is moved to
 * a new random name in the same update, so the URL that was published stops
 * working. The photo itself is kept for the admin panel.
 */
export async function updateMember(memberId: string, form: FormData): Promise<MemberFormResult> {
  if (!(await staffWith("members.manage"))) return { ok: false, error: DENIED };
  const id = idSchema.safeParse(memberId);
  if (!id.success) return { ok: false, error: NOT_FOUND };

  const parsed = parseMemberUpdate(readMemberForm(form));
  if (!parsed.ok) return { ok: false, error: FORM_ERROR, fieldErrors: parsed.fieldErrors };
  const expectedRaw = form.get("updated_at");
  const expected = typeof expectedRaw === "string" && expectedRaw ? expectedRaw : null;

  const supabase = await createClient();
  // The record as the editor last saw it (optimistic locking: refuse to
  // overwrite someone else's newer change).
  let beforeQuery = supabase
    .from("members")
    .select("photo_path, status, show_in_directory, directory_consent, date_of_birth, guardian_consent")
    .eq("id", id.data);
  if (expected) beforeQuery = beforeQuery.eq("updated_at", expected);
  const { data: before, error: beforeError } = await beforeQuery.maybeSingle();
  if (beforeError) return { ok: false, error: errorMessage(beforeError) };
  if (!before) {
    const { data: exists } = await supabase.from("members").select("id").eq("id", id.data).maybeSingle();
    return { ok: false, error: exists ? CONFLICT : NOT_FOUND };
  }

  const storage = supabase.storage.from(MEMBERS_BUCKET);
  let movedTo: string | null = null;
  let warning: string | undefined;
  if (before.photo_path && isPubliclyListed(before) && !isPubliclyListed(parsed.data)) {
    const target = freshPhotoPath(before.photo_path);
    const { error: mvError } = await storage.move(before.photo_path, target);
    if (mvError) {
      console.error("member photo not rotated", before.photo_path, mvError.message);
      warning = "সদস্যকে তালিকা থেকে সরানো হয়েছে, তবে আগে প্রকাশিত ছবির লিংকটি বন্ধ করা যায়নি। ছবিটি একবার সরিয়ে আবার যুক্ত করুন।";
    } else {
      movedTo = target;
    }
  }

  let query = supabase
    .from("members")
    .update(movedTo ? { ...parsed.data, photo_path: movedTo } : parsed.data)
    .eq("id", id.data);
  if (expected) query = query.eq("updated_at", expected);
  if (movedTo) query = query.eq("photo_path", before.photo_path!);
  const { data, error } = await query.select(SAVED_COLUMNS);

  if (error || !data || data.length === 0) {
    // Nothing was saved: put the photo back where the record points.
    if (movedTo) {
      const { error: backError } = await storage.move(movedTo, before.photo_path!);
      if (backError) console.error("member photo not moved back", movedTo, backError.message);
    }
    if (error) return dbFieldError(error) ?? { ok: false, error: errorMessage(error) };
    const { data: exists } = await supabase.from("members").select("id").eq("id", id.data).maybeSingle();
    return { ok: false, error: exists ? CONFLICT : NOT_FOUND };
  }

  revalidatePath("/", "layout");
  const m = data[0];
  return {
    ok: true,
    id: m.id,
    updatedAt: m.updated_at,
    warning,
    saved: {
      full_name: m.full_name,
      designation_id: m.designation_id,
      status: m.status as MemberStatusValue,
      mobile: m.mobile ?? "",
      email: m.email ?? "",
      blood_group: m.blood_group ?? "",
      joined_on: m.joined_on,
      date_of_birth: m.date_of_birth ?? "",
      sort_order: m.sort_order,
      notes: m.notes ?? "",
      directory_consent: m.directory_consent,
      show_in_directory: m.show_in_directory,
      public_phone_consent: m.public_phone_consent,
      public_phone: m.public_phone ?? "",
      guardian_consent: m.guardian_consent,
    },
  };
}

/** Add an existing (paper-form) member. Blank member number → next automatic number. */
export async function createMember(form: FormData): Promise<MemberFormResult> {
  if (!(await staffWith("members.manage"))) return { ok: false, error: DENIED };
  const parsed = parseMemberCreate(readMemberForm(form));
  if (!parsed.ok) return { ok: false, error: FORM_ERROR, fieldErrors: parsed.fieldErrors };

  const supabase = await createClient();
  const { member_no, ...rest } = parsed.data;
  if (member_no) {
    const { data: taken } = await supabase.from("members").select("id").eq("member_no", member_no).maybeSingle();
    if (taken) return { ok: false, error: FORM_ERROR, fieldErrors: { member_no: "এই সদস্য নম্বর ইতিমধ্যে অন্য সদস্যের।" } };
  }
  const { data, error } = await supabase
    .from("members")
    .insert({ ...rest, member_no: member_no ?? "" })
    .select("id, updated_at")
    .single();
  if (error || !data) return error ? dbFieldError(error) ?? { ok: false, error: errorMessage(error) } : { ok: false, error: NOT_FOUND };
  revalidatePath("/", "layout");
  return { ok: true, id: data.id, updatedAt: data.updated_at };
}

/**
 * Point a member at a photo the browser just uploaded (storage RLS already
 * required members.manage for the upload) and delete the previous photo.
 */
export async function setMemberPhoto(memberId: string, path: string): Promise<ActionResult<{ updatedAt: string }>> {
  if (!(await staffWith("members.manage"))) return { ok: false, error: DENIED };
  const id = idSchema.safeParse(memberId);
  if (!id.success) return { ok: false, error: NOT_FOUND };
  if (typeof path !== "string" || !PHOTO_PATH.test(path)) return { ok: false, error: "ছবির ঠিকানা সঠিক নয়।" };

  const supabase = await createClient();
  const storage = supabase.storage.from(MEMBERS_BUCKET);
  const { data: exists } = await storage.exists(path);
  if (!exists) return { ok: false, error: "আপলোড করা ছবিটি খুঁজে পাওয়া যায়নি। আবার আপলোড করুন।" };

  const { data: current } = await supabase.from("members").select("photo_path").eq("id", id.data).maybeSingle();
  if (!current) return { ok: false, error: NOT_FOUND };

  const { data, error } = await supabase.from("members").update({ photo_path: path }).eq("id", id.data).select("id, updated_at");
  if (error) return { ok: false, error: errorMessage(error) };
  if (!data || data.length === 0) return { ok: false, error: NOT_FOUND };

  if (current.photo_path && current.photo_path !== path) {
    const { error: rmError } = await storage.remove([current.photo_path]);
    if (rmError) console.error("old member photo not removed", current.photo_path, rmError.message);
  }
  revalidatePath("/", "layout");
  return { ok: true, data: { updatedAt: data[0].updated_at } };
}

/** Remove a member's photo (record + file). */
export async function removeMemberPhoto(memberId: string): Promise<ActionResult<{ updatedAt: string | null }>> {
  if (!(await staffWith("members.manage"))) return { ok: false, error: DENIED };
  const id = idSchema.safeParse(memberId);
  if (!id.success) return { ok: false, error: NOT_FOUND };

  const supabase = await createClient();
  const { data: current } = await supabase.from("members").select("photo_path").eq("id", id.data).maybeSingle();
  if (!current) return { ok: false, error: NOT_FOUND };
  if (!current.photo_path) return { ok: true, data: { updatedAt: null } };

  const { data, error } = await supabase.from("members").update({ photo_path: null }).eq("id", id.data).select("updated_at");
  if (error) return { ok: false, error: errorMessage(error) };
  if (!data || data.length === 0) return { ok: false, error: NOT_FOUND };
  const { error: rmError } = await supabase.storage.from(MEMBERS_BUCKET).remove([current.photo_path]);
  if (rmError) console.error("member photo not removed", current.photo_path, rmError.message);
  revalidatePath("/", "layout");
  return { ok: true, data: { updatedAt: data[0].updated_at } };
}
