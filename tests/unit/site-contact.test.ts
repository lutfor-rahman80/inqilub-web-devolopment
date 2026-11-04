import { describe, expect, it } from "vitest";
import { normalizeMobile, parseContact as parseWith, readContactValues, type ContactValues } from "@/lib/site/contact-schema";
import { contact } from "@/i18n/messages/contact";

/** Bengali messages (the page's language decides; Bengali is the default site language). */
const parseContact = (v: ContactValues) => parseWith(v, contact.bn.validation);

const base: ContactValues = {
  name: "আব্দুল করিম",
  mobile: "01712345678",
  email: "",
  subject: "সদস্য হওয়া প্রসঙ্গে",
  message: "আমি সংগঠনের কার্যক্রমে যুক্ত হতে চাই।",
};

describe("contact form validation", () => {
  it("accepts a valid message with mobile only", () => {
    const r = parseContact(base);
    expect(r).toEqual({ ok: true, data: { ...base, email: null } });
  });

  it("accepts email only (lower-cased) and stores null mobile", () => {
    const r = parseContact({ ...base, mobile: "", email: "Karim@Example.COM" });
    expect(r.ok && r.data).toMatchObject({ mobile: null, email: "karim@example.com" });
  });

  it("requires at least one of mobile or email", () => {
    const r = parseContact({ ...base, mobile: "", email: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fieldErrors.mobile).toMatch(/অন্তত একটি/);
      expect(r.fieldErrors.email).toMatch(/অন্তত একটি/);
    }
  });

  it("normalizes Bengali digits and +880 prefixes", () => {
    expect(normalizeMobile("০১৭১২৩৪৫৬৭৮")).toBe("01712345678");
    expect(normalizeMobile("+880 1712-345678")).toBe("01712345678");
    expect(normalizeMobile("8801712345678")).toBe("01712345678");
    const r = parseContact({ ...base, mobile: "+৮৮০ ১৯১২ ৩৪৫৬৭৮" });
    expect(r.ok && r.data.mobile).toBe("01912345678");
  });

  it.each(["01212345678", "0171234567", "017123456789", "1712345678", "abc"])("rejects mobile %s", (mobile) => {
    const r = parseContact({ ...base, mobile });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.mobile).toMatch(/সঠিক মোবাইল/);
  });

  it("rejects malformed email", () => {
    const r = parseContact({ ...base, email: "not-an-email" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.email).toBeTruthy();
  });

  it("enforces name, subject and message lengths", () => {
    const r = parseContact({ ...base, name: "ক", subject: "", message: "ছোট" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.fieldErrors).sort()).toEqual(["message", "name", "subject"]);
    }
    expect(parseContact({ ...base, message: "ক".repeat(5001) }).ok).toBe(false);
    expect(parseContact({ ...base, message: "ক".repeat(5000) }).ok).toBe(true);
  });

  it("reads only string form values, trimmed", () => {
    const fd = new Map<string, unknown>([
      ["name", "  নাম  "],
      ["mobile", 123],
      ["message", "লাইন ১\r\nলাইন ২  "],
    ]);
    expect(readContactValues((n) => fd.get(n))).toEqual({
      name: "নাম",
      mobile: "",
      email: "",
      subject: "",
      message: "লাইন ১\nলাইন ২",
    });
  });
});

describe("contact form validation in English", () => {
  it("returns English messages for the English page", () => {
    const r = parseWith({ ...base, mobile: "", email: "", message: "ছোট" }, contact.en.validation);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fieldErrors.mobile).toBe(contact.en.validation.replyRequired);
      expect(r.fieldErrors.message).toMatch(/at least 10 characters/);
    }
    const bad = parseWith({ ...base, mobile: "01212345678" }, contact.en.validation);
    expect(!bad.ok && bad.fieldErrors.mobile).toMatch(/valid Bangladeshi mobile/);
  });

  it("has a message for every Bengali key, all different from Bengali", () => {
    for (const key of Object.keys(contact.bn.validation) as (keyof typeof contact.bn.validation)[]) {
      expect(contact.en.validation[key]).toBeTruthy();
      expect(contact.en.validation[key]).not.toBe(contact.bn.validation[key]);
      expect(contact.en.validation[key]).not.toMatch(/[\u0980-\u09FF]/);
    }
  });
});
