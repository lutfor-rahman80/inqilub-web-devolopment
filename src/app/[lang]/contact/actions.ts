"use server";

import { isLocale, DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { contact as contactMessages } from "@/i18n/messages/contact";
import { parseContact, readContactValues, type ContactField, type ContactValues } from "@/lib/site/contact-schema";
import { rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Contact form submission (public). State mirrors the membership forms:
 * field errors come back in the page's language (the form carries a hidden
 * `lang` field), values are echoed so nothing typed is lost, and the whole
 * flow works without JavaScript (plain form post → re-rendered page).
 *
 * Abuse protections, in order: honeypot (a filled "website" field means a
 * bot — the submission is acknowledged but never stored), per-visitor rate
 * limit, and idempotency (the same message from the same person within an
 * hour is stored once, so a double submit or a refresh cannot duplicate it).
 * Rows are inserted with the service-role client: RLS gives the public no
 * access to contact_messages (see the core schema migration).
 */
export type ContactFormState =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Partial<Record<ContactField, string>>; values: ContactValues }
  | null;

export async function submitContact(_prev: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const langValue = formData.get("lang");
  const lang: Locale = typeof langValue === "string" && isLocale(langValue) ? (langValue as Locale) : DEFAULT_LOCALE;
  const t = contactMessages[lang];

  // "Send another message" — a plain reset back to the empty form.
  if (formData.get("intent") === "reset") return null;

  // Honeypot: humans never see (or fill) this field. Acknowledge, store nothing.
  const website = formData.get("website");
  if (typeof website === "string" && website.trim() !== "") return { ok: true };

  const values = readContactValues((name) => formData.get(name));
  const parsed = parseContact(values, t.validation);
  if (!parsed.ok) {
    return { ok: false, error: t.form.formError, fieldErrors: parsed.fieldErrors, values };
  }
  const data = parsed.data;

  // Per-visitor rate limit. rateLimit() fails open on database errors; the
  // try/catch only guards a missing server key in a broken environment.
  let allowed = true;
  try {
    allowed = await rateLimit("contact", 20, 3600);
  } catch {
    allowed = true;
  }
  if (!allowed) return { ok: false, error: t.form.rateLimited, values };

  try {
    const db = createAdminClient();

    // Idempotency: identical name + reply channel + subject + message within
    // the last hour counts as the same submission.
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: candidates, error: dupError } = await db
      .from("contact_messages")
      .select("name, mobile, email")
      .eq("subject", data.subject)
      .eq("message", data.message)
      .gte("created_at", since)
      .limit(10);
    if (dupError) throw dupError;
    const duplicate = (candidates ?? []).some((c) => c.name === data.name && c.mobile === data.mobile && c.email === data.email);
    if (duplicate) return { ok: true };

    const { error } = await db.from("contact_messages").insert({
      name: data.name,
      mobile: data.mobile,
      email: data.email,
      subject: data.subject,
      message: data.message,
    });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.error("[contact] message insert failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: t.form.genericError, values };
  }
}
