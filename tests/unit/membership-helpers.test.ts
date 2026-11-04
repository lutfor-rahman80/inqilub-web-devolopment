import { describe, expect, it } from "vitest";
import {
  ageOn,
  cleanMultiline,
  cleanSearch,
  escapeLike,
  ilikePattern,
  normalizeMemberNo,
  normalizeMobile,
  normalizeTrackingNo,
  parsePositiveInt,
  todayInDhaka,
} from "@/lib/membership/normalize";
import { parseStatusQuery } from "@/lib/membership/status";
import { initials } from "@/lib/membership/display";
import { parseMemberCreate, parseMemberUpdate, readMemberForm } from "@/lib/membership/member-schema";
import { membership } from "@/i18n/messages/membership";

const STATUS_BN = membership.bn.statusValidation;

describe("normalisation", () => {
  it("normalises tracking and member numbers", () => {
    expect(normalizeTrackingNo(" ijs-a-২০২৬-০০০৭ ")).toBe("IJS-A-2026-0007");
    expect(normalizeTrackingNo("IJSA20260007")).toBe("IJS-A-2026-0007");
    expect(normalizeTrackingNo("IJS–A–2026–0007")).toBe("IJS-A-2026-0007");
    expect(normalizeTrackingNo("hello")).toBe("HELLO");
    expect(normalizeMemberNo("ijs ২০২৪ ০০১৫")).toBe("IJS-2024-0015");
  });

  it("normalises mobile numbers", () => {
    expect(normalizeMobile("+880-1712-345678")).toBe("01712345678");
    expect(normalizeMobile("(০১৭১২) ৩৪৫৬৭৮")).toBe("01712345678");
  });

  it("keeps line breaks in addresses but trims noise", () => {
    expect(cleanMultiline("  গ্রাম:  কাশীপুর \r\n\r\n\r\n  ফতুল্লা  ")).toBe("গ্রাম: কাশীপুর\n\nফতুল্লা");
  });

  it("computes age in completed years", () => {
    expect(ageOn("2000-10-28", "2026-10-27")).toBe(25);
    expect(ageOn("2000-10-27", "2026-10-27")).toBe(26);
    expect(ageOn("bad", "2026-10-27")).toBeNull();
    expect(todayInDhaka(new Date("2026-10-27T20:00:00Z"))).toBe("2026-10-28"); // UTC+6
  });

  it("parses page numbers safely", () => {
    expect(parsePositiveInt("৩")).toBe(3);
    expect(parsePositiveInt("0")).toBe(1);
    expect(parsePositiveInt("-2")).toBe(1);
    expect(parsePositiveInt("abc")).toBe(1);
    expect(parsePositiveInt(["4", "5"])).toBe(4);
    expect(parsePositiveInt(undefined, 7)).toBe(7);
  });
});

describe("search escaping", () => {
  it("escapes LIKE wildcards and strips PostgREST syntax", () => {
    expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\");
    expect(cleanSearch(' a,b (c) "d" *e* ')).toBe("a b c d e");
    expect(ilikePattern("করিম%")).toBe("%করিম\\%%");
    expect(ilikePattern("   ")).toBeNull();
    expect(ilikePattern(undefined)).toBeNull();
    expect(cleanSearch("x".repeat(200)).length).toBe(80);
  });
});

describe("status lookup input", () => {
  it("requires both values and normalises them", () => {
    expect(parseStatusQuery("ijs-a-২০২৬-০০০১", "+৮৮০১৭১২৩৪৫৬৭৮", STATUS_BN)).toEqual({
      ok: true,
      data: { application_no: "IJS-A-2026-0001", mobile: "01712345678" },
    });
    const r = parseStatusQuery("", "", STATUS_BN);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fieldErrors.application_no).toBe("ট্র্যাকিং নম্বর লিখুন।");
      expect(r.fieldErrors.mobile).toBe("আবেদনে দেওয়া মোবাইল নম্বর লিখুন।");
    }
    const bad = parseStatusQuery("IJS-2026-0001", "123", STATUS_BN);
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.fieldErrors.application_no).toMatch(/সঠিক ট্র্যাকিং নম্বর/);
      expect(bad.fieldErrors.mobile).toMatch(/সঠিক মোবাইল নম্বর/);
    }
    expect(parseStatusQuery(undefined, 5, STATUS_BN).ok).toBe(false);
  });
});

describe("initials", () => {
  it("skips honorific prefixes; one grapheme for Bengali names, two letters for Latin", () => {
    expect(initials("মোঃ করিম")).toBe("ক");
    expect(initials("আব্দুল করিম")).toBe("আ");
    expect(initials("ক্ষিতীশ রায়")).toBe("ক্ষি");
    expect(initials("Md. Rahim Uddin")).toBe("RU");
    expect(initials("")).toBe("?");
  });
});

function form(values: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, v);
  return f;
}

const baseMember = {
  full_name: "রহিম উদ্দিন",
  designation_id: "12",
  status: "active",
  joined_on: "2024-01-15",
  sort_order: "0",
};

describe("member schema", () => {
  it("accepts a minimal record", () => {
    const r = parseMemberUpdate(readMemberForm(form(baseMember)), "2026-10-27");
    expect(r).toMatchObject({ ok: true, data: { full_name: "রহিম উদ্দিন", designation_id: 12, mobile: null, show_in_directory: false } });
  });

  it("refuses directory publication or a public phone without consent", () => {
    const r = parseMemberUpdate(
      readMemberForm(form({ ...baseMember, show_in_directory: "on", public_phone: "01712345678" })),
      "2026-10-27",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fieldErrors.show_in_directory).toMatch(/সম্মতি ছাড়া/);
      expect(r.fieldErrors.public_phone).toMatch(/সম্মতি ছাড়া/);
    }
    const ok = parseMemberUpdate(
      readMemberForm(
        form({
          ...baseMember,
          directory_consent: "on",
          show_in_directory: "on",
          public_phone_consent: "on",
          public_phone: "০১৭১২৩৪৫৬৭৮",
        }),
      ),
      "2026-10-27",
    );
    expect(ok).toMatchObject({ ok: true, data: { show_in_directory: true, public_phone: "01712345678" } });
  });

  it("validates status, dates, sort order and contact fields", () => {
    const r = parseMemberUpdate(
      readMemberForm(form({ ...baseMember, status: "deleted", joined_on: "2030-01-01", sort_order: "abc", mobile: "123", email: "x@" })),
      "2026-10-27",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.fieldErrors).sort()).toEqual(["email", "joined_on", "mobile", "sort_order", "status"]);
    }
    expect(parseMemberUpdate(readMemberForm(form({ ...baseMember, sort_order: "-১০" })), "2026-10-27")).toMatchObject({
      ok: true,
      data: { sort_order: -10 },
    });
  });

  it("validates an optional manual member number on create", () => {
    expect(parseMemberCreate(readMemberForm(form({ ...baseMember, member_no: "" })), "2026-10-27")).toMatchObject({
      ok: true,
      data: { member_no: null },
    });
    expect(parseMemberCreate(readMemberForm(form({ ...baseMember, member_no: "ijs-২০২৪-০০১৫" })), "2026-10-27")).toMatchObject({
      ok: true,
      data: { member_no: "IJS-2024-0015" },
    });
    const bad = parseMemberCreate(readMemberForm(form({ ...baseMember, member_no: "IJS-A-2024-0015" })), "2026-10-27");
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.fieldErrors.member_no).toMatch(/IJS-বছর-ক্রম/);
  });
});
