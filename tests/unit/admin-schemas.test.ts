import { describe, expect, it } from "vitest";
import {
  parseAbout,
  parseChangePassword,
  parseContactSettings,
  parseCreateStaff,
  parseDirectorySettings,
  parseMembershipSettings,
  parseNewRole,
  parseOrganization,
  parseRole,
  parseUpdateStaff,
} from "@/lib/admin/schemas";

const ROLE_ID = "6f0c2a59-2a3e-4c43-9d55-3e7c1b0e9a11";

describe("organization settings", () => {
  it("trims and collapses whitespace", () => {
    const r = parseOrganization({ name_bn: "  ইনকিলাব   যুব সংগঠন ", tagline: "অরাজনৈতিক", slogan: "স্লোগান", location: "কাশীপুর" });
    expect(r.ok && r.data.name_bn).toBe("ইনকিলাব যুব সংগঠন");
  });
  it("requires every field", () => {
    const r = parseOrganization({ name_bn: "", tagline: "x", slogan: "", location: "কাশীপুর" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.fieldErrors).sort()).toEqual(["name_bn", "slogan", "tagline"]);
      expect(r.fieldErrors.name_bn).toMatch(/লিখুন/);
    }
  });
  it("rejects over-long values", () => {
    const r = parseOrganization({ name_bn: "ক".repeat(121), tagline: "অরাজনৈতিক", slogan: "স্লোগান", location: "কাশীপুর" });
    expect(r.ok).toBe(false);
  });
});

describe("about settings", () => {
  it("keeps paragraphs, normalises line endings and blank lines", () => {
    const r = parseAbout({ what_is: "এক\r\n\r\n\r\n\r\nদুই  ", goal: "", objective: "উদ্দেশ্য", why: "কেন" });
    expect(r.ok && r.data.what_is).toBe("এক\n\nদুই");
    expect(r.ok && r.data.goal).toBe("");
  });
});

describe("contact settings", () => {
  const base = { address: "কাশীপুর", phone: "", email: "", facebook_url: "", map_url: "", office_hours: "" };

  it("turns empty optional fields into null", () => {
    const r = parseContactSettings(base);
    expect(r.ok && r.data).toEqual({
      address: "কাশীপুর",
      phone: null,
      email: null,
      facebook_url: null,
      map_url: null,
      office_hours: null,
      en: { address: null, office_hours: null },
    });
  });

  it("accepts Bangladeshi mobile and landline numbers in Bengali or ASCII digits", () => {
    for (const [input, out] of [
      ["০১৭১২-৩৪৫৬৭৮", "01712345678"],
      ["+880 1712 345678", "01712345678"],
      ["02-7641234", "027641234"],
    ]) {
      const r = parseContactSettings({ ...base, phone: input });
      expect(r.ok && r.data.phone).toBe(out);
    }
  });

  it("rejects invalid phone numbers", () => {
    for (const phone of ["12345", "01212345678", "0171234567", "abc"]) {
      const r = parseContactSettings({ ...base, phone });
      expect(r.ok, phone).toBe(false);
    }
  });

  it("validates email", () => {
    expect(parseContactSettings({ ...base, email: "Info@Example.COM" })).toMatchObject({ ok: true, data: { email: "info@example.com" } });
    expect(parseContactSettings({ ...base, email: "not-an-email" }).ok).toBe(false);
  });

  it("only accepts https facebook.com page links", () => {
    for (const url of [
      "https://www.facebook.com/profile.php?id=61566432706839",
      "https://facebook.com/inqilab",
      "https://m.facebook.com/inqilab",
    ]) {
      expect(parseContactSettings({ ...base, facebook_url: url }).ok, url).toBe(true);
    }
    for (const url of [
      "http://www.facebook.com/inqilab",
      "https://www.facebook.com/",
      "https://evil.com/facebook.com/x",
      "https://facebook.com.evil.com/x",
      "javascript:alert(1)",
      "https://user:pw@www.facebook.com/x",
    ]) {
      expect(parseContactSettings({ ...base, facebook_url: url }).ok, url).toBe(false);
    }
  });

  it("accepts a Google Maps embed URL or the whole iframe snippet", () => {
    const src = "https://www.google.com/maps/embed?pb=!1m18!1m12&amp;x=1";
    const r = parseContactSettings({ ...base, map_url: `<iframe src="${src}" width="600" height="450"></iframe>` });
    expect(r.ok && r.data.map_url).toBe("https://www.google.com/maps/embed?pb=!1m18!1m12&x=1");
    for (const url of ["https://maps.google.com/maps?q=x", "https://www.google.com/search?q=x", "http://www.google.com/maps/embed?pb=1", "https://evil.com/maps/embed"]) {
      expect(parseContactSettings({ ...base, map_url: url }).ok, url).toBe(false);
    }
  });
});

