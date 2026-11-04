"use server";

import { createClient as createPlainClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";
import { GENERIC_ERROR, errorMessage } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { DENIED, anyStaff } from "@/lib/admin/guard";
import { FORM_ERROR, parseChangePassword, type FieldErrors } from "@/lib/admin/schemas";

export type ChangePasswordResult = { ok: true } | { ok: false; error: string; fieldErrors?: FieldErrors };

/**
 * Change one's own password. The current password is verified again with a
 * separate, cookie-less sign-in (whose session is ended right away), then the
 * new password is set through the user's own session. Other devices are
 * signed out; this one stays signed in.
 */
export async function changeOwnPassword(raw: unknown): Promise<ChangePasswordResult> {
  const staff = await anyStaff();
  if (!staff || !staff.email) return { ok: false, error: DENIED };

  if (!(await rateLimit("password-change", 5, 900))) {
    return { ok: false, error: errorMessage({ message: "RATE_LIMITED" }) };
  }

  const input = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const parsed = parseChangePassword(input);
  if (!parsed.ok) return { ok: false, error: FORM_ERROR, fieldErrors: parsed.fieldErrors };

  const verifier = createPlainClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: check, error: checkError } = await verifier.auth.signInWithPassword({
    email: staff.email,
    password: parsed.data.current,
  });
  if (checkError || check.user?.id !== staff.id) {
    return { ok: false, error: FORM_ERROR, fieldErrors: { current: "বর্তমান পাসওয়ার্ড সঠিক নয়।" } };
  }
  await verifier.auth.signOut({ scope: "local" }).catch(() => undefined);

  const db = await createClient();
  const { error } = await db.auth.updateUser({ password: parsed.data.next });
  if (error) {
    if (error.code === "same_password") {
      return { ok: false, error: FORM_ERROR, fieldErrors: { next: "নতুন পাসওয়ার্ড বর্তমান পাসওয়ার্ড থেকে ভিন্ন হতে হবে।" } };
    }
    if (error.code === "weak_password") {
      return { ok: false, error: FORM_ERROR, fieldErrors: { next: "পাসওয়ার্ডটি যথেষ্ট শক্তিশালী নয়; অক্ষর, সংখ্যা ও চিহ্ন মিলিয়ে দিন।" } };
    }
    console.error("[admin/account] password update failed:", error.code, error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  // End sessions on other devices (someone who knew the old password).
  const { error: othersError } = await db.auth.signOut({ scope: "others" });
  if (othersError) console.error("[admin/account] sign out of other sessions failed:", othersError.message);

  // Audit trail, written by the server only after the change succeeded (the
  // database function is not callable with a user session).
  const { error: logError } = await createAdminClient().rpc("log_account_event", {
    p_actor: staff.id,
    p_action: "password_change",
    p_target: staff.id,
  });
  if (logError) console.error("[admin/account] audit log failed:", logError.message);

  return { ok: true };
}
