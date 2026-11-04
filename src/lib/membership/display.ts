import { ID_TYPES } from "@/lib/format";
import { ageOn, todayInDhaka } from "./normalize";

/** Small display helpers shared by public and admin membership pages (pure, no I/O). */

// Common honorific prefixes skipped when building initials ("মোঃ করিম" → "ক").
const PREFIXES = new Set([
  "মোঃ", "মো:", "মো.", "মোহাঃ", "মোছাঃ", "মোসাঃ", "মুহাম্মদ", "মোহাম্মদ", "মুহাম্মাদ", "মোহাম্মাদ",
  "md", "md.", "mohammad", "mohammed", "muhammad", "mohd", "mohd.",
]);

function firstGrapheme(word: string): string {
  try {
    const seg = new Intl.Segmenter("bn", { granularity: "grapheme" });
    for (const { segment } of seg.segment(word)) return segment;
  } catch {
    // Intl.Segmenter unavailable: fall back to the first code point.
  }
  return Array.from(word)[0] ?? "";
}

const BENGALI = /[\u0980-\u09FF]/;

/**
 * Initials for an avatar placeholder: two letters for Latin names ("RU"),
 * one grapheme for Bengali names ("আব্দুল করিম" → "আ"), because two joined
 * Bengali letters read as an unrelated word.
 */
export function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{M}\s.:]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  const meaningful = words.filter((w) => !PREFIXES.has(w.toLowerCase()));
  const use = meaningful.length > 0 ? meaningful : words;
  if (use.length === 0) return "?";
  const first = firstGrapheme(use[0].replace(/[.:]/g, ""));
  if (BENGALI.test(first)) return first;
  const last = use.length > 1 ? firstGrapheme(use[use.length - 1].replace(/[.:]/g, "")) : "";
  return (first + last).toUpperCase() || "?";
}

export function idTypeLabel(idType: string): string {
  return idType in ID_TYPES ? ID_TYPES[idType as keyof typeof ID_TYPES] : idType;
}

export function idNumberLabel(idType: string): string {
  if (idType === "nid") return "জাতীয় পরিচয়পত্র নম্বর";
  if (idType === "birth_reg") return "জন্ম নিবন্ধন নম্বর";
  return "পরিচয়পত্র নম্বর";
}

/** Bengali label for a notification_log.kind value. */
export const NOTIFICATION_KIND: Record<string, string> = {
  application_received: "আবেদন গ্রহণের ইমেইল",
  application_approved: "অনুমোদনের ইমেইল",
  application_rejected: "প্রত্যাখ্যানের ইমেইল",
};

export const NOTIFICATION_STATUS: Record<string, { label: string; tone: "green" | "red" | "gray" }> = {
  sent: { label: "পাঠানো হয়েছে", tone: "green" },
  failed: { label: "ব্যর্থ", tone: "red" },
  skipped: { label: "পাঠানো হয়নি", tone: "gray" },
};

/** Why an email was skipped (notification_log.error is an internal English note). */
export function skippedReason(error: string | null): string {
  if (error?.includes("too many")) return "একই ঠিকানায় অল্প সময়ে অনেক ইমেইল পাঠানো এড়াতে এটি পাঠানো হয়নি।";
  return "ইমেইল পাঠানোর সেবা চালু নেই।";
}

/** Age from which members are listed without a guardian's consent (same as the public_members view). */
export const DIRECTORY_ADULT_AGE = 18;

export type DirectoryRuleFields = {
  status: string;
  show_in_directory: boolean;
  directory_consent: boolean;
  date_of_birth: string | null;
  guardian_consent: boolean;
};

/**
 * True when the member is under 18 (by the recorded date of birth, Asia/Dhaka)
 * and no guardian consent is recorded — such members are not listed publicly.
 * Without a date of birth the rule cannot apply (paper members may have none).
 */
export function needsGuardianConsent(
  m: Pick<DirectoryRuleFields, "date_of_birth" | "guardian_consent">,
  today: string = todayInDhaka(),
): boolean {
  if (!m.date_of_birth || m.guardian_consent) return false;
  const age = ageOn(m.date_of_birth, today);
  return age !== null && age < DIRECTORY_ADULT_AGE;
}

/**
 * Shown in the public directory right now — the same rule as the
 * public_members view: active + shown + consented, and members under 18 only
 * with a recorded guardian consent.
 */
export function isPubliclyListed(m: DirectoryRuleFields, today: string = todayInDhaka()): boolean {
  return m.status === "active" && m.show_in_directory && m.directory_consent && !needsGuardianConsent(m, today);
}