describe("membership settings", () => {
  const first = "আমি {name} এই মর্মে অঙ্গীকার করছি যে নিয়ম মেনে চলব।";

  it("accepts 1–6 paragraphs with {name} in the first", () => {
    const r = parseMembershipSettings({ is_open: false, declaration: [first, "দ্বিতীয় অনুচ্ছেদের লেখা এখানে।"] });
    expect(r).toEqual({ ok: true, data: { is_open: false, declaration: [first, "দ্বিতীয় অনুচ্ছেদের লেখা এখানে।"], en: { declaration: [] } } });
  });
  it("drops empty paragraphs", () => {
    const r = parseMembershipSettings({ is_open: true, declaration: ["", first, "   "] });
    expect(r.ok && r.data.declaration).toEqual([first]);
  });
  it("requires {name} in the first paragraph", () => {
    const r = parseMembershipSettings({ is_open: true, declaration: ["আমি এই মর্মে অঙ্গীকার করছি যে নিয়ম মেনে চলব।"] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors["declaration.0"]).toContain("{name}");
  });
  it("requires at least one and at most six paragraphs", () => {
    expect(parseMembershipSettings({ is_open: true, declaration: [] }).ok).toBe(false);
    expect(parseMembershipSettings({ is_open: true, declaration: "x" }).ok).toBe(false);
    const seven = [first, ...Array.from({ length: 6 }, (_, i) => `অনুচ্ছেদ নম্বর ${i} এর লেখা।`)];
    const r = parseMembershipSettings({ is_open: true, declaration: seven });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.declaration).toBeTruthy();
  });
  it("flags paragraphs that are too short", () => {
    const r = parseMembershipSettings({ is_open: true, declaration: [first, "ছোট"] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors["declaration.1"]).toBeTruthy();
  });
  it("reads only real booleans/checkbox values", () => {
    expect(parseDirectorySettings({ enabled: "on" })).toEqual({
      ok: true,
      data: { enabled: true, committee_term_bn: null, committee_term_en: null },
    });
    expect(parseDirectorySettings({ enabled: "yes please" })).toMatchObject({ ok: true, data: { enabled: false } });
  });
});

describe("staff accounts", () => {
  it("creates with a generated password by default", () => {
    const r = parseCreateStaff({ email: " New@Test.Local ", full_name: "নতুন সম্পাদক", role_id: ROLE_ID });
    expect(r.ok && r.data).toMatchObject({ email: "new@test.local", password_mode: "generate" });
  });
  it("checks a manual password", () => {
    expect(parseCreateStaff({ email: "a@b.co", full_name: "নাম লিখুন", role_id: ROLE_ID, password_mode: "manual", password: "short" }).ok).toBe(false);
    expect(parseCreateStaff({ email: "a@b.co", full_name: "নাম লিখুন", role_id: ROLE_ID, password_mode: "manual", password: " leadingspace1" }).ok).toBe(false);
    expect(parseCreateStaff({ email: "a@b.co", full_name: "নাম লিখুন", role_id: ROLE_ID, password_mode: "manual", password: "Long#enough1" }).ok).toBe(true);
  });
  it("requires a valid email, name and role", () => {
    const r = parseCreateStaff({ email: "nope", full_name: "", role_id: "admin" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fieldErrors).sort()).toEqual(["email", "full_name", "role_id"]);
  });
  it("parses an update", () => {
    expect(parseUpdateStaff({ full_name: "নাম", role_id: ROLE_ID, is_active: false })).toEqual({
      ok: true,
      data: { full_name: "নাম", role_id: ROLE_ID, is_active: false },
    });
  });
  it("canonicalises the role id (upper-case spelling of the same role)", () => {
    expect(parseUpdateStaff({ full_name: "নাম", role_id: ROLE_ID.toUpperCase(), is_active: true })).toEqual({
      ok: true,
      data: { full_name: "নাম", role_id: ROLE_ID.toLowerCase(), is_active: true },
    });
  });
});

describe("roles", () => {
  it("derives the key from the latin short name", () => {
    const r = parseNewRole({ name_bn: "সভাপতি", key: "Vice President", description: "", permissions: ["applications.view", "applications.view"] });
    expect(r.ok && r.data).toEqual({ name_bn: "সভাপতি", key: "vice_president", description: "", permissions: ["applications.view"] });
  });
  it("rejects a key without latin letters", () => {
    const r = parseNewRole({ name_bn: "সভাপতি", key: "সভাপতি", permissions: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.key).toBeTruthy();
  });
  it("validates name and description", () => {
    expect(parseRole({ name_bn: "ক", description: "" }).ok).toBe(false);
    expect(parseRole({ name_bn: "কোষাধ্যক্ষ", description: "ক".repeat(501) }).ok).toBe(false);
  });
});

describe("own password change", () => {
  it("requires matching, different, long-enough passwords", () => {
    expect(parseChangePassword({ current: "old-pass", next: "New#password1", confirm: "New#password1" }).ok).toBe(true);
    const mismatch = parseChangePassword({ current: "old-pass", next: "New#password1", confirm: "New#password2" });
    expect(!mismatch.ok && mismatch.fieldErrors.confirm).toBeTruthy();
    const same = parseChangePassword({ current: "Same#password1", next: "Same#password1", confirm: "Same#password1" });
    expect(!same.ok && same.fieldErrors.next).toBeTruthy();
    const short = parseChangePassword({ current: "x", next: "short", confirm: "short" });
    expect(!short.ok && short.fieldErrors.next).toBeTruthy();
    const missing = parseChangePassword({ next: "New#password1", confirm: "New#password1" });
    expect(!missing.ok && missing.fieldErrors.current).toBeTruthy();
  });
});
