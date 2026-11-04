"use server";

import { revalidatePath } from "next/cache";
import { getStaff, getStaffSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/site/urls";
import { DENIED } from "@/lib/admin/guard";
import {
  MFA_MESSAGES,
  beginTotpEnrolment,
  confirmTotpEnrolment,
  logMfaEvent,
  removeOwnFactor,
  verifyTotpCode,
  type EnrolmentStart,
  type MfaResult,
} from "@/lib/admin/mfa-server";

/**
 * Own two-step login on the account page. Every action requires a session
 * that may use the admin panel (getStaff: active staff, second step done
 * where required); the Auth server checks again (a verified factor can only
 * be added or removed in a two-step session).
 */

export async function startOwnEnrolment(): Promise<EnrolmentStart> {
  const staff = await getStaff();
  if (!staff) return { ok: false, error: DENIED };
  if (!(await rateLimit("admin-mfa-enrol", 10, 15 * 60))) return { ok: false, error: MFA_MESSAGES.rateLimited };
  return beginTotpEnrolment();
}

export async function confirmOwnEnrolment(factorId: unknown, code: unknown): Promise<MfaResult> {
  const staff = await getStaff();
  if (!staff) return { ok: false, error: DENIED };
  if (!(await rateLimit("admin-mfa", 10, 5 * 60))) return { ok: false, error: MFA_MESSAGES.rateLimited };
  const result = await confirmTotpEnrolment(factorId, code);
  if (!result.ok) return result;
  await logMfaEvent(staff.id, "mfa_enrol", staff.id);
  revalidatePath("/admin/account");
  return { ok: true };
}

/**
 * Removes one of the user's own authenticator apps after re-checking a
 * current code (from any of their apps). A super admin must keep at least one.
 */
export async function removeOwnFactorAction(factorId: unknown, code: unknown): Promise<MfaResult> {
  const session = await getStaffSession();
  if (!session?.mfa.satisfied) return { ok: false, error: DENIED };
  if (typeof factorId !== "string" || !isUuid(factorId)) return { ok: false, error: MFA_MESSAGES.failed };
  const factor = session.mfa.factors.find((f) => f.id === factorId);
  if (!factor) return { ok: false, error: MFA_MESSAGES.failed };
  if (session.staff.roleKey === "super_admin" && session.mfa.factors.length <= 1) {
    return { ok: false, error: MFA_MESSAGES.lastFactor };
  }
  if (!(await rateLimit("admin-mfa", 10, 5 * 60))) return { ok: false, error: MFA_MESSAGES.rateLimited };

  const check = await verifyTotpCode(code, factorId);
  if (!check.ok) return check;
  const result = await removeOwnFactor(factorId);
  if (!result.ok) return result;
  await logMfaEvent(session.staff.id, "mfa_remove", session.staff.id);
  revalidatePath("/admin/account");
  return { ok: true };
}

/**
 * Lost phone: a super admin removes ANOTHER staff member's authenticator
 * apps, so they can sign in with their password and set up a new one (a
 * super admin is asked to do so right away). Super admins only.
 */
export async function resetStaffMfa(targetId: unknown): Promise<MfaResult> {
  const staff = await getStaff();
  if (!staff || staff.roleKey !== "super_admin" || !staff.permissions.has("users.manage")) return { ok: false, error: DENIED };
  if (typeof targetId !== "string" || !isUuid(targetId)) return { ok: false, error: MFA_MESSAGES.failed };
  const target = targetId.toLowerCase();
  if (target === staff.id.toLowerCase()) {
    return { ok: false, error: "নিজের অ্যাপ এখানে রিসেট করা যায় না; ওপরের “দুই ধাপের লগইন” অংশ থেকে পরিবর্তন করুন।" };
  }

  const admin = createAdminClient();
  // Only staff accounts (never arbitrary Auth users).
  const { data: profile } = await admin.from("staff_profiles").select("id").eq("id", target).maybeSingle();
  if (!profile) return { ok: false, error: "ব্যবহারকারীকে খুঁজে পাওয়া যায়নি।" };

  const { data, error } = await admin.auth.admin.mfa.listFactors({ userId: target });
  if (error) {
    console.error("[admin/mfa] list factors failed:", error.message);
    return { ok: false, error: MFA_MESSAGES.failed };
  }
  const factors = data?.factors ?? [];
  if (!factors.length) return { ok: false, error: "এই ব্যবহারকারীর কোনো অথেনটিকেটর অ্যাপ যুক্ত নেই।" };
  for (const f of factors) {
    const { error: delError } = await admin.auth.admin.mfa.deleteFactor({ userId: target, id: f.id });
    if (delError) {
      console.error("[admin/mfa] delete factor failed:", delError.message);
      return { ok: false, error: MFA_MESSAGES.failed };
    }
  }
  await logMfaEvent(staff.id, "mfa_reset", target);
  revalidatePath("/admin/account");
  return { ok: true };
}
