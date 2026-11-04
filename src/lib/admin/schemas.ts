import { z } from "zod";
import { bn } from "@/lib/format";
import { safeHttpsUrl, safeSocialUrl, isSocialPlatform, type SocialPlatform } from "@/lib/site/urls";
import {
  extractMapUrl, isBdPhone, isFacebookUrl, isMapEmbedUrl, isUuid, multiLine, normalizePhone, oneLine,
  ROLE_KEY_RE, slugifyRoleKey,
} from "./text";

/**
 * Server-side validation for the admin panel (the browser shows the same
 * messages, but the server is the source of truth). Every parser takes raw
 * values (strings/booleans from the form) and returns either clean data or
 * Bengali field errors.
 */

export type FieldErrors = Record<string, string>;
export type Parsed<T> = { ok: true; data: T } | { ok: false; fieldErrors: FieldErrors };

export const FORM_ERROR = "ফর্মের কিছু তথ্য সঠিক নয়। চিহ্নিত ঘরগুলো ঠিক করে আবার চেষ্টা করুন।";

function collect<T>(result: { success: true; data: T } | { success: false; error: z.ZodError }): Parsed<T> {
  if (result.success) return { ok: true, data: result.data };
  const fieldErrors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { ok: false, fieldErrors };
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const bool = (v: unknown) => v === true || v === "on" || v === "true" || v === "1";

const text = (label: string, min: number, max: number) =>
  z
    .string()
    .min(min, { error: min <= 1 ? `${label} লিখুন।` : `${label} লিখুন (কমপক্ষে ${bn(min)} অক্ষর)।` })
    .max(max, { error: `${label} সর্বোচ্চ ${bn(max)} অক্ষরের হতে পারে।` });

const optionalText = (label: string, max: number) =>
  z.string().max(max, { error: `${label} সর্বোচ্চ ${bn(max)} অক্ষরের হতে পারে।` });

// ---------------------------------------------------------------------------
// Website content (site_settings)
// ---------------------------------------------------------------------------

export const CONTENT_SECTIONS = ["organization", "about", "contact", "membership", "directory", "social"] as const;
export type ContentSection = (typeof CONTENT_SECTIONS)[number];

export const CONTENT_LIMITS = {
  orgName: 120,
  orgLine: 200,
  aboutText: 5000,
  address: 300,
  email: 254,
  url: 1000,
  officeHours: 200,
  declarationMin: 1,
  declarationMax: 6,
  paragraphMin: 10,
  paragraphMax: 2000,
  committeeTerm: 80,
  quizLabel: 40,
  socialLinksMax: 7,
} as const;

/** English (optional) text: same limits as the Bengali field; empty = not translated (Bengali shown). */
const enText = (label: string, max: number) =>
  z.string().max(max, { error: `${label} (ইংরেজি) সর্বোচ্চ ${bn(max)} অক্ষরের হতে পারে।` });

const organizationSchema = z.object({
  name_bn: text("সংগঠনের নাম", 2, CONTENT_LIMITS.orgName),
  tagline: text("পরিচিতি বাক্য", 2, CONTENT_LIMITS.orgLine),
  slogan: text("স্লোগান", 2, CONTENT_LIMITS.orgLine),
  location: text("অবস্থান", 2, CONTENT_LIMITS.orgLine),
  en: z.object({
    name: enText("সংগঠনের নাম", CONTENT_LIMITS.orgName),
    tagline: enText("পরিচিতি বাক্য", CONTENT_LIMITS.orgLine),
    slogan: enText("স্লোগানের অর্থ", CONTENT_LIMITS.orgLine),
    location: enText("অবস্থান", CONTENT_LIMITS.orgLine),
  }),
});
export type OrganizationValues = z.infer<typeof organizationSchema>;

function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export function parseOrganization(raw: Record<string, unknown>): Parsed<OrganizationValues> {
  const en = asObject(raw.en);
  return collect(
    organizationSchema.safeParse({
      name_bn: oneLine(raw.name_bn),
      tagline: oneLine(raw.tagline),
      slogan: oneLine(raw.slogan),
      location: oneLine(raw.location),
      en: { name: oneLine(en.name), tagline: oneLine(en.tagline), slogan: oneLine(en.slogan), location: oneLine(en.location) },
    }),
  );
}

const aboutSchema = z.object({
  what_is: optionalText("পরিচিতি", CONTENT_LIMITS.aboutText),
  goal: optionalText("লক্ষ্য", CONTENT_LIMITS.aboutText),
  objective: optionalText("উদ্দেশ্য", CONTENT_LIMITS.aboutText),
  why: optionalText("কেন এই সংগঠন", CONTENT_LIMITS.aboutText),
  en: z.object({
    what_is: enText("পরিচিতি", CONTENT_LIMITS.aboutText),
    goal: enText("লক্ষ্য", CONTENT_LIMITS.aboutText),
    objective: enText("উদ্দেশ্য", CONTENT_LIMITS.aboutText),
    why: enText("কেন এই সংগঠন", CONTENT_LIMITS.aboutText),
  }),
});
export type AboutValues = z.infer<typeof aboutSchema>;

export function parseAbout(raw: Record<string, unknown>): Parsed<AboutValues> {
  const en = asObject(raw.en);
  return collect(
    aboutSchema.safeParse({
      what_is: multiLine(raw.what_is),
      goal: multiLine(raw.goal),
      objective: multiLine(raw.objective),
      why: multiLine(raw.why),
      en: { what_is: multiLine(en.what_is), goal: multiLine(en.goal), objective: multiLine(en.objective), why: multiLine(en.why) },
    }),
  );
}

export type ContactValues = {
  address: string | null;
  phone: string | null;
  email: string | null;
  facebook_url: string | null;
  map_url: string | null;
  office_hours: string | null;
  en: { address: string | null; office_hours: string | null };
};

const contactSchema = z.object({
  address: optionalText("ঠিকানা", CONTENT_LIMITS.address),
  phone: z.string().refine((v) => v === "" || isBdPhone(v), {
    error: "সঠিক ফোন নম্বর দিন — মোবাইল (যেমন ০১৭১২৩৪৫৬৭৮) অথবা ল্যান্ডফোন (যেমন ০২৭৬৪১২৩৪৫)।",
  }),
  email: z
    .string()
    .max(CONTENT_LIMITS.email, { error: "ইমেইল ঠিকানাটি অনেক বড়।" })
    .refine((v) => v === "" || z.email().safeParse(v).success, { error: "সঠিক ইমেইল ঠিকানা দিন।" }),
  facebook_url: z
    .string()
    .max(CONTENT_LIMITS.url, { error: "লিংকটি অনেক বড়।" })
    .refine((v) => v === "" || isFacebookUrl(v), {
      error: "ফেসবুক পেজের পূর্ণ লিংক দিন, যা https://www.facebook.com/ দিয়ে শুরু হয়।",
    }),
  map_url: z
    .string()
    .max(CONTENT_LIMITS.url, { error: "লিংকটি অনেক বড়।" })
    .refine((v) => v === "" || isMapEmbedUrl(v), {
      error: "গুগল ম্যাপের “Embed a map” লিংক দিন, যা https://www.google.com/maps/embed দিয়ে শুরু হয়।",
    }),
  office_hours: optionalText("অফিস সময়", CONTENT_LIMITS.officeHours),
  en: z.object({
    address: enText("ঠিকানা", CONTENT_LIMITS.address),
    office_hours: enText("অফিস সময়", CONTENT_LIMITS.officeHours),
  }),
});

export function parseContactSettings(raw: Record<string, unknown>): Parsed<ContactValues> {
  const en = asObject(raw.en);
  const result = collect(
    contactSchema.safeParse({
      address: multiLine(raw.address),
      phone: str(raw.phone).trim() ? normalizePhone(str(raw.phone)) : "",
      email: oneLine(raw.email).toLowerCase(),
      facebook_url: oneLine(raw.facebook_url),
      map_url: str(raw.map_url).trim() ? extractMapUrl(str(raw.map_url)) : "",
      office_hours: oneLine(raw.office_hours),
      en: { address: multiLine(en.address), office_hours: oneLine(en.office_hours) },
    }),
  );
  if (!result.ok) return result;
  const d = result.data;
  const orNull = (v: string) => (v === "" ? null : v);
  return {
    ok: true,
    data: {
      address: orNull(d.address),
      phone: orNull(d.phone),
      email: orNull(d.email),
      facebook_url: orNull(d.facebook_url),
      map_url: orNull(d.map_url),
      office_hours: orNull(d.office_hours),
      en: { address: orNull(d.en.address), office_hours: orNull(d.en.office_hours) },
    },
  };
}

export type MembershipValues = { is_open: boolean; declaration: string[]; en: { declaration: string[] } };

export const NAME_PLACEHOLDER = "{name}";

/**
 * Membership: the Bengali pledge (binding, required) and its optional English
 * reference translation (shown on the English site). Error keys:
 * declaration / declaration.<i> and en.declaration / en.declaration.<i>.
 */
export function parseMembershipSettings(raw: { is_open: unknown; declaration: unknown; en?: unknown }): Parsed<MembershipValues> {
  const fieldErrors: FieldErrors = {};
  const list = Array.isArray(raw.declaration) ? raw.declaration : [];
  const paragraphs = list.map((p) => multiLine(p)).filter((p) => p !== "");
  const { declarationMin, declarationMax, paragraphMin, paragraphMax } = CONTENT_LIMITS;

  if (list.length > declarationMax || paragraphs.length > declarationMax) {
    fieldErrors.declaration = `অঙ্গীকারনামায় সর্বোচ্চ ${bn(declarationMax)}টি অনুচ্ছেদ থাকতে পারে।`;
  } else if (paragraphs.length < declarationMin) {
    fieldErrors.declaration = "অঙ্গীকারনামায় অন্তত একটি অনুচ্ছেদ লিখুন।";
  } else {
    paragraphs.forEach((p, i) => {
      if (p.length < paragraphMin) {
        fieldErrors[`declaration.${i}`] = `অনুচ্ছেদটি কমপক্ষে ${bn(paragraphMin)} অক্ষরের হতে হবে।`;
      } else if (p.length > paragraphMax) {
        fieldErrors[`declaration.${i}`] = `প্রতিটি অনুচ্ছেদ সর্বোচ্চ ${bn(paragraphMax)} অক্ষরের হতে পারে।`;
      }
    });
    if (!fieldErrors["declaration.0"] && !paragraphs[0].includes(NAME_PLACEHOLDER)) {
      fieldErrors["declaration.0"] =
        "প্রথম অনুচ্ছেদে {name} লিখুন — ফর্মে আবেদনকারীর নাম ঠিক ওই জায়গায় বসবে (যেমন: “আমি {name} এই মর্মে অঙ্গীকার করছি…”)।";
    }
  }
  // English reference translation: optional; when given, the same rules apply.
  const enList = Array.isArray(asObject(raw.en).declaration) ? (asObject(raw.en).declaration as unknown[]) : [];
  const enParagraphs = enList.map((p) => multiLine(p)).filter((p) => p !== "");
  if (enList.length > declarationMax || enParagraphs.length > declarationMax) {
    fieldErrors["en.declaration"] = `ইংরেজি অনুবাদে সর্বোচ্চ ${bn(declarationMax)}টি অনুচ্ছেদ থাকতে পারে।`;
  } else if (enParagraphs.length > 0) {
    enParagraphs.forEach((p, i) => {
      if (p.length < paragraphMin) {
        fieldErrors[`en.declaration.${i}`] = `অনুচ্ছেদটি কমপক্ষে ${bn(paragraphMin)} অক্ষরের হতে হবে।`;
      } else if (p.length > paragraphMax) {
        fieldErrors[`en.declaration.${i}`] = `প্রতিটি অনুচ্ছেদ সর্বোচ্চ ${bn(paragraphMax)} অক্ষরের হতে পারে।`;
      }
    });
    if (!fieldErrors["en.declaration.0"] && !enParagraphs[0].includes(NAME_PLACEHOLDER)) {
      fieldErrors["en.declaration.0"] =
        "ইংরেজি অনুবাদের প্রথম অনুচ্ছেদেও {name} লিখুন (যেমন: “I, {name}, hereby pledge …”)।";
    }
  }
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  return { ok: true, data: { is_open: bool(raw.is_open), declaration: paragraphs, en: { declaration: enParagraphs } } };
}

export type DirectoryValues = { enabled: boolean; committee_term_bn: string | null; committee_term_en: string | null };

const directorySchema = z.object({
  committee_term_bn: optionalText("কমিটির মেয়াদ", CONTENT_LIMITS.committeeTerm),
  committee_term_en: enText("কমিটির মেয়াদ", CONTENT_LIMITS.committeeTerm),
});

export function parseDirectorySettings(raw: { enabled: unknown; committee_term_bn?: unknown; committee_term_en?: unknown }): Parsed<DirectoryValues> {
  const result = collect(
    directorySchema.safeParse({ committee_term_bn: oneLine(raw.committee_term_bn), committee_term_en: oneLine(raw.committee_term_en) }),
  );
  if (!result.ok) return result;
  return {
    ok: true,
    data: {
      enabled: bool(raw.enabled),
      committee_term_bn: result.data.committee_term_bn || null,
      committee_term_en: result.data.committee_term_en || null,
    },
  };
}

// ---------------------------------------------------------------------------
// Social links (site_settings "social") and the quiz link ("quiz")
// ---------------------------------------------------------------------------

/** Platforms offered in the social-links editor (Facebook lives in the contact section). */
export const EDITABLE_SOCIAL_PLATFORMS = ["youtube", "instagram", "tiktok", "x", "whatsapp", "telegram", "linkedin"] as const satisfies readonly SocialPlatform[];

/** Example addresses shown as placeholders in the editor. */
export const SOCIAL_URL_EXAMPLES: Record<(typeof EDITABLE_SOCIAL_PLATFORMS)[number], string> = {
  youtube: "https://www.youtube.com/@...",
  instagram: "https://www.instagram.com/...",
  tiktok: "https://www.tiktok.com/@...",
  x: "https://x.com/...",
  whatsapp: "https://whatsapp.com/channel/...",
  telegram: "https://t.me/...",
  linkedin: "https://www.linkedin.com/company/...",
};

/**
 * A social link as typed → the normalized https address on the platform's
 * own host, or null. Same rules as the database trigger (WhatsApp: channel
 * or wa.me links only).
 */
export function normalizeSocialUrl(platform: SocialPlatform, value: unknown): string | null {
  const url = safeSocialUrl(platform, oneLine(value));
  if (!url) return null;
  const { hostname, pathname } = new URL(url);
  if (pathname === "/" || pathname === "") return null; // a profile/page address, not the bare site
  if (platform === "whatsapp" && /whatsapp\.com$/i.test(hostname) && !pathname.startsWith("/channel/")) return null;
  return url;
}

export type SocialValues = { links: { platform: SocialPlatform; url: string }[] };

export function parseSocialSettings(raw: Record<string, unknown>): Parsed<SocialValues> {
  const list = Array.isArray(raw.links) ? raw.links : [];
  const fieldErrors: FieldErrors = {};
  const links: SocialValues["links"] = [];
  if (list.length > CONTENT_LIMITS.socialLinksMax) {
    return { ok: false, fieldErrors: { links: `সর্বোচ্চ ${bn(CONTENT_LIMITS.socialLinksMax)}টি লিংক রাখা যায়।` } };
  }
  list.forEach((item, i) => {
    const row = asObject(item);
    const platform = row.platform;
    const urlText = oneLine(row.url);
    if (!isSocialPlatform(platform) || platform === "facebook" || !(EDITABLE_SOCIAL_PLATFORMS as readonly string[]).includes(platform)) {
      fieldErrors[`links.${i}.platform`] = "একটি মাধ্যম বেছে নিন।";
      return;
    }
    if (links.some((l) => l.platform === platform)) {
      fieldErrors[`links.${i}.platform`] = "এই মাধ্যমটি একবারই যোগ করা যায়।";
      return;
    }
    if (!urlText) {
      fieldErrors[`links.${i}.url`] = "লিংকটি লিখুন (অথবা সারিটি মুছে দিন)।";
      return;
    }
    if (urlText.length > CONTENT_LIMITS.url) {
      fieldErrors[`links.${i}.url`] = "লিংকটি অনেক বড়।";
      return;
    }
    const url = normalizeSocialUrl(platform, urlText);
    if (!url) {
      fieldErrors[`links.${i}.url`] =
        platform === "whatsapp"
          ? "হোয়াটসঅ্যাপ চ্যানেলের পূর্ণ লিংক দিন (https://whatsapp.com/channel/… অথবা https://wa.me/…)।"
          : `এই মাধ্যমের পেজ/চ্যানেলের পূর্ণ https লিংক দিন, যেমন ${SOCIAL_URL_EXAMPLES[platform]}`;
      return;
    }
    links.push({ platform, url });
  });
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  return { ok: true, data: { links } };
}


// ---------------------------------------------------------------------------
// Staff accounts
// ---------------------------------------------------------------------------

export const PASSWORD_LIMITS = { min: 10, max: 72 } as const;

const passwordSchema = z
  .string()
  .min(PASSWORD_LIMITS.min, { error: `পাসওয়ার্ড কমপক্ষে ${bn(PASSWORD_LIMITS.min)} অক্ষরের হতে হবে।` })
  .max(PASSWORD_LIMITS.max, { error: `পাসওয়ার্ড সর্বোচ্চ ${bn(PASSWORD_LIMITS.max)} অক্ষরের হতে পারে।` })
  .refine((v) => v.trim() === v, { error: "পাসওয়ার্ডের শুরুতে বা শেষে ফাঁকা স্থান রাখা যাবে না।" });

const fullName = text("পূর্ণ নাম", 2, 120);
const roleId = z
  .string()
  .refine((v) => isUuid(v), { error: "একটি ভূমিকা নির্বাচন করুন।" })
  .transform((v) => v.toLowerCase());

const createStaffSchema = z
  .object({
    email: z
      .string()
      .min(1, { error: "ইমেইল ঠিকানা লিখুন।" })
      .max(254, { error: "ইমেইল ঠিকানাটি অনেক বড়।" })
      .refine((v) => z.email().safeParse(v).success, { error: "সঠিক ইমেইল ঠিকানা দিন।" }),
    full_name: fullName,
    role_id: roleId,
    password_mode: z.enum(["generate", "manual"]),
    password: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.password_mode === "manual") {
      const r = passwordSchema.safeParse(v.password);
      if (!r.success) ctx.addIssue({ code: "custom", path: ["password"], message: r.error.issues[0].message });
    }
  });
