import { z } from "zod";
import { BLOOD_GROUPS, RELIGIONS, num } from "@/lib/format";
import { fmt, type Locale } from "@/i18n/config";
import type { ApplicationValidationMessages } from "@/i18n/messages/membership";
import {
  BD_MOBILE_RE,
  PERSON_NAME_CHARS_RE,
  cleanLine,
  cleanMultiline,
  cleanPersonName,
  isCalendarDate,
  normalizeDateInput,
  normalizeIdNumber,
  normalizeMobile,
  todayInDhaka,
} from "./normalize";

/**
 * Membership application validation, shared by the multi-step form in the
 * browser (instant feedback per step) and the server action (source of
 * truth). Rules mirror the membership_applications table constraints and are
 * the same in both languages; only the messages differ — they are passed in
 * by the caller in the page's language (membership[lang].validation), so the
 * schema module itself carries no interface text (the browser receives only
 * the messages of its own language).
 */

/** The four steps (titles: membership[lang].form.steps). */
export const APPLICATION_STEPS = ["personal", "address", "identity", "review"] as const;

export const STEP_FIELDS = [
  ["full_name", "father_name", "mother_name", "date_of_birth", "nationality", "religion", "religion_other", "occupation"],
  ["permanent_address", "present_address"],
  ["id_type", "id_number", "mobile", "email", "blood_group"],
  ["declaration", "directory_consent"],
] as const;

export type ApplicationField = (typeof STEP_FIELDS)[number][number];
export type FieldErrors = Partial<Record<ApplicationField, string>>;

/** Stored values (Bengali in both languages; the English form shows translated labels). */
export const OTHER_RELIGION = "অন্যান্য";
export const UNKNOWN_BLOOD_GROUP = "জানা নেই";
/**
 * Pre-filled nationality (a free-text field). The English form starts with the
 * English word; whatever the applicant leaves or types is what is stored.
 */
export const DEFAULT_NATIONALITY = "বাংলাদেশী";
export const DEFAULT_NATIONALITY_EN = "Bangladeshi";
export const NATIONALITY_DEFAULTS: Record<Locale, string> = { bn: DEFAULT_NATIONALITY, en: DEFAULT_NATIONALITY_EN };
export const MIN_DOB = "1920-01-02"; // the table requires date_of_birth > 1920-01-01

export const APPLICATION_LIMITS = {
  name: { min: 2, max: 120 },
  nationality: { min: 2, max: 60 },
  religion: { min: 2, max: 60 },
  occupation: { min: 2, max: 120 },
  address: { min: 5, max: 500 },
  email: { max: 254 },
} as const;

/** Raw form state (what the user typed). */
export type ApplicationValues = {
  full_name: string;
  father_name: string;
  mother_name: string;
  date_of_birth: string;
  nationality: string;
  religion: string;
  religion_other: string;
  occupation: string;
  permanent_address: string;
  same_address: boolean;
  present_address: string;
  id_type: string;
  id_number: string;
  mobile: string;
  email: string;
  blood_group: string;
  declaration: boolean;
  directory_consent: boolean;
};

export const EMPTY_APPLICATION: ApplicationValues = {
  full_name: "",
  father_name: "",
  mother_name: "",
  date_of_birth: "",
  nationality: DEFAULT_NATIONALITY,
  religion: "",
  religion_other: "",
  occupation: "",
  permanent_address: "",
  same_address: false,
  present_address: "",
  id_type: "",
  id_number: "",
  mobile: "",
  email: "",
  blood_group: "",
  declaration: false,
  directory_consent: false,
};

/** An empty form in a language (the nationality starts with that language's default). */
export function emptyApplication(lang: Locale): ApplicationValues {
  return { ...EMPTY_APPLICATION, nationality: NATIONALITY_DEFAULTS[lang] };
}

/** True when the applicant has entered anything (a pre-filled nationality in either language does not count). */
export function hasApplicationValues(v: ApplicationValues): boolean {
  return (Object.keys(EMPTY_APPLICATION) as (keyof ApplicationValues)[]).some((k) =>
    k === "nationality"
      ? !Object.values(NATIONALITY_DEFAULTS).includes(v.nationality)
      : v[k] !== EMPTY_APPLICATION[k],
  );
}

