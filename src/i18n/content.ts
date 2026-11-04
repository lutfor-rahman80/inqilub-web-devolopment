import type { Locale } from "./config";

/**
 * Picks the language version of a database text field pair `<field>_bn` /
 * `<field>_en` (or a plain `<field>` for Bengali-only legacy columns).
 * English falls back to Bengali; `isFallback` tells the UI to mark the text
 * with lang="bn" (see <Localized>).
 */
export type LocalizedText = { text: string; lang: Locale; isFallback: boolean };

export function pickText(lang: Locale, bn: string | null | undefined, en: string | null | undefined): LocalizedText {
  const bnText = bn ?? "";
  if (lang === "en") {
    const enText = (en ?? "").trim();
    if (enText) return { text: enText, lang: "en", isFallback: false };
    return { text: bnText, lang: "bn", isFallback: bnText !== "" };
  }
  return { text: bnText, lang: "bn", isFallback: false };
}

/** pickField(lang, row, "title") reads row.title_bn ?? row.title and row.title_en. */
export function pickField<T extends Record<string, unknown>>(lang: Locale, row: T, field: string): LocalizedText {
  const bn = (row[`${field}_bn`] ?? row[field]) as string | null | undefined;
  const en = row[`${field}_en`] as string | null | undefined;
  return pickText(lang, bn, en);
}
