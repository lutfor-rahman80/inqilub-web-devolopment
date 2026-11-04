import "server-only";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/site/urls";
import { MFA_ISSUER, groupSecret, normalizeTotpCode } from "./mfa";

/**
 * Two-step login (authenticator app) operations on the signed-in user's own
 * session. Callers check WHO may do this first (see the action files); the
 * Auth server enforces its own rules again (e.g. removing a verified factor
 * needs a two-step session).
 */

export const MFA_MESSAGES = {
  invalidCode: "৬ অঙ্কের কোডটি লিখুন (শুধু সংখ্যা)।",
  wrongCode: "কোডটি মেলেনি। অ্যাপে এখন যে কোডটি দেখাচ্ছে সেটি লিখুন — প্রতি ৩০ সেকেন্ডে কোড বদলায়। ফোনের সময় স্বয়ংক্রিয় আছে কি না দেখুন।",
  rateLimited: "অল্প সময়ে অনেকবার চেষ্টা করা হয়েছে। কয়েক মিনিট পর আবার চেষ্টা করুন।",
  expired: "এই সেটআপের মেয়াদ শেষ হয়েছে। আবার “শুরু করুন” চাপুন।",
  failed: "দুই ধাপের লগইনের কাজটি করা যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।",
  lastFactor: "সুপার অ্যাডমিনের অন্তত একটি অথেনটিকেটর অ্যাপ যুক্ত থাকতে হবে। আগে নতুন অ্যাপটি যুক্ত করুন, তারপর পুরোনোটি মুছুন।",
} as const;

export type EnrolmentStart = { ok: true; factorId: string; qr: string; secret: string } | { ok: false; error: string };
export type MfaResult = { ok: true } | { ok: false; error: string; field?: "code" };

type AuthFactor = { id: string; status: string; factor_type: string };

async function currentFactors(): Promise<AuthFactor[] | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? ((user.factors ?? []) as AuthFactor[]) : null;
}

/**
 * Creates a new, not yet verified authenticator factor and returns its QR
 * code (PNG data URL, rendered as <img>) and the secret for manual entry.
 * Abandoned earlier set-ups are removed first.
 */
export async function beginTotpEnrolment(): Promise<EnrolmentStart> {
  const supabase = await createClient();
  const factors = await currentFactors();
  if (!factors) return { ok: false, error: MFA_MESSAGES.failed };
  for (const f of factors) {
    if (f.factor_type === "totp" && f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    // Unique per user (the Auth server refuses duplicates); the UI shows the date instead.
    friendlyName: `authenticator-${Date.now().toString(36)}`,
    issuer: MFA_ISSUER,
  });
  if (error || !data || data.type !== "totp") {
    console.error("[admin/mfa] enroll failed:", error?.code, error?.message);
    return { ok: false, error: MFA_MESSAGES.failed };
  }
  const qr = await QRCode.toDataURL(data.totp.uri, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 240,
    color: { dark: "#04291aff", light: "#ffffffff" },
  });
  return { ok: true, factorId: data.id, qr, secret: groupSecret(data.totp.secret) };
}

/** Verifies the first code of a new factor; the session becomes a two-step (aal2) session. */
export async function confirmTotpEnrolment(factorId: unknown, codeInput: unknown): Promise<MfaResult> {
  const code = normalizeTotpCode(codeInput);
  if (!code) return { ok: false, error: MFA_MESSAGES.invalidCode, field: "code" };
  if (typeof factorId !== "string" || !isUuid(factorId)) return { ok: false, error: MFA_MESSAGES.expired };
  const factors = await currentFactors();
  const factor = factors?.find((f) => f.id === factorId && f.factor_type === "totp" && f.status !== "verified");
  if (!factor) return { ok: false, error: MFA_MESSAGES.expired };

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return verifyError(error);
  return { ok: true };
}

/**
 * Checks a code against the user's verified factors (any of them) and, on
 * success, upgrades the session to aal2. Returns the factor that matched.
 */
export async function verifyTotpCode(codeInput: unknown, preferredFactorId?: unknown): Promise<MfaResult & { factorId?: string }> {
  const code = normalizeTotpCode(codeInput);
  if (!code) return { ok: false, error: MFA_MESSAGES.invalidCode, field: "code" };
  const factors = (await currentFactors())?.filter((f) => f.factor_type === "totp" && f.status === "verified") ?? [];
  if (!factors.length) return { ok: false, error: MFA_MESSAGES.failed };
  // The chosen factor first, then the others (a code proves possession of whichever app made it).
  const ordered = [...factors].sort((a, b) => Number(b.id === preferredFactorId) - Number(a.id === preferredFactorId));
  const supabase = await createClient();
  let last: { code?: string; message?: string } | null = null;
  for (const f of ordered.slice(0, 5)) {
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: f.id, code });
    if (!error) return { ok: true, factorId: f.id };
    last = error;
    if (error.code !== "mfa_verification_failed") break;
  }
  return verifyError(last);
}

function verifyError(error: { code?: string; message?: string } | null): MfaResult {
  if (error?.code === "mfa_verification_failed" || error?.code === "mfa_challenge_expired") {
    return { ok: false, error: MFA_MESSAGES.wrongCode, field: "code" };
  }
  if (error?.code === "over_request_rate_limit" || error?.code === "too_many_requests") {
    return { ok: false, error: MFA_MESSAGES.rateLimited };
  }
  console.error("[admin/mfa] verify failed:", error?.code, error?.message);
  return { ok: false, error: MFA_MESSAGES.failed };
}

/** Removes one of the user's own factors (the session must already be aal2). */
export async function removeOwnFactor(factorId: string): Promise<MfaResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) {
    console.error("[admin/mfa] unenroll failed:", error.code, error.message);
    return { ok: false, error: MFA_MESSAGES.failed };
  }
  return { ok: true };
}

/** Audit entry for a two-step login event (server only, after the Auth call succeeded). */
export async function logMfaEvent(actor: string, action: "mfa_enrol" | "mfa_remove" | "mfa_reset", target: string) {
  const { error } = await createAdminClient().rpc("log_account_event", { p_actor: actor, p_action: action, p_target: target });
  if (error) console.error("[admin/mfa] audit log failed:", error.message);
}
