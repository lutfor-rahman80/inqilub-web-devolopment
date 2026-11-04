import type { SiteSettings } from "@/lib/settings";
import { toAsciiDigits } from "@/lib/format";
import { isSocialPlatform, safeFacebookUrl, safeHttpsUrl, safeMapEmbedUrl, safeSocialUrl } from "./urls";

/**
 * Site settings are free-form jsonb rows. The admin form validates them, and a
 * database trigger checks their shape, but public pages must never crash or
 * render an unsafe link because of one malformed value. This turns whatever is
 * stored into exactly the SiteSettings types: wrong-typed values fall back to
 * the built-in organization defaults (for required texts) or to "not set"
 * (null / empty, which pages hide), and the Facebook / map URLs are reduced to
 * the allowed hosts. Pure function (unit tested).
 */

// Same organization defaults as src/lib/settings.ts (the organization's own data).
const ORG_FALLBACK = {
  name_bn: "ইনকিলাব যুব সংগঠন",
  tagline: "একটি অরাজনৈতিক সামাজিক যুব সংগঠন",
  slogan: "আনতে সুপ্রভাত, পথ দেখাবে ইনকিলাব",
  location: "নারায়ণগঞ্জ",
} as const;

type Loose = Record<string, unknown>;

const record = (v: unknown): Loose => (v && typeof v === "object" && !Array.isArray(v) ? (v as Loose) : {});
/** A non-empty string, else the fallback. */
const text = (v: unknown, fallback: string): string => (typeof v === "string" && v.trim() ? v : fallback);
/** A non-empty string, else null. */
const optional = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const flag = (v: unknown, fallback: boolean): boolean => (typeof v === "boolean" ? v : fallback);

export function normalizeSettings(raw: SiteSettings | Loose): SiteSettings {
  const all = record(raw);
  const org = record(all.organization);
  const orgEn = record(org.en);
  const about = record(all.about);
  const aboutEn = record(about.en);
  const contact = record(all.contact);
  const contactEn = record(contact.en);
  const membership = record(all.membership);
  const membershipEn = record(membership.en);
  const directory = record(all.directory);
  const social = record(all.social);
  const quiz = record(all.quiz);
  const texts = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((p): p is string => typeof p === "string" && p.trim() !== "") : [];

  const links: SiteSettings["social"]["links"] = [];
  for (const item of Array.isArray(social.links) ? social.links : []) {
    const l = record(item);
    if (!isSocialPlatform(l.platform)) continue;
    const url = safeSocialUrl(l.platform, typeof l.url === "string" ? l.url : null);
    if (url && !links.some((x) => x.platform === l.platform)) links.push({ platform: l.platform, url });
  }

  return {
    organization: {
      name_bn: text(org.name_bn, ORG_FALLBACK.name_bn),
      tagline: text(org.tagline, ORG_FALLBACK.tagline),
      slogan: text(org.slogan, ORG_FALLBACK.slogan),
      location: text(org.location, ORG_FALLBACK.location),
      en: {
        name: text(orgEn.name, ""),
        tagline: text(orgEn.tagline, ""),
        slogan: text(orgEn.slogan, ""),
        location: text(orgEn.location, ""),
      },
    },
    about: {
      what_is: text(about.what_is, ""),
      goal: text(about.goal, ""),
      objective: text(about.objective, ""),
      why: text(about.why, ""),
      en: {
        what_is: text(aboutEn.what_is, ""),
        goal: text(aboutEn.goal, ""),
        objective: text(aboutEn.objective, ""),
        why: text(aboutEn.why, ""),
      },
    },
    contact: {
      address: optional(contact.address),
      phone: optional(contact.phone),
      email: optional(contact.email),
      facebook_url: safeFacebookUrl(optional(contact.facebook_url)),
      map_url: safeMapEmbedUrl(optional(contact.map_url)),
      office_hours: optional(contact.office_hours),
      en: { address: optional(contactEn.address), office_hours: optional(contactEn.office_hours) },
    },
    membership: {
      is_open: flag(membership.is_open, true),
      declaration: texts(membership.declaration),
      en: { declaration: texts(membershipEn.declaration) },
    },
    directory: {
      enabled: flag(directory.enabled, true),
      committee_term_bn: optional(directory.committee_term_bn),
      committee_term_en: optional(directory.committee_term_en),
    },
    social: { links },
    quiz: {
      url: safeHttpsUrl(optional(quiz.url)),
      label_bn: text(quiz.label_bn, "সীরাত কুইজ"),
      label_en: text(quiz.label_en, "Seerat Quiz"),
    },
  };
}

/** tel: link for a phone number as entered ("01712-345678", "০১৭১২ ৩৪৫৬৭৮" → "tel:01712345678"). */
export function telHref(phone: string): string | null {
  const digits = toAsciiDigits(phone).replace(/[^\d+]/g, "");
  return /\d{3,}/.test(digits) ? `tel:${digits}` : null;
}
