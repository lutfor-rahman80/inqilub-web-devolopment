"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { errorMessage, GENERIC_ERROR } from "@/lib/errors";
import { DENIED, staffWith } from "@/lib/admin/guard";
import { FORM_ERROR, parseCreateStaff, parseUpdateStaff, type FieldErrors } from "@/lib/admin/schemas";
import { generatePassword } from "@/lib/admin/password";
import { canonicalUuid } from "@/lib/admin/text";

type Fail = { ok: false; error: string; fieldErrors?: FieldErrors };

export type CreateStaffResult = { ok: true; email: string; password: string | null } | Fail;
export type UpdateStaffResult = { ok: true; warning?: string } | Fail;
export type ResetPasswordResult = { ok: true; password: string; email: string | null } | Fail;

const NOT_FOUND = "ব্যবহারকারী খুঁজে পাওয়া যায়নি।";
const SUPER_ONLY = "সুপার অ্যাডমিনের অ্যাকাউন্টে এই পরিবর্তন শুধু আরেকজন সুপার অ্যাডমিন করতে পারেন।";
const SELF_CHANGE = "নিজের ভূমিকা পরিবর্তন বা নিজের অ্যাকাউন্ট নিষ্ক্রিয় করা যায় না। প্রয়োজনে অন্য একজন ব্যবহারকারী ব্যবস্থাপক এটি করবেন।";
const BAN_FAILED = "অ্যাকাউন্টটি নিষ্ক্রিয় করা যায়নি, কারণ লগইন বন্ধ করা গেল না। কিছুক্ষণ পর আবার চেষ্টা করুন।";
// Effectively permanent; lifted again when the account is re-activated.
const BAN_DURATION = "876000h";

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/**
 * New staff account. users.manage is checked first; the Auth account is then
 * created with the secret key (the only way to create users), but the staff
 * profile — which is what grants access — is inserted with the signed-in
 * user's session, so Row-Level Security and the guard trigger (only a super
 * admin may grant super admin) apply. If that insert fails, the new Auth
 * account is deleted again.
 */