export type CreateStaffValues = z.infer<typeof createStaffSchema>;

export function parseCreateStaff(raw: Record<string, unknown>): Parsed<CreateStaffValues> {
  return collect(
    createStaffSchema.safeParse({
      email: oneLine(raw.email).toLowerCase(),
      full_name: oneLine(raw.full_name),
      role_id: str(raw.role_id),
      password_mode: raw.password_mode === "manual" ? "manual" : "generate",
      password: str(raw.password),
    }),
  );
}

const updateStaffSchema = z.object({
  full_name: fullName,
  role_id: roleId,
  is_active: z.boolean(),
});
export type UpdateStaffValues = z.infer<typeof updateStaffSchema>;

export function parseUpdateStaff(raw: Record<string, unknown>): Parsed<UpdateStaffValues> {
  return collect(
    updateStaffSchema.safeParse({
      full_name: oneLine(raw.full_name),
      role_id: str(raw.role_id),
      is_active: bool(raw.is_active),
    }),
  );
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

const roleSchema = z.object({
  name_bn: text("ভূমিকার নাম", 2, 80),
  description: optionalText("বিবরণ", 500),
});

const newRoleSchema = roleSchema.extend({
  key: z
    .string()
    .min(1, { error: "ইংরেজি অক্ষরে একটি সংক্ষিপ্ত নাম দিন (যেমন: president)।" })
    .refine((v) => ROLE_KEY_RE.test(v), {
      error: "সংক্ষিপ্ত নাম ইংরেজি অক্ষর দিয়ে শুরু হবে; শুধু a-z, 0-9 ও _ ব্যবহার করুন (২–৪১ অক্ষর)।",
    }),
  permissions: z.array(z.string().regex(/^[a-z_]+\.[a-z_]+$/)).max(50),
});
export type NewRoleValues = z.infer<typeof newRoleSchema>;
export type RoleValues = z.infer<typeof roleSchema>;

export function parseNewRole(raw: Record<string, unknown>): Parsed<NewRoleValues> {
  const perms = Array.isArray(raw.permissions) ? raw.permissions.filter((p): p is string => typeof p === "string") : [];
  return collect(
    newRoleSchema.safeParse({
      name_bn: oneLine(raw.name_bn),
      description: oneLine(raw.description),
      key: slugifyRoleKey(str(raw.key)),
      permissions: [...new Set(perms)],
    }),
  );
}

export function parseRole(raw: Record<string, unknown>): Parsed<RoleValues> {
  return collect(roleSchema.safeParse({ name_bn: oneLine(raw.name_bn), description: oneLine(raw.description) }));
}

// ---------------------------------------------------------------------------
// Own password
// ---------------------------------------------------------------------------

const changePasswordSchema = z
  .object({
    current: z.string().min(1, { error: "বর্তমান পাসওয়ার্ড লিখুন।" }).max(200),
    next: passwordSchema,
    confirm: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.next !== v.confirm) {
      ctx.addIssue({ code: "custom", path: ["confirm"], message: "দুটি নতুন পাসওয়ার্ড মিলছে না।" });
    }
    if (v.current && v.next === v.current) {
      ctx.addIssue({ code: "custom", path: ["next"], message: "নতুন পাসওয়ার্ড বর্তমান পাসওয়ার্ড থেকে ভিন্ন হতে হবে।" });
    }
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export function parseChangePassword(raw: Record<string, unknown>): Parsed<ChangePasswordValues> {
  return collect(changePasswordSchema.safeParse({ current: str(raw.current), next: str(raw.next), confirm: str(raw.confirm) }));
}
