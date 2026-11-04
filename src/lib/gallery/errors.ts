import { errorMessage } from "@/lib/errors";
import { PROGRAM_ERRORS } from "@/lib/programs/errors";

/** Bengali messages for gallery/category database errors not covered by the shared map. */
const EXTRA: Record<string, string> = {
  CATEGORY_COVER_MISMATCH: "প্রচ্ছদ ছবিটি অবশ্যই এই ক্যাটাগরির ছবি হতে হবে।",
  TOO_MANY_PATHS: "একবারে অনেক বেশি ফাইল পাঠানো হয়েছে।",
  TOO_MANY_PENDING_UPLOADS: "আপনার অনেকগুলো অসম্পূর্ণ আপলোড জমে আছে। কিছুক্ষণ পর আবার চেষ্টা করুন।",
  INVALID_COUNT: "একবারে ১ থেকে ৩০টি ছবি আপলোড করা যায়।",
  PROGRAM_CATEGORY_MISMATCH: PROGRAM_ERRORS.PROGRAM_CATEGORY_MISMATCH,
};

export function galleryErrorMessage(error: unknown): string {
  const e = error as { message?: string; code?: string } | null | undefined;
  const raw = e?.message ?? "";
  for (const code of Object.keys(EXTRA)) {
    if (raw.includes(code)) return EXTRA[code];
  }
  // Foreign-key violation: the category still has images.
  if (e?.code === "23503") return "এই ক্যাটাগরিতে ছবি থাকায় এটি মুছে ফেলা যাবে না। এর বদলে নিষ্ক্রিয় করুন।";
  return errorMessage(error);
}
