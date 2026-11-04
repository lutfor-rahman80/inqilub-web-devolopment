import { describe, expect, it } from "vitest";
import { RELIGIONS } from "@/lib/format";
import {
  APPLICATION_STEPS,
  DEFAULT_NATIONALITY,
  DEFAULT_NATIONALITY_EN,
  EMPTY_APPLICATION,
  carryOverValues,
  emptyApplication,
  hasApplicationValues,
  parseApplication,
  stepErrors,
  type ApplicationValues,
} from "@/lib/membership/schema";
import { parseStatusQuery } from "@/lib/membership/status";
import { isPubliclyListed, needsGuardianConsent } from "@/lib/membership/display";
import { parseMemberCreate, parseMemberUpdate, readMemberForm } from "@/lib/membership/member-schema";
import { membership } from "@/i18n/messages/membership";
import { members } from "@/i18n/messages/members";

/**
 * Bilingual membership: the same rules in both languages (only the messages
 * differ), language-neutral drafts, and the under-18 directory rule (same as
 * the public_members view).
 */

const TODAY = "2026-10-27";
const BN = membership.bn.validation;
const EN = membership.en.validation;

const valid: ApplicationValues = {
  ...EMPTY_APPLICATION,
  full_name: "Md. Abdul Karim",
  father_name: "Md. Rahim Uddin",
  mother_name: "Rabeya Khatun",
  date_of_birth: "1998-08-15",
  nationality: "Bangladeshi",
  religion: "ইসলাম",
  occupation: "Student",
  permanent_address: "Village: Kashipur, Post office: Fatullah, District: Narayanganj",
  same_address: true,
  id_type: "nid",
  id_number: "1234567890",
  mobile: "01712345678",
  declaration: true,
};

describe("application validation in English", () => {
  it("gives English messages for every required field", () => {
    const r = parseApplication({}, EN, TODAY);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    const e = r.fieldErrors;
    expect(e.full_name).toBe("Please enter your name.");
    expect(e.father_name).toBe("Please enter your father's name.");
    expect(e.mother_name).toBe("Please enter your mother's name.");
    expect(e.date_of_birth).toBe("Please enter your date of birth.");
    expect(e.nationality).toBe("Please enter your nationality.");
    expect(e.religion).toBe("Please choose your religion.");
    expect(e.occupation).toBe("Please enter your occupation.");
    expect(e.permanent_address).toBe("Please enter your permanent address.");
    expect(e.present_address).toBe("Please enter your present address.");
    expect(e.id_type).toBe("Please choose the type of ID.");
    expect(e.id_number).toBe("Please enter your ID number.");
    expect(e.mobile).toBe("Please enter your mobile number.");
    expect(e.declaration).toBe("Please accept the pledge to submit your application.");
  });

  it("uses ASCII digits in English and Bengali digits in Bengali", () => {
    const short = { ...valid, full_name: "K" };
    const en = parseApplication(short, EN, TODAY);
    const bn = parseApplication(short, BN, TODAY);
    expect(!en.ok && en.fieldErrors.full_name).toBe("Your name must be at least 2 characters long.");
    expect(!bn.ok && bn.fieldErrors.full_name).toBe("নাম কমপক্ষে ২ অক্ষরের হতে হবে।");
    const nid = { ...valid, id_number: "123" };
    const enNid = parseApplication(nid, EN, TODAY);
    expect(!enNid.ok && enNid.fieldErrors.id_number).toBe("A national ID number has 10, 13 or 17 digits (you entered 3).");
    const bnNid = parseApplication(nid, BN, TODAY);
    expect(!bnNid.ok && bnNid.fieldErrors.id_number).toContain("আপনি ৩টি সংখ্যা দিয়েছেন");
    const old = parseApplication({ ...valid, date_of_birth: "1919-12-31" }, EN, TODAY);
    expect(!old.ok && old.fieldErrors.date_of_birth).toBe("Please enter a valid date of birth (after 1920).");
    const other = parseApplication({ ...valid, religion: "অন্যান্য", religion_other: "x" }, EN, TODAY);
    expect(!other.ok && other.fieldErrors.religion_other).toBe("The name of the religion must be 2 to 60 characters long.");
  });

  it("applies exactly the same rules in both languages", () => {
    const cases: Partial<ApplicationValues>[] = [
      {},
      { full_name: "K" },
      { full_name: "রহিম 2" },
      { full_name: "a_b" },
      { full_name: "..." },
      { father_name: "x".repeat(121) },
      { date_of_birth: "2026-10-28" },
      { date_of_birth: "2001-02-29" },
      { date_of_birth: "1920-01-01" },
      { religion: "অন্যান্য", religion_other: "" },
      { religion: "Islam" }, // stored values stay Bengali: the English label is not a valid value
      { permanent_address: "abc" },
      { same_address: false, present_address: "" },
      { id_type: "birth_reg", id_number: "1234567890" },
      { id_number: "12a" },
      { mobile: "0171234567" },
      { email: "x@" },
      { blood_group: "C+" },
      { declaration: false },
      { nationality: "" },
    ];
    for (const patch of cases) {
      const en = parseApplication({ ...valid, ...patch }, EN, TODAY);
      const bn = parseApplication({ ...valid, ...patch }, BN, TODAY);
      expect(en.ok, JSON.stringify(patch)).toBe(bn.ok);
      if (!en.ok && !bn.ok) expect(Object.keys(en.fieldErrors).sort(), JSON.stringify(patch)).toEqual(Object.keys(bn.fieldErrors).sort());
      if (en.ok && bn.ok) expect(en.data).toEqual(bn.data);
    }
    expect(parseApplication(valid, EN, TODAY).ok).toBe(true);
  });

  it("stores the same payload whatever the page language (Bengali select values)", () => {
    const r = parseApplication({ ...valid, blood_group: "জানা নেই", religion: "অন্যান্য", religion_other: "Sikh" }, EN, TODAY);
    expect(r).toMatchObject({ ok: true, data: { blood_group: null, religion: "Sikh", nationality: "Bangladeshi" } });
  });

  it("checks one step at a time in English too", () => {
    const e = stepErrors({ ...EMPTY_APPLICATION, full_name: "Karim" }, 0, EN, TODAY);
    expect(e.full_name).toBeUndefined();
    expect(e.father_name).toBe("Please enter your father's name.");
    expect(e.mobile).toBeUndefined();
  });
});

