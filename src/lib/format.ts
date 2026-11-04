const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/** 2026 → ২০২৬ (any string/number; non-digits untouched). */
export function bn(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

/** ২০২৬ / ٢٠٢٦ → 2026. Use on every user-typed numeric input before validation. */
export function toAsciiDigits(value: string): string {
  return value
    .replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

const EN_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Number for display in a language: Bengali digits in "bn", ASCII in "en". */
export function num(lang: "bn" | "en", value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return lang === "bn" ? bn(value) : String(value);
}

const BN_MONTHS = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];

function dhakaParts(input: string | Date) {
  const d = typeof input === "string" ? new Date(input) : input;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    year: get("year"),
    month: Number(get("month")),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    period: get("dayPeriod").toLowerCase(),
  };
}

/**
 * "২৭ অক্টোবর ২০২৬" (bn, default) or "27 October 2026" (en), Asia/Dhaka.
 * Accepts ISO strings or plain dates (YYYY-MM-DD).
 */
export function formatDate(input: string | Date | null | undefined, lang: "bn" | "en" = "bn"): string {
  if (!input) return "";
  let y: number, m: number, d: number;
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    [y, m, d] = input.split("-").map(Number);
  } else {
    const p = dhakaParts(input);
    [y, m, d] = [Number(p.year), p.month, Number(p.day)];
  }
  return lang === "en" ? `${d} ${EN_MONTHS[m - 1]} ${y}` : `${bn(d)} ${BN_MONTHS[m - 1]} ${bn(y)}`;
}

/** Date with time, e.g. "২৭ অক্টোবর ২০২৬, ৩:০৫ অপরাহ্ণ" / "27 October 2026, 3:05 pm". */
export function formatDateTime(input: string | Date | null | undefined, lang: "bn" | "en" = "bn"): string {
  if (!input) return "";
  const p = dhakaParts(input);
  const am = p.period.startsWith("a");
  if (lang === "en") return `${formatDate(input, "en")}, ${p.hour}:${p.minute} ${am ? "am" : "pm"}`;
  return `${formatDate(input)}, ${bn(p.hour)}:${bn(p.minute)} ${am ? "পূর্বাহ্ণ" : "অপরাহ্ণ"}`;
}

export const APPLICATION_STATUS = {
  pending: { label: "অপেক্ষমাণ", tone: "amber" },
  under_review: { label: "যাচাই চলছে", tone: "blue" },
  approved: { label: "অনুমোদিত", tone: "green" },
  rejected: { label: "প্রত্যাখ্যাত", tone: "red" },
} as const;
export type ApplicationStatus = keyof typeof APPLICATION_STATUS;

export const MEMBER_STATUS = {
  active: { label: "সক্রিয়", tone: "green" },
  inactive: { label: "নিষ্ক্রিয়", tone: "amber" },
  archived: { label: "আর্কাইভকৃত", tone: "gray" },
} as const;
export type MemberStatus = keyof typeof MEMBER_STATUS;

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export const RELIGIONS = ["ইসলাম", "হিন্দু", "বৌদ্ধ", "খ্রিস্টান", "অন্যান্য"] as const;

export const ID_TYPES = {
  nid: "জাতীয় পরিচয়পত্র",
  birth_reg: "জন্ম নিবন্ধন",
} as const;
