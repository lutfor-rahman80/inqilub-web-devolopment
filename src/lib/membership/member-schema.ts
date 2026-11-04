import { z } from "zod";
import { BLOOD_GROUPS, bn, toAsciiDigits } from "@/lib/format";
import {
  BD_MOBILE_RE,
  MEMBER_NO_RE,
  cleanLine,
  cleanMultiline,
  isCalendarDate,
  normalizeDateInput,
  normalizeMemberNo,
  normalizeMobile,
  todayInDhaka,
} from "./normalize";

/**
 * Admin member record validation (edit + "add existing paper-form member").
 * Mirrors the members table constraints, including the privacy rules the
 * database also enforces (directory/phone publication requires consent).
 */

export const MEMBER_STATUSES = ["active", "inactive", "archived"] as const;
export type MemberStatusValue = (typeof MEMBER_STATUSES)[number];

export type MemberField =
  | "member_no"
  | "full_name"
  | "designation_id"
  | "status"
  | "mobile"
  | "email"
  | "blood_group"
  | "joined_on"
  | "date_of_birth"
  | "sort_order"
  | "notes"
  | "directory_consent"
  | "show_in_directory"
  | "public_phone_consent"
  | "public_phone"
  | "guardian_consent";

export type MemberFieldErrors = Partial<Record<MemberField, string>>;

export type MemberInput = {
  full_name: string;
  designation_id: number;
  status: MemberStatusValue;
  mobile: string | null;
  email: string | null;
  blood_group: (typeof BLOOD_GROUPS)[number] | null;
  joined_on: string;
  /** Private; optional for paper-form members (copied from the application for approved ones). */
  date_of_birth: string | null;
  sort_order: number;
  notes: string | null;
  directory_consent: boolean;
  show_in_directory: boolean;
  public_phone_consent: boolean;
  public_phone: string | null;
  /** A guardian agreed to listing a member under 18 in the public directory. */
  guardian_consent: boolean;
};

export type MemberCreateInput = Omit<MemberInput, "status"> & { member_no: string | null };

/** Earliest accepted date of birth (the table requires date_of_birth > 1920-01-01). */
export const MIN_MEMBER_DOB = "1920-01-02";

const optionalMobile = z
  .string()
  .refine((v) => v === "" || BD_MOBILE_RE.test(v), { error: "সঠিক মোবাইল নম্বর দিন (যেমন: ০১৭১২৩৪৫৬৭৮)।" });

function fieldsSchema(today: string) {
  return z
    .object({
      full_name: z
        .string()
        .min(1, { error: "নাম লিখুন।" })
        .min(2, { error: "নাম কমপক্ষে ২ অক্ষরের হতে হবে।" })
        .max(120, { error: "নাম সর্বোচ্চ ১২০ অক্ষরের হতে পারে।" }),
      designation_id: z.string().refine((v) => /^\d{1,5}$/.test(v) && Number(v) > 0, { error: "পদবী নির্বাচন করুন।" }),
      status: z.string().refine((v) => (MEMBER_STATUSES as readonly string[]).includes(v), { error: "অবস্থা নির্বাচন করুন।" }),
      mobile: optionalMobile,
      email: z
        .string()
        .max(254, { error: "ইমেইল ঠিকানাটি অনেক বড়।" })
        .refine((v) => v === "" || z.email().safeParse(v).success, { error: "সঠিক ইমেইল ঠিকানা দিন।" }),
      blood_group: z
        .string()
        .refine((v) => v === "" || (BLOOD_GROUPS as readonly string[]).includes(v), { error: "তালিকা থেকে রক্তের গ্রুপ নির্বাচন করুন।" }),
      joined_on: z.string().superRefine((v, ctx) => {
        const message = !v
          ? "যোগদানের তারিখ দিন।"
          : !isCalendarDate(v)
            ? "সঠিক তারিখ দিন।"
            : v > today
              ? "যোগদানের তারিখ আজকের পরের হতে পারে না।"
              : v < "1950-01-01"
                ? "সঠিক তারিখ দিন।"
                : null;
        if (message) ctx.addIssue({ code: "custom", message });
      }),
      // Optional; the table requires date_of_birth > 1920-01-01.
      date_of_birth: z.string().superRefine((v, ctx) => {
        const message = !v
          ? null
          : !isCalendarDate(v)
            ? "সঠিক জন্ম তারিখ দিন (দিন/মাস/বছর)।"
            : v > today
              ? "জন্ম তারিখ আজকের পরের হতে পারে না।"
              : v < MIN_MEMBER_DOB
                ? "সঠিক জন্ম তারিখ দিন (১৯২০ সালের পরের)।"
                : null;
        if (message) ctx.addIssue({ code: "custom", message });
      }),
      sort_order: z
        .string()
        .refine((v) => /^-?\d{1,6}$/.test(v), { error: "ক্রম একটি পূর্ণ সংখ্যা হতে হবে (যেমন: ০, ১০, ২০)।" }),
      notes: z.string().max(1000, { error: `নোট সর্বোচ্চ ${bn(1000)} অক্ষরের হতে পারে।` }),
      directory_consent: z.boolean(),
      show_in_directory: z.boolean(),
      public_phone_consent: z.boolean(),
      public_phone: optionalMobile,
      guardian_consent: z.boolean(),
    })
    .superRefine((v, ctx) => {
      if (v.show_in_directory && !v.directory_consent) {
        ctx.addIssue({
          code: "custom",
          path: ["show_in_directory"],
          message: "সদস্যের সম্মতি ছাড়া সদস্য তালিকায় প্রকাশ করা যাবে না।",
        });
      }
      if (v.public_phone && !v.public_phone_consent) {
        ctx.addIssue({
          code: "custom",
          path: ["public_phone"],
          message: "সদস্যের সম্মতি ছাড়া ফোন নম্বর প্রকাশ করা যাবে না। নম্বরটি মুছে দিন অথবা সম্মতি চিহ্নিত করুন।",
        });
      }
      if (v.public_phone_consent && !v.public_phone) {
        ctx.addIssue({
          code: "custom",
          path: ["public_phone"],
          message: "প্রকাশের জন্য ফোন নম্বর লিখুন, অথবা সম্মতির ঘর থেকে টিক তুলে দিন।",
        });
      }
    });
}