describe("draft across a language switch", () => {
  it("starts each language with its own nationality, which does not count as input", () => {
    expect(emptyApplication("bn").nationality).toBe(DEFAULT_NATIONALITY);
    expect(emptyApplication("en").nationality).toBe(DEFAULT_NATIONALITY_EN);
    expect(hasApplicationValues(emptyApplication("bn"))).toBe(false);
    expect(hasApplicationValues(emptyApplication("en"))).toBe(false);
    expect(hasApplicationValues({ ...emptyApplication("en"), full_name: "K" })).toBe(true);
    expect(hasApplicationValues({ ...emptyApplication("en"), nationality: "British" })).toBe(true);
  });

  it("swaps only an untouched pre-filled nationality", () => {
    const typed = { ...emptyApplication("bn"), full_name: "করিম", id_number: "1234567890" };
    expect(carryOverValues(typed, "en")).toEqual({ ...typed, nationality: "Bangladeshi" });
    expect(carryOverValues({ ...typed, nationality: "Bangladeshi" }, "bn").nationality).toBe("বাংলাদেশী");
    expect(carryOverValues({ ...typed, nationality: "ভারতীয়" }, "en").nationality).toBe("ভারতীয়");
  });
});

describe("status look-up in English", () => {
  it("returns English messages", () => {
    const r = parseStatusQuery("", "", membership.en.statusValidation);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fieldErrors.application_no).toBe("Please enter the tracking number.");
      expect(r.fieldErrors.mobile).toBe("Please enter the mobile number given in your application.");
    }
    expect(parseStatusQuery("ijs-a-2026-0001", "01712345678", membership.en.statusValidation)).toEqual({
      ok: true,
      data: { application_no: "IJS-A-2026-0001", mobile: "01712345678" },
    });
  });
});

