import { describe, expect, it } from "vitest";
import {
  normalizeSocialUrl,
  parseAbout,
  parseContactSettings,
  parseDirectorySettings,
  parseMembershipSettings,
  parseOrganization,
  
  parseSocialSettings,
} from "@/lib/admin/schemas";

/** Phase 2 website-content settings: English fields, committee term, social links, quiz link. */

const org = { name_bn: "ইনকিলাব যুব সংগঠন", tagline: "একটি সামাজিক যুব সংগঠন", slogan: "আনতে সুপ্রভাত", location: "নারায়ণগঞ্জ" };

describe("English fields (optional, Bengali fallback)", () => {
  it("organization: English values are trimmed and optional", () => {
    const r = parseOrganization({ ...org, en: { name: "  Inqilab   Jubo Sangathan ", tagline: "", slogan: "To bring a new dawn", location: "Narayanganj" } });
    expect(r).toEqual({
      ok: true,
      data: { ...org, en: { name: "Inqilab Jubo Sangathan", tagline: "", slogan: "To bring a new dawn", location: "Narayanganj" } },
    });
    // Missing English object = all empty (the English site then shows Bengali).
    const empty = parseOrganization(org);
    expect(empty.ok && empty.data.en).toEqual({ name: "", tagline: "", slogan: "", location: "" });
  });

  it("organization: English text has the same length limit, with an en.* error key", () => {
    const r = parseOrganization({ ...org, en: { name: "x".repeat(121) } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors["en.name"]).toContain("ইংরেজি");
  });

  it("about: multi-line English paragraphs keep their blank lines", () => {
    const r = parseAbout({ what_is: "", en: { what_is: "First.\r\n\r\n\r\nSecond.  ", goal: 5 } });
    expect(r.ok && r.data.en).toEqual({ what_is: "First.\n\nSecond.", goal: "", objective: "", why: "" });
  });

  it("contact: English address / office hours become null when empty", () => {
    const r = parseContactSettings({ address: "নারায়ণগঞ্জ", en: { address: "Narayanganj", office_hours: "  " } });
    expect(r.ok && r.data.en).toEqual({ address: "Narayanganj", office_hours: null });
  });
});

describe("membership: English reference translation of the pledge", () => {
  const bn = "আমি {name} এই মর্মে অঙ্গীকার করছি যে নিয়ম মেনে চলব।";
  it("is optional", () => {
    const r = parseMembershipSettings({ is_open: true, declaration: [bn], en: { declaration: ["", "  "] } });
    expect(r.ok && r.data.en).toEqual({ declaration: [] });
  });
  it("needs {name} in its first paragraph when given", () => {
    const r = parseMembershipSettings({ is_open: true, declaration: [bn], en: { declaration: ["I hereby pledge to follow the rules."] } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors["en.declaration.0"]).toContain("{name}");
    const ok = parseMembershipSettings({ is_open: true, declaration: [bn], en: { declaration: ["I, {name}, hereby pledge to follow the rules."] } });
    expect(ok.ok && ok.data.en.declaration).toEqual(["I, {name}, hereby pledge to follow the rules."]);
  });
  it("applies the paragraph count and length limits", () => {
    const seven = Array.from({ length: 7 }, () => "I, {name}, pledge this paragraph.");
    const r = parseMembershipSettings({ is_open: true, declaration: [bn], en: { declaration: seven } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors["en.declaration"]).toBeTruthy();
    const short = parseMembershipSettings({ is_open: true, declaration: [bn], en: { declaration: ["I, {name}, pledge.", "short"] } });
    expect(short.ok).toBe(false);
    if (!short.ok) expect(short.fieldErrors["en.declaration.1"]).toBeTruthy();
  });
});

describe("directory: committee term", () => {
  it("stores trimmed labels or null", () => {
    expect(parseDirectorySettings({ enabled: true, committee_term_bn: " কার্যনির্বাহী কমিটি ২০২৬–২৭ ", committee_term_en: "" })).toEqual({
      ok: true,
      data: { enabled: true, committee_term_bn: "কার্যনির্বাহী কমিটি ২০২৬–২৭", committee_term_en: null },
    });
  });
  it("limits the length", () => {
    const r = parseDirectorySettings({ enabled: true, committee_term_en: "x".repeat(81) });
    expect(r.ok).toBe(false);
  });
});

describe("social links", () => {
  it("accepts https links on each platform's own host", () => {
    const r = parseSocialSettings({
      links: [
        { platform: "youtube", url: " https://www.youtube.com/@inqilab " },
        { platform: "whatsapp", url: "https://whatsapp.com/channel/0029Va" },
        { platform: "telegram", url: "https://t.me/inqilab" },
      ],
    });
    expect(r).toEqual({
      ok: true,
      data: {
        links: [
          { platform: "youtube", url: "https://www.youtube.com/@inqilab" },
          { platform: "whatsapp", url: "https://whatsapp.com/channel/0029Va" },
          { platform: "telegram", url: "https://t.me/inqilab" },
        ],
      },
    });
  });

  it("refuses other hosts, http, credentials, bare sites and non-channel WhatsApp links", () => {
    const bad: [string, string][] = [
      ["youtube", "https://evil.com/youtube.com/x"],
      ["youtube", "http://www.youtube.com/@x"],
      ["youtube", "https://youtube.com.evil.com/x"],
      ["youtube", "https://user:pw@youtube.com/x"],
      ["youtube", "https://www.youtube.com/"],
      ["instagram", "javascript:alert(1)"],
      ["whatsapp", "https://www.whatsapp.com/download"],
      ["x", "https://x.com:8443/inqilab"],
    ];
    for (const [platform, url] of bad) {
      const r = parseSocialSettings({ links: [{ platform, url }] });
      expect(r.ok, `${platform} ${url}`).toBe(false);
      if (!r.ok) expect(r.fieldErrors["links.0.url"], url).toBeTruthy();
    }
  });

  it("refuses facebook (kept in contact), unknown platforms and duplicates", () => {
    for (const platform of ["facebook", "myspace", ""]) {
      const r = parseSocialSettings({ links: [{ platform, url: "https://facebook.com/x" }] });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.fieldErrors["links.0.platform"]).toBeTruthy();
    }
    const dup = parseSocialSettings({
      links: [
        { platform: "youtube", url: "https://youtube.com/@a" },
        { platform: "youtube", url: "https://youtube.com/@b" },
      ],
    });
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.fieldErrors["links.1.platform"]).toBeTruthy();
  });

  it("an empty list is valid (only Facebook, or nothing, is shown)", () => {
    expect(parseSocialSettings({ links: [] })).toEqual({ ok: true, data: { links: [] } });
    expect(parseSocialSettings({})).toEqual({ ok: true, data: { links: [] } });
  });

  it("normalizeSocialUrl mirrors the database rule", () => {
    expect(normalizeSocialUrl("whatsapp", "https://wa.me/8801700000000")).toBe("https://wa.me/8801700000000");
    expect(normalizeSocialUrl("x", "https://twitter.com/inqilab")).toBe("https://twitter.com/inqilab");
    expect(normalizeSocialUrl("linkedin", "https://www.linkedin.com")).toBeNull();
  });
});

