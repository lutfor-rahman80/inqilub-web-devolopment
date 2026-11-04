"use server";

import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { safeAdminNext } from "@/lib/admin/mfa";
import {
  MFA_MESSAGES,
  beginTotpEnrolment,
  confirmTotpEnrolment,
  logMfaEvent,
  verifyTotpCode,
  type EnrolmentStart,
  type MfaResult,
} from "@/lib/admin/mfa-server";

export type ChallengeState = { error?: string; field?: "code" };

/**
 * Second step after the password: checks the authenticator code and upgrades
 * the session to aal2. Only for a signed-in, active staff member who has a
 * verified factor and has not completed the step yet.
 */
export async function verifyLoginCode(_prev: ChallengeState, formData: FormData): Promise<ChallengeState> {
  const next = safeAdminNext(formData.get("next"));
  const session = await getStaffSession();
  if (!session) redirect("/admin/login?error=no-access");
  if (session.mfa.satisfied) redirect(next);
  if (!session.mfa.factors.length) return { error: MFA_MESSAGES.failed };

  if (!(await rateLimit("admin-mfa", 10, 5 * 60))) return { error: MFA_MESSAGES.rateLimited };

  const result = await verifyTotpCode(formData.get("code"), formData.get("factor"));
  if (!result.ok) return { error: result.error, field: result.field };
  redirect(next);
}

/** First-time set-up for a super admin who has no authenticator yet (required before any admin page). */
export async function startRequiredEnrolment(): Promise<EnrolmentStart> {
  const session = await getStaffSession();
  if (!session?.mfa.mustEnrol) return { ok: false, error: MFA_MESSAGES.failed };
  if (!(await rateLimit("admin-mfa-enrol", 10, 15 * 60))) return { ok: false, error: MFA_MESSAGES.rateLimited };
  return beginTotpEnrolment();
}

export async function confirmRequiredEnrolment(factorId: unknown, code: unknown, nextInput: unknown): Promise<MfaResult> {
  const session = await getStaffSession();
  if (!session?.mfa.mustEnrol) return { ok: false, error: MFA_MESSAGES.failed };
  if (!(await rateLimit("admin-mfa", 10, 5 * 60))) return { ok: false, error: MFA_MESSAGES.rateLimited };

  const result = await confirmTotpEnrolment(factorId, code);
  if (!result.ok) return result;
  await logMfaEvent(session.staff.id, "mfa_enrol", session.staff.id);
  redirect(safeAdminNext(nextInput));
}