export async function createStaffUser(raw: unknown): Promise<CreateStaffResult> {
  const staff = await staffWith("users.manage");
  if (!staff) return { ok: false, error: DENIED };
  const parsed = parseCreateStaff(asRecord(raw));
  if (!parsed.ok) return { ok: false, error: FORM_ERROR, fieldErrors: parsed.fieldErrors };
  const { email, full_name, role_id, password_mode } = parsed.data;

  const db = await createClient();
  const { data: role } = await db.from("roles").select("id, key").eq("id", role_id).maybeSingle();
  if (!role) return { ok: false, error: FORM_ERROR, fieldErrors: { role_id: "একটি ভূমিকা নির্বাচন করুন।" } };
  if (role.key === "super_admin" && staff.roleKey !== "super_admin") {
    return { ok: false, error: FORM_ERROR, fieldErrors: { role_id: "সুপার অ্যাডমিন ভূমিকা শুধু একজন সুপার অ্যাডমিন দিতে পারেন।" } };
  }

  const password = password_mode === "manual" ? parsed.data.password : generatePassword(14);
  const admin = createAdminClient();
  const { data: created, error: authError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (authError || !created.user) {
    const code = authError?.code ?? "";
    if (code === "email_exists" || /already (been )?registered/i.test(authError?.message ?? "")) {
      return { ok: false, error: FORM_ERROR, fieldErrors: { email: "এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট আছে।" } };
    }
    if (code === "weak_password") {
      return { ok: false, error: FORM_ERROR, fieldErrors: { password: "পাসওয়ার্ডটি যথেষ্ট শক্তিশালী নয়; অন্য একটি দিন।" } };
    }
    if (code === "email_address_invalid" || code === "validation_failed") {
      return { ok: false, error: FORM_ERROR, fieldErrors: { email: "সঠিক ইমেইল ঠিকানা দিন।" } };
    }
    console.error("[admin/users] createUser failed:", authError?.code, authError?.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  const { error: profileError } = await db.from("staff_profiles").insert({ id: created.user.id, full_name, role_id });
  if (profileError) {
    const { error: cleanupError } = await admin.auth.admin.deleteUser(created.user.id);
    if (cleanupError) console.error("[admin/users] cleanup of auth user failed:", created.user.id, cleanupError.message);
    return { ok: false, error: errorMessage(profileError) };
  }

  revalidatePath("/admin/users");
  return { ok: true, email, password: password_mode === "generate" ? password : null };
}

/**
 * Edit name / role / active state. Nobody may change their own role or
 * deactivate themselves here. The database refuses removing the last active
 * super admin and super-admin changes by non-super-admins. A deactivated
 * account is also blocked at sign-in (Auth ban) so open sessions end too.
 */
export async function updateStaffUser(rawId: unknown, raw: unknown): Promise<UpdateStaffResult> {
  const staff = await staffWith("users.manage");
  if (!staff) return { ok: false, error: DENIED };
  // Canonical (lower-case) id: Postgres and Auth accept any letter case, so
  // an upper-case spelling of one's own id must not slip past the self check.
  const id = canonicalUuid(rawId);
  if (!id) return { ok: false, error: NOT_FOUND };
  const parsed = parseUpdateStaff(asRecord(raw));
  if (!parsed.ok) return { ok: false, error: FORM_ERROR, fieldErrors: parsed.fieldErrors };
  const next = parsed.data;

  const db = await createClient();
  const { data: target, error: readError } = await db
    .from("staff_profiles")
    .select("id, role_id, is_active, roles(key)")
    .eq("id", id)
    .maybeSingle();
  if (readError) return { ok: false, error: errorMessage(readError) };
  if (!target) return { ok: false, error: NOT_FOUND };

  // Compare the id the database returned, not the one the request sent.
  const isSelf = target.id === staff.id;
  if (isSelf && (next.role_id !== target.role_id || !next.is_active)) {
    // The more important reason first: the database would refuse this too.
    if (target.roles?.key === "super_admin") {
      const { count } = await db
        .from("staff_profiles")
        .select("id", { count: "exact", head: true })
        .eq("role_id", target.role_id)
        .eq("is_active", true);
      if ((count ?? 0) <= 1) return { ok: false, error: errorMessage({ message: "LAST_SUPER_ADMIN" }) };
    }
    return { ok: false, error: SELF_CHANGE };
  }
  if (target.roles?.key === "super_admin" && staff.roleKey !== "super_admin") {
    return { ok: false, error: SUPER_ONLY };
  }

  const admin = createAdminClient();
  const deactivating = target.is_active && !next.is_active;
  if (!next.is_active) {
    // Block sign-in FIRST. If that fails, nothing is changed: an inactive
    // profile whose session still works would be locked out of the panel
    // without being able to reach the login page (redirect loop). Re-applied
    // when an already inactive account is saved, which also repairs one that
    // was deactivated outside the panel (e.g. directly in the database).
    const { error: banError } = await admin.auth.admin.updateUserById(target.id, { ban_duration: BAN_DURATION });
    if (banError) {
      console.error("[admin/users] ban failed:", target.id, banError.message);
      return { ok: false, error: BAN_FAILED };
    }
  }

  const { data, error } = await db
    .from("staff_profiles")
    .update({ full_name: next.full_name, role_id: next.role_id, is_active: next.is_active })
    .eq("id", target.id)
    .select("id");
  if (error || !data || data.length === 0) {
    if (deactivating) {
      // The profile stayed active: lift the sign-in block again.
      const { error: undoError } = await admin.auth.admin.updateUserById(target.id, { ban_duration: "none" });
      if (undoError) console.error("[admin/users] undoing the ban failed:", target.id, undoError.message);
    }
    if (error?.code === "23503") return { ok: false, error: FORM_ERROR, fieldErrors: { role_id: "একটি ভূমিকা নির্বাচন করুন।" } };
    return { ok: false, error: error ? errorMessage(error) : DENIED };
  }

  let warning: string | undefined;
  if (next.is_active) {
    // Lift a sign-in block left by a deactivation (also on a retry after an
    // earlier failed attempt, so "save again" really helps).
    const { data: authUser, error: readAuthError } = await admin.auth.admin.getUserById(target.id);
    const bannedUntil = authUser?.user?.banned_until ? Date.parse(authUser.user.banned_until) : NaN;
    if (readAuthError || bannedUntil > Date.now()) {
      const { error: unbanError } = await admin.auth.admin.updateUserById(target.id, { ban_duration: "none" });
      if (unbanError) {
        console.error("[admin/users] unban failed:", target.id, unbanError.message);
        warning = "প্রোফাইল সক্রিয় হয়েছে, কিন্তু লগইনের বাধা তোলা যায়নি। কিছুক্ষণ পর এই ফর্মটি আবার সংরক্ষণ করুন।";
      }
    }
  }

  revalidatePath("/admin/users");
  return warning ? { ok: true, warning } : { ok: true };
}

/**
 * New temporary password for another staff member, shown once. Only a super
 * admin may reset a super admin's password (enforced here: password changes
 * go through the Auth admin API, which has no Row-Level Security).
 */
export async function resetStaffPassword(rawId: unknown): Promise<ResetPasswordResult> {
  const staff = await staffWith("users.manage");
  if (!staff) return { ok: false, error: DENIED };
  const id = canonicalUuid(rawId);
  if (!id) return { ok: false, error: NOT_FOUND };

  const db = await createClient();
  const { data: target, error: readError } = await db
    .from("staff_profiles")
    .select("id, roles(key)")
    .eq("id", id)
    .maybeSingle();
  if (readError) return { ok: false, error: errorMessage(readError) };
  if (!target) return { ok: false, error: NOT_FOUND };
  // Checked against the id the database returned (any spelling of one's own
  // id is refused): one's own password is changed on the account page, which
  // asks for the current password and is rate limited.
  if (target.id === staff.id) {
    return { ok: false, error: "নিজের পাসওয়ার্ড “আমার অ্যাকাউন্ট” পাতা থেকে পরিবর্তন করুন।" };
  }
  if (target.roles?.key === "super_admin" && staff.roleKey !== "super_admin") {
    return { ok: false, error: "সুপার অ্যাডমিনের পাসওয়ার্ড শুধু আরেকজন সুপার অ্যাডমিন রিসেট করতে পারেন।" };
  }

  const password = generatePassword(14);
  const admin = createAdminClient();
  const { data: updated, error } = await admin.auth.admin.updateUserById(target.id, { password });
  if (error) {
    console.error("[admin/users] password reset failed:", target.id, error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  // Audit trail (no table row changes, so the row triggers do not see this).
  // Written by the server only — after the checks above and the successful
  // Auth call — so the log cannot contain resets that never happened; the
  // database function re-checks the same rules for this actor.
  const { error: logError } = await admin.rpc("log_account_event", {
    p_actor: staff.id,
    p_action: "password_reset",
    p_target: target.id,
  });
  if (logError) console.error("[admin/users] audit log failed:", logError.message);

  return { ok: true, password, email: updated.user?.email ?? null };
}
