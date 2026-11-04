import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MFA_PATH, mfaRule, normalizeAal, type AssuranceLevel } from "@/lib/admin/mfa";

export { MFA_PATH };

export type Permission =
  | "applications.view"
  | "applications.review"
  | "applications.delete"
  | "members.view"
  | "members.manage"
  | "gallery.manage"
  | "gallery.delete"
  | "content.manage"
  | "quiz.manage"
  | "messages.view"
  | "users.manage"
  | "audit.view";

export type Staff = {
  id: string;
  email: string | null;
  fullName: string;
  roleKey: string;
  roleName: string;
  permissions: Set<Permission>;
};

/** A verified authenticator-app factor (TOTP) of the signed-in user. */
export type MfaFactor = { id: string; friendlyName: string | null; createdAt: string };

/**
 * Two-step login state of the current session.
 *  - level: assurance level of this session ("aal2" after the authenticator code)
 *  - required: the session must reach aal2 before any admin page/action
 *    (super admins always; other staff once they have enrolled a factor)
 *  - mustEnrol: a super admin without an authenticator yet — send to enrolment
 *  - satisfied: admin pages and actions may be used
 */
export type MfaState = {
  level: AssuranceLevel;
  factors: MfaFactor[];
  required: boolean;
  mustEnrol: boolean;
  satisfied: boolean;
};

export type StaffSession = { staff: Staff; mfa: MfaState };

/**
 * The signed-in, active staff member for this request together with the
 * session's two-step state — whether or not the second step is done. Only
 * for the sign-in / two-step pages and their actions; everything else uses
 * getStaff() / requireStaff() / assertPermission(), which refuse sessions
 * that have not completed the required second step.
 */
export const getStaffSession = cache(async (): Promise<StaffSession | null> => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;
  // Validates this access token with the Auth server and returns the current
  // user, including the factor list (the cookie copy is not trusted).
  const {
    data: { user },
  } = await supabase.auth.getUser(session.access_token);
  if (!user) return null;

  const [{ data: profile }, { data: perms }, { data: assurance, error: aalError }] = await Promise.all([
    supabase
      .from("staff_profiles")
      .select("full_name, is_active, roles(key, name_bn)")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.rpc("my_permissions"),
    // Assurance level of THIS access token (validated again by the Auth server).
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(session.access_token),
  ]);
  if (!profile || !profile.is_active || !profile.roles) return null;

  const factors: MfaFactor[] = (user.factors ?? [])
    .filter((f) => f.status === "verified" && f.factor_type === "totp")
    .map((f) => ({ id: f.id, friendlyName: f.friendly_name ?? null, createdAt: f.created_at }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  // Anything but a clean "aal2" answer counts as one-step (fails closed).
  const level = aalError ? null : normalizeAal(assurance?.currentLevel);
  const rule = mfaRule(profile.roles.key, level, factors.length);

  return {
    staff: {
      id: user.id,
      email: user.email ?? null,
      fullName: profile.full_name,
      roleKey: profile.roles.key,
      roleName: profile.roles.name_bn,
      permissions: new Set((perms ?? []) as Permission[]),
    },
    mfa: { level, factors, ...rule },
  };
});

/**
 * The signed-in, active staff member for this request, or null — also null
 * while a required second step (authenticator code) is not done. Cached per
 * request. Permissions come from the database (`my_permissions`), which is
 * also what Row-Level Security checks (with the same two-step rule).
 */
export const getStaff = cache(async (): Promise<Staff | null> => {
  const session = await getStaffSession();
  return session?.mfa.satisfied ? session.staff : null;
});

/**
 * For admin pages: redirects to login when signed out / not staff, and to
 * the two-step page when the second step is required but not done.
 */
export async function requireStaff(): Promise<Staff> {
  const session = await getStaffSession();
  if (!session) redirect("/admin/login?error=no-access");
  if (!session.mfa.satisfied) redirect(MFA_PATH);
  return session.staff;
}

/** For admin pages: renders the 403 page when the permission is missing. */
export async function requirePagePermission(...anyOf: Permission[]): Promise<Staff> {
  const staff = await requireStaff();
  if (!anyOf.some((p) => staff.permissions.has(p))) redirect("/admin?denied=1");
  return staff;
}

export class PermissionError extends Error {
  constructor() {
    super("PERMISSION_DENIED");
  }
}

/**
 * For server actions: throws when the permission is missing or the session
 * has not completed a required second step. The database enforces the same
 * rules again via RLS / function checks.
 */
export async function assertPermission(...anyOf: Permission[]): Promise<Staff> {
  const staff = await getStaff();
  if (!staff || !anyOf.some((p) => staff.permissions.has(p))) throw new PermissionError();
  return staff;
}
