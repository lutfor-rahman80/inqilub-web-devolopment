import type { SiteSettings } from "@/lib/settings";
import type { Locale } from "@/i18n/config";
import { pickText, type LocalizedText } from "@/i18n/content";

/**
 * Organization texts from site settings in one language. English values fall
 * back to Bengali (isFallback → render with lang="bn", see <Localized>).
 * The slogan is the organization's Bengali slogan in both languages; English
 * pages may show `sloganTranslation` beneath it.
 */
export function siteTexts(s: SiteSettings, lang: Locale) {
  const opt = (bn: string | null, en: string | null): LocalizedText | null =>
    bn || en ? pickText(lang, bn ?? "", en) : null;
  const declarationEn = s.membership.en.declaration;
  return {
    orgName: pickText(lang, s.organization.name_bn, s.organization.en.name),
    tagline: pickText(lang, s.organization.tagline, s.organization.en.tagline),
    slogan: { text: s.organization.slogan, lang: "bn", isFallback: lang === "en" } satisfies LocalizedText,
    sloganTranslation: lang === "en" && s.organization.en.slogan ? s.organization.en.slogan : null,
    location: pickText(lang, s.organization.location, s.organization.en.location),
    about: {
      whatIs: pickText(lang, s.about.what_is, s.about.en.what_is),
      goal: pickText(lang, s.about.goal, s.about.en.goal),
      objective: pickText(lang, s.about.objective, s.about.en.objective),
      why: pickText(lang, s.about.why, s.about.en.why),
    },
    address: opt(s.contact.address, s.contact.en.address),
    officeHours: opt(s.contact.office_hours, s.contact.en.office_hours),
    declaration:
      lang === "en" && declarationEn.length > 0
        ? { paragraphs: declarationEn, lang: "en" as Locale, isFallback: false }
        : { paragraphs: s.membership.declaration, lang: "bn" as Locale, isFallback: lang === "en" },
    committeeTerm: opt(s.directory.committee_term_bn, s.directory.committee_term_en),
    quizLabel: lang === "en" ? s.quiz.label_en : s.quiz.label_bn,
  };
}
export type SiteTexts = ReturnType<typeof siteTexts>;
