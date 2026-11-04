import { errorMessage } from "@/lib/errors";

/**
 * Bengali messages for program-related database errors that the shared map
 * (src/lib/errors.ts) does not know. Raised by private.guard_programs() and
 * private.guard_image_program() (migration 20261028000001).
 */
export const PROGRAM_ERRORS: Record<string, string> = {
  PROGRAM_SLUG_LOCKED:
    "প্রকাশিত কর্মসূচির স্লাগ (ওয়েবসাইটের ঠিকানা) আর বদলানো যায় না, কারণ লিংকটি ইতিমধ্যে শেয়ার হয়ে থাকতে পারে।",
  PROGRAM_COVER_MISMATCH: "প্রচ্ছদ ছবিটি অবশ্যই এই কর্মসূচির কার্যক্রমের ক্ষেত্রের (ক্যাটাগরির) ছবি হতে হবে।",
  PROGRAM_CATEGORY_MISMATCH: "শুধু একই কার্যক্রমের ক্ষেত্রের (ক্যাটাগরির) ছবি এই কর্মসূচির সাথে যুক্ত করা যায়।",
  programs_dates_order: "শেষের তারিখ শুরুর তারিখের আগে হতে পারে না।",
};

export const SLUG_TAKEN = "এই স্লাগ ইতিমধ্যে অন্য একটি কর্মসূচিতে ব্যবহৃত হচ্ছে।";

/** The PROGRAM_* code in a database error, if any. */
export function programErrorCode(error: unknown): string | null {
  const raw = (error as { message?: string } | null | undefined)?.message ?? "";
  return Object.keys(PROGRAM_ERRORS).find((code) => raw.includes(code)) ?? null;
}

export function programErrorMessage(error: unknown): string {
  const code = programErrorCode(error);
  if (code) return PROGRAM_ERRORS[code];
  const e = error as { code?: string; message?: string } | null | undefined;
  if (e?.code === "23505" && (e.message ?? "").includes("slug")) return SLUG_TAKEN;
  // Foreign key: the chosen category or image no longer exists.
  if (e?.code === "23503") return "নির্বাচিত ক্যাটাগরি বা ছবিটি আর নেই। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।";
  return errorMessage(error);
}
