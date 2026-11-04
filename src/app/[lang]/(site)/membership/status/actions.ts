"use server";

import { isLocale, DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { membership as membershipMessages } from "@/i18n/messages/membership";
import { parseStatusQuery, type StatusField } from "@/lib/membership/status";
import { statusLookupAllowed } from "@/lib/membership/limits";
import { rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Public application-status lookup (called only by the status form in
 * src/components/membership/status-form.tsx via useActionState).
 *
 * Privacy by design: the database function check_application_status answers
 * ONLY when the tracking number AND the mobile number both match one
 * application, and it returns nothing but name, status and dates — so a
 * wrong pair always gets the same generic "not found" answer and the form
 * never reveals which of the two fields was wrong. The function is granted
 * to the service role alone, which keeps the table itself unreachable.
 *
 * Lookups are rate limited per mobile number (limits.ts) and per visitor
 * (rate-limit.ts); both fail open so a database hiccup never locks out an
 * applicant checking a genuine application.
 */

export type ApplicationStatusKey = "pending" | "under_review" | "approved" | "rejected";

export type ApplicationStatusView = {
  fullName: string;
  status: ApplicationStatusKey;
  applicationNo: string;
  submittedAt: string;
  reviewedAt: string | null;
  memberNo: string | null;
};

export type StatusLookupValues = { application_no: string; mobile: string };

export type StatusLookupState =
  | { ok: true; result: ApplicationStatusView; values: StatusLookupValues }
  | {
      ok: false;
      error: string;
      values: StatusLookupValues;
      fieldErrors?: Partial<Record<StatusField, string>>;
      notFound?: boolean;
    }
  | null;

const STATUS_KEYS: readonly ApplicationStatusKey[] = ["pending", "under_review", "approved", "rejected"];

export async function lookupStatus(_prev: StatusLookupState, formData: FormData): Promise<StatusLookupState> {
  const langRaw = formData.get("lang");
  const lang: Locale = typeof langRaw === "string" && isLocale(langRaw) ? langRaw : DEFAULT_LOCALE;
  const answers = membershipMessages[lang].statusValidation;

  const parsed = parseStatusQuery(formData.get("application_no"), formData.get("mobile"), answers);
  if (!parsed.ok) {
    return { ok: false, error: answers.bothFields, values: parsed.values, fieldErrors: parsed.fieldErrors };
  }
  const values = parsed.data;

  // Rate limits fail open (same reasoning as the application submission).
  let allowed = true;
  try {
    allowed = (await statusLookupAllowed(values.mobile)) && (await rateLimit("status", 30, 3600));
  } catch {
    allowed = true;
  }
  if (!allowed) return { ok: false, error: answers.rateLimited, values };

  try {
    const db = createAdminClient();
    const { data: rows, error } = await db.rpc("check_application_status", {
      p_application_no: values.application_no,
      p_mobile: values.mobile,
    });
    if (error) throw error;
    const row = rows?.[0];
    if (!row) return { ok: false, error: answers.notFound, values, notFound: true };
    return {
      ok: true,
      values,
      result: {
        fullName: row.full_name,
        status: STATUS_KEYS.includes(row.status as ApplicationStatusKey)
          ? (row.status as ApplicationStatusKey)
          : "pending",
        applicationNo: row.application_no,
        submittedAt: row.submitted_at,
        reviewedAt: row.reviewed_at ? row.reviewed_at : null,
        memberNo: row.member_no ? row.member_no : null,
      },
    };
  } catch (e) {
    console.error("[membership] status lookup failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: answers.generic, values };
  }
}
