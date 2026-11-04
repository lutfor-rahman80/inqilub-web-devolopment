import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/server";
import { normalizeSettings } from "@/lib/site/safe-settings";

export type OrganizationSettings = {
  name_bn: string;
  tagline: string;
  slogan: string;
  location: string;
  /** English versions (empty string = not translated yet). */
  en: { name: string; tagline: string; slogan: string; location: string };
};
export type AboutSettings = {
  what_is: string;
  goal: string;
  objective: string;
  why: string;
  en: { what_is: string; goal: string; objective: string; why: string };
};
export type ContactSettings = {
  address: string | null;
  phone: string | null;
  email: string | null;
  facebook_url: string | null;
  map_url: string | null;
  office_hours: string | null;
  en: { address: string | null; office_hours: string | null };
};
export type MembershipSettings = { is_open: boolean; declaration: string[]; en: { declaration: string[] } };
export type DirectorySettings = { enabled: boolean; committee_term_bn: string | null; committee_term_en: string | null };
export type SocialLink = { platform: import("@/lib/site/urls").SocialPlatform; url: string };
export type SocialSettings = { links: SocialLink[] };
export type QuizSettings = { url: string | null; label_bn: string; label_en: string };

export type SiteSettings = {
  organization: OrganizationSettings;
  about: AboutSettings;
  contact: ContactSettings;
  membership: MembershipSettings;
  directory: DirectorySettings;
  social: SocialSettings;
  quiz: QuizSettings;
};

const DEFAULTS: SiteSettings = {
  organization: {
    name_bn: "ইনকিলাব যুব সংগঠন",
    tagline: "একটি অরাজনৈতিক সামাজিক যুব সংগঠন",
    slogan: "আনতে সুপ্রভাত, পথ দেখাবে ইনকিলাব",
    location: "নারায়ণগঞ্জ",
    en: { name: "Inqilab Jubo Sangathan", tagline: "A non-political social youth organization", slogan: "", location: "Narayanganj" },
  },
  about: { what_is: "", goal: "", objective: "", why: "", en: { what_is: "", goal: "", objective: "", why: "" } },
  contact: {
    address: "নারায়ণগঞ্জ",
    phone: null,
    email: null,
    facebook_url: null,
    map_url: null,
    office_hours: null,
    en: { address: "Narayanganj", office_hours: null },
  },
  membership: { is_open: true, declaration: [], en: { declaration: [] } },
  directory: { enabled: true, committee_term_bn: null, committee_term_en: null },
  social: { links: [] },
  quiz: { url: null, label_bn: "সীরাত কুইজ", label_en: "Seerat Quiz" },
};

/** All site settings (public data), merged over safe defaults and normalized. Cached per request. */
export const getSettings = cache(async (): Promise<SiteSettings> => {
  const supabase = createPublicClient();
  const { data } = await supabase.from("site_settings").select("key, value");
  const merged: SiteSettings = structuredClone(DEFAULTS);
  for (const row of data ?? []) {
    const key = row.key as keyof SiteSettings;
    if (key in merged && row.value && typeof row.value === "object") {
      merged[key] = { ...merged[key], ...(row.value as object) } as never;
    }
  }
  // Type-check every value so a malformed row can never crash a page or
  // produce an unsafe link (Facebook/map URLs are restricted to allowed hosts).
  return normalizeSettings(merged);
});
