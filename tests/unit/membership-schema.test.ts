import { describe, expect, it } from "vitest";
import {
  EMPTY_APPLICATION,
  STEP_FIELDS,
  declarationParts,
  firstErrorField,
  firstErrorStep,
  parseApplication,
  stepErrors,
  type ApplicationValues,
} from "@/lib/membership/schema";
import { membership } from "@/i18n/messages/membership";

const TODAY = "2026-10-27";
const BN = membership.bn.validation;

const valid: ApplicationValues = {
  ...EMPTY_APPLICATION,
  full_name: "  মোঃ   আব্দুল   করিম ",
  father_name: "মোঃ রহিম উদ্দিন",
  mother_name: "রাবেয়া খাতুন",
  date_of_birth: "1998-08-15",
  nationality: "বাংলাদেশী",
  religion: "ইসলাম",
  occupation: "শিক্ষার্থী",
  permanent_address: "গ্রাম: কাশীপুর, ডাকঘর: ফতুল্লা, জেলা: নারায়ণগঞ্জ",
  same_address: true,
  present_address: "",
  id_type: "nid",
  id_number: "1234567890",
  mobile: "01712345678",
  email: "",
  blood_group: "",
  declaration: true,
  directory_consent: false,
};

function errorsFor(patch: Partial<ApplicationValues>) {
  const r = parseApplication({ ...valid, ...patch }, BN, TODAY);
  return r.ok ? {} : r.fieldErrors;
}

describe("parseApplication — happy path", () => {
  it("accepts a complete application and normalises it", () => {
    const r = parseApplication(valid, BN, TODAY);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.full_name).toBe("মোঃ আব্দুল করিম");
    expect(r.data.present_address).toBe(r.data.permanent_address); // "same as permanent"
    expect(r.data.email).toBeNull();
    expect(r.data.blood_group).toBeNull();
    expect(r.data.declaration_accepted).toBe(true);
    expect(r.data.directory_consent).toBe(false);
    expect(r.data.id_type).toBe("nid");
  });

  it("does not send helper fields (same_address, religion_other) to the database", () => {
    const r = parseApplication(valid, BN, TODAY);
    expect(r.ok && Object.keys(r.data).sort()).toEqual(
      [
        "blood_group", "date_of_birth", "declaration_accepted", "directory_consent", "email", "father_name",
        "full_name", "id_number", "id_type", "mobile", "mother_name", "nationality", "occupation",
        "permanent_address", "present_address", "religion",
      ].sort(),
    );
  });

  it("converts Bengali digits in mobile, ID number and date", () => {
    const r = parseApplication(
      { ...valid, mobile: "০১৮১২-৩৪৫ ৬৭৮", id_number: "১২৩৪ ৫৬৭৮৯০১২৩", date_of_birth: "১৫/০৮/১৯৯৮" },
      BN,
      TODAY,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.mobile).toBe("01812345678");
    expect(r.data.id_number).toBe("1234567890123");
    expect(r.data.date_of_birth).toBe("1998-08-15");
  });

  it("accepts +880 / 880 prefixed mobile numbers", () => {
    for (const m of ["+8801712345678", "8801712345678", "+880 1712-345678", "+৮৮০১৭১২৩৪৫৬৭৮"]) {
      const r = parseApplication({ ...valid, mobile: m }, BN, TODAY);
      expect(r.ok && r.data.mobile, m).toBe("01712345678");
    }
  });

  it("keeps a separate present address when the checkbox is off", () => {
    const r = parseApplication({ ...valid, same_address: false, present_address: "ঢাকা, মিরপুর ১০" }, BN, TODAY);
    expect(r.ok && r.data.present_address).toBe("ঢাকা, মিরপুর ১০");
  });

  it("lower-cases and keeps a valid optional email", () => {
    const r = parseApplication({ ...valid, email: "  Karim@Example.COM " }, BN, TODAY);
    expect(r.ok && r.data.email).toBe("karim@example.com");
  });

  it("treats 'জানা নেই' blood group as not given and keeps valid groups", () => {
    expect(parseApplication({ ...valid, blood_group: "জানা নেই" }, BN, TODAY)).toMatchObject({ ok: true, data: { blood_group: null } });
    expect(parseApplication({ ...valid, blood_group: "ab+" }, BN, TODAY)).toMatchObject({ ok: true, data: { blood_group: "AB+" } });
  });

  it("uses the free-text religion when 'অন্যান্য' is chosen", () => {
    const r = parseApplication({ ...valid, religion: "অন্যান্য", religion_other: "শিখ" }, BN, TODAY);
    expect(r.ok && r.data.religion).toBe("শিখ");
  });

  it("accepts directory consent", () => {
    expect(parseApplication({ ...valid, directory_consent: true }, BN, TODAY)).toMatchObject({ ok: true, data: { directory_consent: true } });
  });
});

