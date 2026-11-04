/** Bengali messages for error codes raised by database functions/triggers. */
const MESSAGES: Record<string, string> = {
  PERMISSION_DENIED: "এই কাজের অনুমতি আপনার নেই।",
  NOT_FOUND: "তথ্যটি খুঁজে পাওয়া যায়নি।",
  INVALID_TRANSITION: "আবেদনের বর্তমান অবস্থায় এই কাজটি করা যায় না। পৃষ্ঠাটি রিফ্রেশ করে আবার দেখুন।",
  ALREADY_MEMBER: "এই আবেদনের জন্য ইতিমধ্যে সদস্য রেকর্ড তৈরি হয়েছে।",
  INVALID_DESIGNATION: "সঠিক পদবী নির্বাচন করুন।",
  NOTE_REQUIRED: "প্রত্যাখ্যানের কারণ লিখুন (কমপক্ষে ৩ অক্ষর)।",
  DUPLICATE_ID: "এই জাতীয় পরিচয়পত্র / জন্ম নিবন্ধন নম্বর দিয়ে ইতিমধ্যে একটি আবেদন জমা আছে।",
  DECLARATION_REQUIRED: "অঙ্গীকারনামায় সম্মতি দিতে হবে।",
  INVALID_DOB: "সঠিক জন্ম তারিখ দিন।",
  TOKEN_REQUIRED: "ফর্মটি পুনরায় লোড করে আবার চেষ্টা করুন।",
  SYSTEM_ROLE_LOCKED: "এটি সিস্টেম ভূমিকা; এই পরিবর্তন অনুমোদিত নয়।",
  SUPER_ADMIN_ONLY: "শুধুমাত্র সুপার অ্যাডমিন এই পরিবর্তন করতে পারেন।",
  LAST_SUPER_ADMIN: "কমপক্ষে একজন সক্রিয় সুপার অ্যাডমিন থাকতে হবে।",
  CATEGORY_SLUG_IMMUTABLE: "ক্যাটাগরির ফোল্ডার নাম পরিবর্তন করা যায় না।",
  GALLERY_PATH_MISMATCH: "ছবির ফোল্ডার ও ক্যাটাগরি মিলছে না।",
  RATE_LIMITED: "অল্প সময়ে অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।",
  INVALID_SETTINGS: "ওয়েবসাইট কনটেন্টের একটি মান সঠিক নয়। ঘরগুলো দেখে আবার সংরক্ষণ করুন।",
};

export const GENERIC_ERROR = "একটি সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।";

type MaybeError = { message?: string; code?: string } | null | undefined;

/** Turns a Supabase/Postgres error (or thrown Error) into a safe Bengali message. */
export function errorMessage(error: unknown): string {
  const e = error as MaybeError;
  const raw = e?.message ?? "";
  for (const code of Object.keys(MESSAGES)) {
    if (raw.includes(code)) return MESSAGES[code];
  }
  if (e?.code === "42501") return MESSAGES.PERMISSION_DENIED;
  if (e?.code === "23505") return "একই তথ্য ইতিমধ্যে বিদ্যমান।";
  return GENERIC_ERROR;
}

/** Standard result shape for server actions used by forms. */
export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