/**
 * Values carried over from the form in the other language: an untouched
 * pre-filled nationality follows the language, everything else stays as typed.
 */
export function carryOverValues(v: ApplicationValues, lang: Locale): ApplicationValues {
  return Object.values(NATIONALITY_DEFAULTS).includes(v.nationality) ? { ...v, nationality: NATIONALITY_DEFAULTS[lang] } : v;
}

/** Validated payload, shaped for submit_membership_application(p jsonb). */
export type ApplicationInput = {
  full_name: string;
  father_name: string;
  mother_name: string;
  date_of_birth: string;
  nationality: string;
  religion: string;
  occupation: string;
  permanent_address: string;
  present_address: string;
  id_type: "nid" | "birth_reg";
  id_number: string;
  mobile: string;
  email: string | null;
  blood_group: (typeof BLOOD_GROUPS)[number] | null;
  declaration_accepted: true;
  directory_consent: boolean;
};

const HAS_DIGIT = /\p{Nd}/u;
const HAS_LETTER = /\p{L}/u;

type FieldLabel = keyof ApplicationValidationMessages["labels"];

/** Message vars for a field label ({label}, and {Label} for the start of a sentence). */
function labelVars(m: ApplicationValidationMessages, field: FieldLabel) {
  const label = m.labels[field];
  return { label, Label: label.charAt(0).toUpperCase() + label.slice(1) };
}

const n = (m: ApplicationValidationMessages, value: number) => num(m.locale as Locale, value);

/**
 * Names: letters (Bengali, English or any other script), spaces and . - ' only.
 * No digits, "/", ":", "@" or "_" — so a name can never carry a link or an email
 * address into the messages the organization sends (see cleanPersonName).
 */
function personName(m: ApplicationValidationMessages, field: FieldLabel) {
  const { min, max } = APPLICATION_LIMITS.name;
  const v = labelVars(m, field);
  return z
    .string()
    .min(1, { error: fmt(m.required, v) })
    .min(min, { error: fmt(m.min, { ...v, min: n(m, min) }) })
    .max(max, { error: fmt(m.max, { ...v, max: n(m, max) }) })
    .refine((s) => !HAS_DIGIT.test(s), { error: fmt(m.nameDigits, v) })
    .refine((s) => HAS_DIGIT.test(s) || PERSON_NAME_CHARS_RE.test(s), { error: fmt(m.nameChars, v) })
    .refine((s) => !PERSON_NAME_CHARS_RE.test(s) || HAS_LETTER.test(s), { error: fmt(m.nameInvalid, v) });
}

function text(m: ApplicationValidationMessages, field: FieldLabel, min: number, max: number) {
  const v = labelVars(m, field);
  return z
    .string()
    .min(1, { error: fmt(m.required, v) })
    .min(min, { error: fmt(m.min, { ...v, min: n(m, min) }) })
    .max(max, { error: fmt(m.max, { ...v, max: n(m, max) }) });
}