describe("parseApplication — errors (Bengali)", () => {
  it("requires every mandatory field with Bengali messages", () => {
    const r = parseApplication({}, BN, TODAY);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    const e = r.fieldErrors;
    expect(e.full_name).toBe("নাম লিখুন।");
    expect(e.father_name).toBe("পিতার নাম লিখুন।");
    expect(e.mother_name).toBe("মাতার নাম লিখুন।");
    expect(e.date_of_birth).toBe("জন্ম তারিখ দিন।");
    expect(e.religion).toBe("ধর্ম নির্বাচন করুন।");
    expect(e.occupation).toBe("পেশা লিখুন।");
    expect(e.permanent_address).toBe("স্থায়ী ঠিকানা লিখুন।");
    expect(e.present_address).toBe("বর্তমান ঠিকানা লিখুন।");
    expect(e.id_type).toBe("পরিচয়পত্রের ধরন নির্বাচন করুন।");
    expect(e.id_number).toBe("পরিচয়পত্র নম্বর লিখুন।");
    expect(e.mobile).toBe("মোবাইল নম্বর লিখুন।");
    expect(e.declaration).toBe("আবেদন জমা দিতে অঙ্গীকারনামায় সম্মতি দিন।");
    expect(e.email).toBeUndefined();
    expect(e.blood_group).toBeUndefined();
    // Default nationality is filled in by the form, but an empty value is an error.
    expect(e.nationality).toBe("জাতীয়তা লিখুন।");
  });

  it("checks name length and rejects digits in names", () => {
    expect(errorsFor({ full_name: "ক" }).full_name).toMatch(/কমপক্ষে ২ অক্ষরের/);
    expect(errorsFor({ full_name: "ক".repeat(121) }).full_name).toMatch(/সর্বোচ্চ ১২০ অক্ষরের/);
    expect(errorsFor({ father_name: "রহিম 2" }).father_name).toMatch(/সংখ্যা/);
    expect(errorsFor({ mother_name: "রাবেয়া ৩" }).mother_name).toMatch(/সংখ্যা/);
  });

  it("validates the date of birth", () => {
    expect(errorsFor({ date_of_birth: "2026-10-28" }).date_of_birth).toBe("জন্ম তারিখ আজকের পরের হতে পারে না।");
    expect(errorsFor({ date_of_birth: "2026-10-27" }).date_of_birth).toBeUndefined();
    expect(errorsFor({ date_of_birth: "1919-12-31" }).date_of_birth).toMatch(/১৯২০/);
    expect(errorsFor({ date_of_birth: "1920-01-01" }).date_of_birth).toMatch(/১৯২০/); // DB requires > 1920-01-01
    expect(errorsFor({ date_of_birth: "1920-01-02" }).date_of_birth).toBeUndefined();
    expect(errorsFor({ date_of_birth: "2001-02-29" }).date_of_birth).toMatch(/সঠিক জন্ম তারিখ/);
    expect(errorsFor({ date_of_birth: "15 Aug" }).date_of_birth).toMatch(/সঠিক জন্ম তারিখ/);
  });

  it("validates NID (10/13/17 digits) and birth registration (17 digits)", () => {
    for (const n of ["1234567890", "1234567890123", "12345678901234567"]) {
      expect(errorsFor({ id_type: "nid", id_number: n }).id_number, n).toBeUndefined();
    }
    for (const n of ["123456789", "12345678901", "123456789012345678"]) {
      expect(errorsFor({ id_type: "nid", id_number: n }).id_number, n).toMatch(/১০, ১৩ অথবা ১৭ সংখ্যার/);
    }
    expect(errorsFor({ id_type: "birth_reg", id_number: "12345678901234567" }).id_number).toBeUndefined();
    expect(errorsFor({ id_type: "birth_reg", id_number: "1234567890" }).id_number).toMatch(/১৭ সংখ্যার/);
    expect(errorsFor({ id_type: "nid", id_number: "12345abcde" }).id_number).toMatch(/শুধু সংখ্যা/);
    expect(errorsFor({ id_type: "nid", id_number: "" }).id_number).toBe("জাতীয় পরিচয়পত্র নম্বর লিখুন।");
    expect(errorsFor({ id_type: "passport" }).id_type).toBe("পরিচয়পত্রের ধরন নির্বাচন করুন।");
  });

  it("validates the Bangladeshi mobile number", () => {
    for (const m of ["01212345678", "0171234567", "017123456789", "+15551234567", "abc"]) {
      expect(errorsFor({ mobile: m }).mobile, m).toMatch(/সঠিক মোবাইল নম্বর/);
    }
    for (const m of ["01312345678", "01912345678"]) expect(errorsFor({ mobile: m }).mobile, m).toBeUndefined();
  });

  it("validates optional email and blood group", () => {
    expect(errorsFor({ email: "not-an-email" }).email).toMatch(/সঠিক ইমেইল/);
    expect(errorsFor({ blood_group: "C+" }).blood_group).toMatch(/রক্তের গ্রুপ/);
  });

  it("requires the religion name when 'অন্যান্য' is chosen", () => {
    expect(errorsFor({ religion: "অন্যান্য", religion_other: "" }).religion_other).toBe("ধর্মের নাম লিখুন।");
    expect(errorsFor({ religion: "নাস্তিক্য-বাদ-অজানা" }).religion).toBe("ধর্ম নির্বাচন করুন।");
  });

  it("validates addresses (5–500 characters)", () => {
    expect(errorsFor({ permanent_address: "ঢাকা" }).permanent_address).toMatch(/কমপক্ষে ৫ অক্ষরের/);
    expect(errorsFor({ same_address: false, present_address: "x".repeat(501) }).present_address).toMatch(/সর্বোচ্চ ৫০০/);
  });

  it("requires the declaration", () => {
    expect(errorsFor({ declaration: false }).declaration).toMatch(/অঙ্গীকারনামায় সম্মতি/);
  });

  it("ignores unexpected types instead of crashing", () => {
    const r = parseApplication({ ...valid, full_name: 42, declaration: "yes", mobile: ["01712345678"] }, BN, TODAY);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.fieldErrors.full_name).toBeDefined();
    expect(r.fieldErrors.mobile).toBeDefined();
    expect(r.fieldErrors.declaration).toBeDefined();
    expect(parseApplication(null, BN, TODAY).ok).toBe(false);
    expect(parseApplication("x", BN, TODAY).ok).toBe(false);
  });
});

