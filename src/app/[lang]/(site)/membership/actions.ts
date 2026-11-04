"use server";

import { isLocale, DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { membership as membershipMessages, type MembershipMessages } from "@/i18n/messages/membership";
import { parseApplication, type ApplicationValues, type FieldErrors } from "@/lib/membership/schema";
import { checkStartToken, signStartToken, type StartToken } from "@/lib/membership/start-token";
import { applyGlobalAllowed, receiptEmailAllowed, startTokenSecret } from "@/lib/membership/limits";
import { rateLimit } from "@/lib/rate-limit";
import { getSettings } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { notifyApplicant } from "@/lib/email";

/**
 * Public membership application (called only by the application form in
 * src/components/membership/application-form.tsx; the endpoints are public,
 * so every input is treated as untrusted and re-validated here).
 *
 * Flow of a submission:
 *  1. beginApplication(submissionToken) — the browser asks for a server-signed
 *     "form opened" token (src/lib/membership/start-token.ts) bound to its
 *     submission token, which is also the idempotency key: one token can
 *     create at most one application.
 *  2. submitApplication(...) — honeypot, signed-token timing check (at least
 *     MIN_FILL_MS since the token was issued, by the SERVER's clock),
 *     applications-open check, the shared zod schema (same rules and messages
 *     as the browser preview), per-visitor + site-wide rate limits, and only
 *     then the database function submit_membership_application, which is
 *     granted to the service role alone and re-checks the declaration, the
 *     date of birth and duplicate ID numbers. A successful first submission
 *     also triggers the "application received" email (when configured).
 *
 * Answers carry a `code` next to the message (the texts live in
 * membership[lang].server) so the form can react — e.g. code "start" makes it
 * fetch a fresh start token and submit once more.
 */

export type SubmittedApplication = {
  applicationNo: string;
  fullName: string;
  submittedAt: string;
  alreadySubmitted: boolean;
};

export type SubmitApplicationErrorCode = keyof MembershipMessages["server"];

export type SubmitApplicationResult =
  | { ok: true; data: SubmittedApplication }
  | { ok: false; code: SubmitApplicationErrorCode; error: string; fieldErrors?: FieldErrors };

export type BeginApplicationResult = { ok: true; start: StartToken } | { ok: false };

export type SubmitApplicationInput = {
  values: ApplicationValues;
  token: string;
  hp: string;
  start: StartToken;
  lang: Locale;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(lang: Locale, code: SubmitApplicationErrorCode, fieldErrors?: FieldErrors): SubmitApplicationResult {
  const error = membershipMessages[lang].server[code];
  return fieldErrors ? { ok: false, code, error, fieldErrors } : { ok: false, code, error };
}

/**
 * Issues the signed "form opened" token for a submission token. Deliberately
 * the only thing a caller can get without submitting: the token proves
 * nothing by itself — on submit the server checks its signature and age.
 */
export async function beginApplication(token: string): Promise<BeginApplicationResult> {
  if (typeof token !== "string" || !UUID_RE.test(token)) return { ok: false };
  try {
    return { ok: true, start: signStartToken(startTokenSecret(), token) };
  } catch (e) {
    // Without the server secret no token can be signed (broken environment).
    console.error("[membership] could not sign the start token:", e instanceof Error ? e.message : e);
    return { ok: false };
  }
}

export async function submitApplication(input: SubmitApplicationInput): Promise<SubmitApplicationResult> {
  const lang: Locale = input && isLocale(input.lang) ? input.lang : DEFAULT_LOCALE;
  const t = membershipMessages[lang];

  // The submission token becomes the database idempotency key (a uuid
  // column); anything else can never have been issued by the form.
  const token = input?.token;
  if (typeof token !== "string" || !UUID_RE.test(token)) return fail(lang, "token");

  // Honeypot: the field is invisible to people, so a filled value means a
  // bot. Nothing is stored and no other check runs.
  if (typeof input.hp === "string" && input.hp.trim() !== "") return fail(lang, "honeypot");

  // Signed start token: too fast, too old or forged — the form fetches a
  // fresh one and retries once (code "start").
  let startCheck: ReturnType<typeof checkStartToken> | "unavailable" = "unavailable";
  try {
    startCheck = checkStartToken(startTokenSecret(), token, input.start);
  } catch (e) {
    console.error("[membership] start token check unavailable:", e instanceof Error ? e.message : e);
  }
  if (startCheck === "unavailable") return fail(lang, "generic");
  if (startCheck !== "ok") return fail(lang, "start");

  // Applications can be paused in the site settings while the form is open.
  const settings = await getSettings();
  if (!settings.membership.is_open) return fail(lang, "closed");

  // The same schema the browser preview uses; the server is the source of truth.
  const parsed = parseApplication(input.values, t.validation);
  if (!parsed.ok) return fail(lang, "formError", parsed.fieldErrors);
  const data = parsed.data;

  // Rate limits fail open (a database hiccup must not block real applicants);
  // the try/catch only guards a missing server key in a broken environment.
  let allowed = true;
  try {
    allowed = (await rateLimit("apply", 10, 3600)) && (await applyGlobalAllowed());
  } catch {
    allowed = true;
  }
  if (!allowed) return fail(lang, "rateLimited");

  try {
    const db = createAdminClient();
    const { data: rows, error } = await db.rpc("submit_membership_application", {
      p: data as unknown as Json,
      p_token: token,
    });
    if (error) {
      // The database function raises named exceptions for the refusals it owns.
      const message = error.message ?? "";
      if (message.includes("DUPLICATE_ID") || error.code === "23505") {
        return fail(lang, "duplicateId", { id_number: t.server.duplicateId });
      }
      if (message.includes("DECLARATION_REQUIRED")) {
        return fail(lang, "declarationRequired", { declaration: t.server.declarationRequired });
      }
      if (message.includes("INVALID_DOB")) {
        return fail(lang, "invalidDob", { date_of_birth: t.server.invalidDob });
      }
      if (message.includes("TOKEN_REQUIRED")) return fail(lang, "token");
      throw error;
    }
    const row = rows?.[0];
    if (!row) throw new Error("submit_membership_application returned no row");

    // The confirmation shows when the application was received; for an
    // idempotent retry that is the ORIGINAL submission time.
    let submittedAt = new Date().toISOString();
    const { data: stored } = await db
      .from("membership_applications")
      .select("created_at")
      .eq("id", row.application_id)
      .maybeSingle();
    if (stored?.created_at) submittedAt = stored.created_at;

    // "Application received" email (Bengali, only when the applicant gave an
    // address and email is configured). Best effort: it never changes the
    // answer, and a retry of the same submission does not send it twice.
    if (!row.already_submitted && data.email) {
      try {
        if (await receiptEmailAllowed(data.email)) {
          await notifyApplicant(row.application_id, "application_received");
        }
      } catch (e) {
        console.error("[membership] receipt email failed:", e instanceof Error ? e.message : e);
      }
    }

    return {
      ok: true,
      data: {
        applicationNo: row.application_no,
        fullName: data.full_name,
        submittedAt,
        alreadySubmitted: row.already_submitted,
      },
    };
  } catch (e) {
    console.error("[membership] application submit failed:", e instanceof Error ? e.message : e);
    return fail(lang, "generic");
  }
}