type RawMember = Record<MemberField, string | boolean>;

/** Reads a submitted member form (FormData) into normalised raw values. */
export function readMemberForm(form: FormData): RawMember {
  const s = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : "";
  };
  const b = (k: string) => {
    const v = form.get(k);
    return v === "on" || v === "true" || v === "1";
  };
  const memberNo = cleanLine(s("member_no").slice(0, 100));
  return {
    member_no: memberNo ? normalizeMemberNo(memberNo) : "",
    full_name: cleanLine(s("full_name").slice(0, 1000)),
    designation_id: s("designation_id").trim(),
    status: s("status").trim() || "active",
    mobile: s("mobile").trim() ? normalizeMobile(s("mobile").slice(0, 100)) : "",
    email: s("email").trim().toLowerCase().slice(0, 1000),
    blood_group: s("blood_group").trim().toUpperCase().replace(/\s+/g, "").slice(0, 10),
    joined_on: normalizeDateInput(s("joined_on").slice(0, 40)),
    date_of_birth: normalizeDateInput(s("date_of_birth").slice(0, 40)),
    sort_order: s("sort_order").trim() === "" ? "0" : toAsciiDigits(s("sort_order")).replace(/\s+/g, "").slice(0, 20),
    notes: cleanMultiline(s("notes").slice(0, 5000)),
    directory_consent: b("directory_consent"),
    show_in_directory: b("show_in_directory"),
    public_phone_consent: b("public_phone_consent"),
    public_phone: s("public_phone").trim() ? normalizeMobile(s("public_phone").slice(0, 100)) : "",
    guardian_consent: b("guardian_consent"),
  };
}

function collect(issues: z.core.$ZodIssue[]): MemberFieldErrors {
  const out: MemberFieldErrors = {};
  for (const issue of issues) {
    const key = issue.path[0] as MemberField | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

function toInput(d: z.infer<ReturnType<typeof fieldsSchema>>): MemberInput {
  return {
    full_name: d.full_name,
    designation_id: Number(d.designation_id),
    status: d.status as MemberStatusValue,
    mobile: d.mobile || null,
    email: d.email || null,
    blood_group: (d.blood_group || null) as MemberInput["blood_group"],
    joined_on: d.joined_on,
    date_of_birth: d.date_of_birth || null,
    sort_order: Number(d.sort_order),
    notes: d.notes || null,
    directory_consent: d.directory_consent,
    show_in_directory: d.show_in_directory,
    public_phone_consent: d.public_phone_consent,
    public_phone: d.public_phone || null,
    guardian_consent: d.guardian_consent,
  };
}

export type MemberParse<T> = { ok: true; data: T } | { ok: false; fieldErrors: MemberFieldErrors };

export function parseMemberUpdate(raw: RawMember, today: string = todayInDhaka()): MemberParse<MemberInput> {
  const r = fieldsSchema(today).safeParse(raw);
  return r.success ? { ok: true, data: toInput(r.data) } : { ok: false, fieldErrors: collect(r.error.issues) };
}

export function parseMemberCreate(raw: RawMember, today: string = todayInDhaka()): MemberParse<MemberCreateInput> {
  const r = fieldsSchema(today).safeParse({ ...raw, status: "active" });
  const errors = r.success ? {} : collect(r.error.issues);
  const memberNo = typeof raw.member_no === "string" ? raw.member_no : "";
  if (memberNo && !MEMBER_NO_RE.test(memberNo)) {
    errors.member_no = "সদস্য নম্বর IJS-বছর-ক্রম আকারে লিখুন (যেমন: IJS-2024-0015), অথবা খালি রাখুন।";
  }
  if (!r.success || errors.member_no) return { ok: false, fieldErrors: errors };
  const { status: _status, ...rest } = toInput(r.data);
  void _status;
  return { ok: true, data: { ...rest, member_no: memberNo || null } };
}