describe("messages", () => {
  it("have one title per step and one label per religion in both languages", () => {
    for (const lang of ["bn", "en"] as const) {
      const f = membership[lang].form;
      expect(f.steps).toHaveLength(APPLICATION_STEPS.length);
      expect(f.stepsShort).toHaveLength(APPLICATION_STEPS.length);
      expect(f.religions).toHaveLength(RELIGIONS.length);
      expect(membership[lang].success.nextSteps).toHaveLength(3);
      expect(Object.keys(membership[lang].statusLabels).sort()).toEqual(["approved", "pending", "rejected", "under_review"]);
    }
    expect(membership.bn.form.religions).toEqual([...RELIGIONS]);
    expect(membership.en.statusLabels.under_review).toBe("Under review");
    expect(members.en.count.found).toContain("{count}");
  });

  it("keep the Bengali texts the earlier Bengali-only site used", () => {
    expect(membership.bn.statusLabels).toEqual({ pending: "অপেক্ষমাণ", under_review: "যাচাই চলছে", approved: "অনুমোদিত", rejected: "প্রত্যাখ্যাত" });
    expect(membership.bn.server.duplicateId).toContain("ইতিমধ্যে একটি আবেদন জমা আছে");
  });
});

describe("under-18 directory rule (same as the public_members view)", () => {
  const listed = { status: "active", show_in_directory: true, directory_consent: true, guardian_consent: false };

  it("hides members under 18 until a guardian's consent is recorded", () => {
    const minor = { ...listed, date_of_birth: "2011-06-01" }; // 15 on 2026-10-27
    expect(needsGuardianConsent(minor, TODAY)).toBe(true);
    expect(isPubliclyListed(minor, TODAY)).toBe(false);
    expect(isPubliclyListed({ ...minor, guardian_consent: true }, TODAY)).toBe(true);
  });

  it("lists adults and members without a recorded date of birth", () => {
    expect(isPubliclyListed({ ...listed, date_of_birth: "1990-01-01" }, TODAY)).toBe(true);
    expect(isPubliclyListed({ ...listed, date_of_birth: null }, TODAY)).toBe(true);
  });

  it("switches on the 18th birthday (Asia/Dhaka date), also for 29 February", () => {
    expect(isPubliclyListed({ ...listed, date_of_birth: "2008-10-27" }, TODAY)).toBe(true);
    expect(isPubliclyListed({ ...listed, date_of_birth: "2008-10-28" }, TODAY)).toBe(false);
    // Postgres: date '2026-02-28' - interval '18 years' = 2008-02-28 < 2008-02-29.
    expect(isPubliclyListed({ ...listed, date_of_birth: "2008-02-29" }, "2026-02-28")).toBe(false);
    expect(isPubliclyListed({ ...listed, date_of_birth: "2008-02-29" }, "2026-03-01")).toBe(true);
  });

  it("still requires active + shown + consent", () => {
    const adult = { ...listed, date_of_birth: "1990-01-01" };
    expect(isPubliclyListed({ ...adult, status: "inactive" }, TODAY)).toBe(false);
    expect(isPubliclyListed({ ...adult, show_in_directory: false }, TODAY)).toBe(false);
    expect(isPubliclyListed({ ...adult, directory_consent: false, guardian_consent: true }, TODAY)).toBe(false);
  });
});

describe("member record: private date of birth and guardian consent", () => {
  const form = (values: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(values)) f.set(k, v);
    return f;
  };
  const base = { full_name: "রহিম উদ্দিন", designation_id: "12", status: "active", joined_on: "2024-01-15", sort_order: "0" };

  it("keeps the date of birth optional", () => {
    expect(parseMemberCreate(readMemberForm(form(base)), TODAY)).toMatchObject({
      ok: true,
      data: { date_of_birth: null, guardian_consent: false },
    });
  });

  it("accepts Bengali digits and day/month/year, and the guardian consent", () => {
    expect(
      parseMemberUpdate(readMemberForm(form({ ...base, date_of_birth: "০১/০৬/২০১১", guardian_consent: "on" })), TODAY),
    ).toMatchObject({ ok: true, data: { date_of_birth: "2011-06-01", guardian_consent: true } });
  });

  it("refuses impossible, future and too-early dates", () => {
    for (const [dob, msg] of [
      ["2026-10-28", /আজকের পরের/],
      ["1920-01-01", /১৯২০/],
      ["2011-02-30", /সঠিক জন্ম তারিখ/],
    ] as const) {
      const r = parseMemberUpdate(readMemberForm(form({ ...base, date_of_birth: dob })), TODAY);
      expect(r.ok, dob).toBe(false);
      if (!r.ok) expect(r.fieldErrors.date_of_birth, dob).toMatch(msg);
    }
  });
});
