import type { Locale } from "@/i18n/config";
import { formatDate } from "@/lib/format";

/** "১৫ ডিসেম্বর ২০২৬" or a range "১৫ ডিসেম্বর ২০২৬ – ১৭ ডিসেম্বর ২০২৬" (English: "15 December 2026 – …"). */
export function programDateText(startsOn: string, endsOn: string | null, lang: Locale): string {
  return endsOn && endsOn !== startsOn
    ? `${formatDate(startsOn, lang)} – ${formatDate(endsOn, lang)}`
    : formatDate(startsOn, lang);
}