function schemaFor(today: string, m: ApplicationValidationMessages) {
  const L = APPLICATION_LIMITS;
  return z
    .object({
      full_name: personName(m, "full_name"),
      father_name: personName(m, "father_name"),
      mother_name: personName(m, "mother_name"),
      // One issue at most; every check here is "continuable", so the object-level
      // checks below always run (zod skips them after non-continuable issues).
      date_of_birth: z.string().superRefine((v, ctx) => {
        const message = !v
          ? m.dobRequired
          : !isCalendarDate(v)
            ? m.dobInvalid
            : v > today
              ? m.dobFuture
              : v < MIN_DOB
                ? fmt(m.dobTooOld, { year: n(m, 1920) })
                : null;
        if (message) ctx.addIssue({ code: "custom", message });
      }),
      nationality: text(m, "nationality", L.nationality.min, L.nationality.max),
      religion: z.string().refine((v) => (RELIGIONS as readonly string[]).includes(v), { error: m.religion }),
      religion_other: z.string(),
      occupation: text(m, "occupation", L.occupation.min, L.occupation.max),
      permanent_address: text(m, "permanent_address", L.address.min, L.address.max),
      present_address: text(m, "present_address", L.address.min, L.address.max),
      id_type: z.string().refine((v) => v === "nid" || v === "birth_reg", { error: m.idType }),
      id_number: z.string(),
      mobile: z.string().min(1, { error: m.mobileRequired }).regex(BD_MOBILE_RE, { error: m.mobileInvalid }),
      email: z
        .string()
        .max(L.email.max, { error: m.emailTooLong })
        .refine((v) => v === "" || z.email().safeParse(v).success, { error: m.emailInvalid }),
      blood_group: z
        .string()
        .refine((v) => v === "" || (BLOOD_GROUPS as readonly string[]).includes(v), { error: m.bloodGroup }),
      declaration: z.boolean().refine((v) => v, { error: m.declaration }),
      directory_consent: z.boolean(),
    })
    .superRefine((v, ctx) => {
      if (v.religion === OTHER_RELIGION) {
        const other = v.religion_other;
        if (other.length < L.religion.min || other.length > L.religion.max) {
          ctx.addIssue({
            code: "custom",
            path: ["religion_other"],
            message: other
              ? fmt(m.religionOtherLength, { min: n(m, L.religion.min), max: n(m, L.religion.max) })
              : m.religionOtherRequired,
          });
        }
      }
      const id = v.id_number;
      if (!id) {
        ctx.addIssue({ code: "custom", path: ["id_number"], message: idEmptyMessage(m, v.id_type) });
      } else if (!/^\d+$/.test(id)) {
        ctx.addIssue({ code: "custom", path: ["id_number"], message: m.idDigitsOnly });
      } else if (v.id_type === "nid" && ![10, 13, 17].includes(id.length)) {
        ctx.addIssue({ code: "custom", path: ["id_number"], message: fmt(m.nidLength, { count: n(m, id.length) }) });
      } else if (v.id_type === "birth_reg" && id.length !== 17) {
        ctx.addIssue({ code: "custom", path: ["id_number"], message: fmt(m.birthRegLength, { count: n(m, id.length) }) });
      }
    });
}

function idEmptyMessage(m: ApplicationValidationMessages, idType: string): string {
  if (idType === "nid") return m.idRequiredNid;
  if (idType === "birth_reg") return m.idRequiredBirthReg;
  return m.idRequired;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function bool(v: unknown): boolean {
  return v === true || v === "true" || v === "on" || v === "1";
}

/** Reads untrusted input (client state or anything posted to the server) into form values. */
export function readApplicationValues(raw: unknown): ApplicationValues {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    full_name: str(o.full_name).slice(0, 1000),
    father_name: str(o.father_name).slice(0, 1000),
    mother_name: str(o.mother_name).slice(0, 1000),
    date_of_birth: str(o.date_of_birth).slice(0, 40),
    nationality: str(o.nationality).slice(0, 1000),
    religion: str(o.religion).slice(0, 100),
    religion_other: str(o.religion_other).slice(0, 1000),
    occupation: str(o.occupation).slice(0, 1000),
    permanent_address: str(o.permanent_address).slice(0, 5000),
    same_address: bool(o.same_address),
    present_address: str(o.present_address).slice(0, 5000),
    id_type: str(o.id_type).slice(0, 20),
    id_number: str(o.id_number).slice(0, 100),
    mobile: str(o.mobile).slice(0, 100),
    email: str(o.email).slice(0, 1000),
    blood_group: str(o.blood_group).slice(0, 20),
    declaration: bool(o.declaration),
    directory_consent: bool(o.directory_consent),
  };
}