describe("step helpers", () => {
  it("reports only the current step's errors", () => {
    const step0 = stepErrors({ ...EMPTY_APPLICATION, full_name: "করিম" }, 0, BN, TODAY);
    expect(Object.keys(step0).every((k) => (STEP_FIELDS[0] as readonly string[]).includes(k))).toBe(true);
    expect(step0.father_name).toBeDefined();
    expect(step0.full_name).toBeUndefined();
    expect(stepErrors(valid, 0, BN, TODAY)).toEqual({});
    expect(stepErrors(valid, 1, BN, TODAY)).toEqual({});
    expect(stepErrors(valid, 2, BN, TODAY)).toEqual({});
  });

  it("validates the 'other religion' field on step 1 even while later steps are empty", () => {
    const e = stepErrors({ ...EMPTY_APPLICATION, religion: "অন্যান্য" }, 0, BN, TODAY);
    expect(e.religion_other).toBe("ধর্মের নাম লিখুন।");
  });

  it("finds the first step and field with an error", () => {
    expect(firstErrorStep({ id_number: "x" })).toBe(2);
    expect(firstErrorStep({ declaration: "x", present_address: "y" })).toBe(1);
    expect(firstErrorStep({})).toBe(-1);
    expect(firstErrorField({ mobile: "x", father_name: "y" })).toBe("father_name");
  });
});

describe("declarationParts", () => {
  it("substitutes {name} and marks it for emphasis", () => {
    const parts = declarationParts(["আমি {name} এই মর্মে অঙ্গীকার করছি", "দ্বিতীয় অনুচ্ছেদ"], "করিম");
    expect(parts[0]).toEqual([
      { text: "আমি ", isName: false },
      { text: "করিম", isName: true },
      { text: " এই মর্মে অঙ্গীকার করছি", isName: false },
    ]);
    expect(parts[1]).toEqual([{ text: "দ্বিতীয় অনুচ্ছেদ", isName: false }]);
  });
});
