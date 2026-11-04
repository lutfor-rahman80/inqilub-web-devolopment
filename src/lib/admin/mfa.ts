import { toAsciiDigits } from "@/lib/format";

/**
 * Pure helpers for two-step login (authenticator app, TOTP). No server-only
 * imports, so they can be unit tested and shared by browser and server code.
 */

/** Where a signed-in staff member completes (or sets up) the second step. */
export const MFA_PATH = "/admin/login/mfa";

/** Name shown for the account inside the authenticator app. */
export const MFA_ISSUER = "Inqilab Jubo Sangathan";

export type AssuranceLevel = "aal1" | "aal2" | null;

/** Only the two levels Supabase Auth issues; anything else is treated as "no level". */
export function normalizeAal(value: unknown): AssuranceLevel {
  return value === "aal2" ? "aal2" : value === "aal1" ? "aal1" : null;
}

/** The "aal" claim of an access token (call only for a token the Auth server has just issued or validated). */
export function tokenAal(accessToken: string): AssuranceLevel {
  try {
    const part = accessToken.split(".")[1] ?? "";
    const payload = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as { aal?: unknown };
    return normalizeAal(payload.aal);
  } catch {
    return null;
  }
}

/**
 * Who must complete the second step, and whether this session did:
 *  - super admins always (they are sent to enrolment until they have a factor);
 *  - other staff once they have enrolled a factor (optional, recommended).
 * A super admin's session also needs a factor that still exists: removing the
 * last factor leaves an aal2 token behind until it is refreshed.
 * The database applies the same rule (private.mfa_satisfied).
 */
export function mfaRule(roleKey: string, level: AssuranceLevel, verifiedFactors: number) {
  const isSuper = roleKey === "super_admin";
  const required = isSuper || verifiedFactors > 0;
  const mustEnrol = isSuper && verifiedFactors === 0;
  const satisfied = !required || (level === "aal2" && verifiedFactors > 0);
  return { required, mustEnrol, satisfied };
}

/** A 6-digit authenticator code as typed (Bengali digits and spaces allowed) → "123456", or null. */
export function normalizeTotpCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = toAsciiDigits(value).replace(/[\s-]/g, "");
  return /^\d{6}$/.test(digits) ? digits : null;
}

/** Secret grouped in fours for manual entry ("ABCD EFGH …"). */
export function groupSecret(secret: string): string {
  return secret.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
}

/** Only same-site admin paths after the second step (never the login pages themselves). */
export function safeAdminNext(next: unknown): string {
  const value = typeof next === "string" ? next : "";
  if (!value.startsWith("/admin") || value.startsWith("//") || value.includes("\\")) return "/admin";
  if (value === "/admin/login" || value.startsWith("/admin/login/") || value.startsWith("/admin/login?")) return "/admin";
  return value;
}