/** Normalised values: trimmed, Bengali digits converted, mobile/ID cleaned. */
export function prepareApplication(values: ApplicationValues): ApplicationValues {
  const permanent = cleanMultiline(values.permanent_address);
  const blood = values.blood_group.trim().toUpperCase().replace(/\s+/g, "");
  return {
    full_name: cleanPersonName(values.full_name),
    father_name: cleanPersonName(values.father_name),
    mother_name: cleanPersonName(values.mother_name),
    date_of_birth: normalizeDateInput(values.date_of_birth),
    nationality: cleanLine(values.nationality),
    religion: cleanLine(values.religion),
    religion_other: cleanLine(values.religion_other),
    occupation: cleanLine(values.occupation),
    permanent_address: permanent,
    same_address: values.same_address,
    present_address: values.same_address ? permanent : cleanMultiline(values.present_address),
    id_type: values.id_type.trim(),
    id_number: normalizeIdNumber(values.id_number),
    mobile: normalizeMobile(values.mobile),
    email: values.email.trim().toLowerCase(),
    // "জানা নেই" (don't know) and empty both mean: not given.
    blood_group: values.blood_group.trim() === UNKNOWN_BLOOD_GROUP ? "" : blood,
    declaration: values.declaration,
    directory_consent: values.directory_consent,
  };
}

export type ParseResult =
  | { ok: true; data: ApplicationInput }
  | { ok: false; fieldErrors: FieldErrors };

/**
 * Validates the whole application; messages in the language of `m`
 * (membership[lang].validation). `today` (YYYY-MM-DD, Asia/Dhaka) can be
 * injected for tests.
 */
export function parseApplication(raw: unknown, m: ApplicationValidationMessages, today: string = todayInDhaka()): ParseResult {
  const prepared = prepareApplication(readApplicationValues(raw));
  const result = schemaFor(today, m).safeParse(prepared);
  if (!result.success) {
    const fieldErrors: FieldErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as ApplicationField | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors };
  }
  const d = result.data;
  return {
    ok: true,
    data: {
      full_name: d.full_name,
      father_name: d.father_name,
      mother_name: d.mother_name,
      date_of_birth: d.date_of_birth,
      nationality: d.nationality,
      religion: d.religion === OTHER_RELIGION ? d.religion_other : d.religion,
      occupation: d.occupation,
      permanent_address: d.permanent_address,
      present_address: d.present_address,
      id_type: d.id_type as ApplicationInput["id_type"],
      id_number: d.id_number,
      mobile: d.mobile,
      email: d.email || null,
      blood_group: (d.blood_group || null) as ApplicationInput["blood_group"],
      declaration_accepted: true,
      directory_consent: d.directory_consent,
    },
  };
}

/** Errors for the fields of one step only (used before moving to the next step). */
export function stepErrors(raw: unknown, step: number, m: ApplicationValidationMessages, today?: string): FieldErrors {
  const result = parseApplication(raw, m, today);
  if (result.ok) return {};
  const fields = (STEP_FIELDS[step] ?? []) as readonly ApplicationField[];
  const out: FieldErrors = {};
  for (const f of fields) {
    if (result.fieldErrors[f]) out[f] = result.fieldErrors[f];
  }
  return out;
}

/** Index of the first step that has an error, or -1. */
export function firstErrorStep(errors: FieldErrors): number {
  return STEP_FIELDS.findIndex((fields) => (fields as readonly ApplicationField[]).some((f) => errors[f]));
}

/** First field (in form order) that has an error. */
export function firstErrorField(errors: FieldErrors): ApplicationField | null {
  for (const fields of STEP_FIELDS) {
    for (const f of fields) if (errors[f]) return f;
  }
  return null;
}

/** Declaration paragraphs with the {name} placeholder split out, so the name can be emphasised. */
export function declarationParts(paragraphs: readonly string[], name: string): { text: string; isName: boolean }[][] {
  return paragraphs.map((p) => {
    const pieces = p.split("{name}");
    const out: { text: string; isName: boolean }[] = [];
    pieces.forEach((piece, i) => {
      if (i > 0) out.push({ text: name, isName: true });
      if (piece) out.push({ text: piece, isName: false });
    });
    return out;
  });
}
