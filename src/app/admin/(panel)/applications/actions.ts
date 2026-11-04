"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { errorMessage, type ActionResult } from "@/lib/errors";
import { notifyApplicant } from "@/lib/email";
import { DENIED, staffWith } from "@/lib/membership/admin-guard";
import { cleanMultiline } from "@/lib/membership/normalize";

const idSchema = z.uuid();
const NOT_FOUND = "আবেদনটি খুঁজে পাওয়া যায়নি।";

function note(value: unknown): string {
  return typeof value === "string" ? cleanMultiline(value.slice(0, 5000)) : "";
}

/** Mark a pending application as "under review". */
export async function startReview(applicationId: string): Promise<ActionResult> {
  if (!(await staffWith("applications.review"))) return { ok: false, error: DENIED };
  const id = idSchema.safeParse(applicationId);
  if (!id.success) return { ok: false, error: NOT_FOUND };

  const supabase = await createClient();
  const { error } = await supabase.rpc("start_application_review", { p_application_id: id.data });
  if (error) return { ok: false, error: errorMessage(error) };
  revalidatePath("/admin/applications", "layout");
  return { ok: true };
}

const approveSchema = z.object({
  designationId: z.number().int().positive({ error: "সঠিক পদবী নির্বাচন করুন।" }),
  note: z.string().max(1000, { error: "মন্তব্য সর্বোচ্চ ১০০০ অক্ষরের হতে পারে।" }),
  showInDirectory: z.boolean(),
});

export type ApproveInput = { designationId: number; note: string; showInDirectory: boolean };

/**
 * Approve: one database transaction creates the member record with the next
 * member number (approve_application checks applications.review itself).
 */
export async function approveApplication(
  applicationId: string,
  input: ApproveInput,
): Promise<ActionResult<{ memberId: string; memberNo: string }>> {
  if (!(await staffWith("applications.review"))) return { ok: false, error: DENIED };
  const id = idSchema.safeParse(applicationId);
  if (!id.success) return { ok: false, error: NOT_FOUND };
  const parsed = approveSchema.safeParse({
    designationId: Number(input?.designationId),
    note: note(input?.note),
    showInDirectory: input?.showInDirectory === true,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "তথ্য সঠিক নয়।", fieldErrors: { [String(issue?.path[0] ?? "form")]: issue?.message ?? "" } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("approve_application", {
    p_application_id: id.data,
    p_designation_id: parsed.data.designationId,
    p_note: parsed.data.note || undefined,
    p_show_in_directory: parsed.data.showInDirectory,
  });
  const row = data?.[0];
  if (error || !row) return { ok: false, error: error ? errorMessage(error) : NOT_FOUND };

  after(() => notifyApplicant(id.data, "application_approved"));
  revalidatePath("/", "layout");
  return { ok: true, data: { memberId: row.member_id, memberNo: row.member_no } };
}

/** Reject with a reason (required; also enforced by the database function). */
export async function rejectApplication(applicationId: string, reason: string): Promise<ActionResult> {
  if (!(await staffWith("applications.review"))) return { ok: false, error: DENIED };
  const id = idSchema.safeParse(applicationId);
  if (!id.success) return { ok: false, error: NOT_FOUND };
  const text = note(reason);
  if (text.length < 3) return { ok: false, error: "প্রত্যাখ্যানের কারণ লিখুন (কমপক্ষে ৩ অক্ষর)।", fieldErrors: { reason: "প্রত্যাখ্যানের কারণ লিখুন (কমপক্ষে ৩ অক্ষর)।" } };
  if (text.length > 1000) return { ok: false, error: "কারণ সর্বোচ্চ ১০০০ অক্ষরের হতে পারে।", fieldErrors: { reason: "কারণ সর্বোচ্চ ১০০০ অক্ষরের হতে পারে।" } };

  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_application", { p_application_id: id.data, p_note: text });
  if (error) return { ok: false, error: errorMessage(error) };

  after(() => notifyApplicant(id.data, "application_rejected"));
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Re-open a rejected application (back to "under review"). */
export async function reopenApplication(applicationId: string, reason: string): Promise<ActionResult> {
  if (!(await staffWith("applications.review"))) return { ok: false, error: DENIED };
  const id = idSchema.safeParse(applicationId);
  if (!id.success) return { ok: false, error: NOT_FOUND };
  const text = note(reason);
  if (text.length > 1000) return { ok: false, error: "মন্তব্য সর্বোচ্চ ১০০০ অক্ষরের হতে পারে।" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("reopen_application", { p_application_id: id.data, p_note: text });
  if (error) return { ok: false, error: errorMessage(error) };
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Permanently delete an application (applications.delete). Approved
 * applications are never deleted here: the member record depends on them.
 */
export async function deleteApplication(applicationId: string): Promise<ActionResult> {
  if (!(await staffWith("applications.delete"))) return { ok: false, error: DENIED };
  const id = idSchema.safeParse(applicationId);
  if (!id.success) return { ok: false, error: NOT_FOUND };

  const supabase = await createClient();
  // The status filter is part of the DELETE itself, so a concurrent approval cannot slip through.
  const { data, error } = await supabase
    .from("membership_applications")
    .delete()
    .eq("id", id.data)
    .neq("status", "approved")
    .select("id");
  if (error) return { ok: false, error: errorMessage(error) };
  if (!data || data.length === 0) {
    return { ok: false, error: "আবেদনটি মুছে ফেলা যায়নি। অনুমোদিত আবেদন মুছে ফেলা যায় না, অথবা এটি আগেই মুছে ফেলা হয়েছে।" };
  }
  revalidatePath("/admin/applications", "layout");
  redirect("/admin/applications?deleted=1");
}
