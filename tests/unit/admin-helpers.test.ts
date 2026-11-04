import { describe, expect, it } from "vitest";
import { auditSentence, describeAudit, type AuditRow } from "@/lib/admin/audit";
import { generatePassword } from "@/lib/admin/password";
import { sortRoles } from "@/lib/admin/roles";
import {
  dhakaDayEnd,
  dhakaDayStart,
  isIsoDate,
  multiLine,
  normalizePhone,
  oneLine,
  parsePageParam,
  slugifyRoleKey,
  canonicalUuid,
} from "@/lib/admin/text";

describe("text helpers", () => {
  it("normalises single- and multi-line input", () => {
    expect(oneLine("  a \n\t b  ")).toBe("a b");
    expect(oneLine(42)).toBe("");
    expect(multiLine("a  \r\nb\n\n\n\nc ")).toBe("a\nb\n\nc");
  });
  it("normalises phone numbers", () => {
    expect(normalizePhone("০১৭১২-৩৪৫ ৬৭৮")).toBe("01712345678");
    expect(normalizePhone("+8801712345678")).toBe("01712345678");
    expect(normalizePhone("8801712345678")).toBe("01712345678");
  });
  it("slugifies role keys", () => {
    expect(slugifyRoleKey("Vice President")).toBe("vice_president");
    expect(slugifyRoleKey("  2nd  Secretary!! ")).toBe("nd_secretary");
    expect(slugifyRoleKey("সভাপতি")).toBe("");
    expect(slugifyRoleKey("a".repeat(80))).toHaveLength(41);
  });
  it("parses page numbers safely", () => {
    expect(parsePageParam("৩")).toBe(3);
    expect(parsePageParam(["2", "5"])).toBe(2);
    for (const bad of ["0", "-1", "1e3", "abc", "", undefined, "99999999"]) expect(parsePageParam(bad)).toBe(1);
  });
  it("handles Bangladesh calendar days", () => {
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2026-1-1")).toBe(false);
    expect(dhakaDayStart("2026-10-27")).toBe("2026-10-26T18:00:00.000Z");
    expect(dhakaDayEnd("2026-10-27")).toBe("2026-10-27T18:00:00.000Z");
  });
});

describe("canonicalUuid", () => {
  it("lower-cases valid UUIDs so self checks cannot be bypassed by letter case", () => {
    expect(canonicalUuid("00000000-0000-4000-A000-00000000000F")).toBe("00000000-0000-4000-a000-00000000000f");
    expect(canonicalUuid("00000000-0000-4000-a000-000000000001")).toBe("00000000-0000-4000-a000-000000000001");
  });
  it("rejects anything else", () => {
    expect(canonicalUuid("00000000-0000-4000-a000-00000000000")).toBeNull();
    expect(canonicalUuid(" 00000000-0000-4000-a000-000000000001")).toBeNull();
    expect(canonicalUuid(42)).toBeNull();
    expect(canonicalUuid(undefined)).toBeNull();
  });
});

describe("generatePassword", () => {
  it("makes strong, varied passwords", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const p = generatePassword();
      expect(p).toHaveLength(14);
      expect(p).toMatch(/[a-z]/);
      expect(p).toMatch(/[A-Z]/);
      expect(p).toMatch(/[2-9]/);
      expect(p).toMatch(/[@#%+=?!*]/);
      expect(p).not.toMatch(/[0O1lI\s]/);
      seen.add(p);
    }
    expect(seen.size).toBe(200);
    expect(generatePassword(4)).toHaveLength(10);
  });
});

describe("sortRoles", () => {
  it("puts system roles in seniority order, then custom roles by name", () => {
    const sorted = sortRoles([
      { key: "zz_custom", name_bn: "খ" },
      { key: "secretary", name_bn: "সাধারণ সম্পাদক" },
      { key: "aa_custom", name_bn: "ক" },
      { key: "super_admin", name_bn: "সুপার অ্যাডমিন" },
    ]);
    expect(sorted.map((r) => r.key)).toEqual(["super_admin", "secretary", "aa_custom", "zz_custom"]);
  });
});

describe("describeAudit", () => {
  const base: Omit<AuditRow, "action" | "entity_type" | "details"> = {
    id: 1,
    actor_id: "11111111-1111-4111-8111-111111111111",
    actor_name: "সাধারণ সম্পাদক",
    entity_id: "22222222-2222-4222-8222-222222222222",
    created_at: "2026-10-27T03:00:00Z",
  };

  it("labels actions and entities in Bengali", () => {
    const v = describeAudit({
      ...base,
      action: "update",
      entity_type: "membership_applications",
      details: { changed: ["status", "reviewed_at", "decision_note"], values: { status: "approved", reviewed_at: "2026-10-27T03:00:00Z" } },
    });
    expect(v.action).toBe("পরিবর্তন");
    expect(v.entity).toBe("সদস্য আবেদন");
    expect(v.fields.find((f) => f.key === "status")?.value).toBe("অনুমোদিত");
    // Not a "safe" value: only the field name is shown.
    expect(v.fields.find((f) => f.key === "decision_note")).toEqual({ key: "decision_note", label: "সিদ্ধান্তের মন্তব্য", value: null });
    expect(v.fields.find((f) => f.key === "reviewed_at")?.value).toBeNull();
    expect(v.when).toContain("অক্টোবর");
  });

  it("never shows personal values, even if present in the log", () => {
    const v = describeAudit({
      ...base,
      action: "update",
      entity_type: "members",
      details: { changed: ["mobile", "full_name"], values: { mobile: "01712345678", full_name: "গোপন নাম" } },
    });
    const text = JSON.stringify(v);
    expect(text).not.toContain("01712345678");
    expect(text).not.toContain("গোপন নাম");
    expect(v.fields.map((f) => f.label)).toEqual(["মোবাইল", "নাম"]);
  });

  it("names the actor, or public/system when there is none", () => {
    expect(describeAudit({ ...base, actor_id: null, actor_name: null, action: "insert", entity_type: "membership_applications", details: {} }).actor).toBe("পাবলিক / সিস্টেম");
    expect(describeAudit({ ...base, actor_name: null, action: "insert", entity_type: "announcements", details: {} }).actor).toBe("অজানা ব্যবহারকারী");
  });

  it("uses lookups for related names and the current subject", () => {
    const roles = new Map([["r1", "সাধারণ সম্পাদক"]]);
    const staff = new Map([[base.entity_id!, "নতুন সম্পাদক"]]);
    const v = describeAudit(
      { ...base, action: "update", entity_type: "staff_profiles", details: { changed: ["role_id", "is_active"], values: { role_id: "r1", is_active: false } } },
      { roles, staff },
    );
    expect(v.subject).toBe("নতুন সম্পাদক");
    expect(v.fields).toEqual([
      { key: "role_id", label: "ভূমিকা", value: "সাধারণ সম্পাদক" },
      { key: "is_active", label: "সক্রিয়", value: "না" },
    ]);
    expect(auditSentence(v)).toBe("ব্যবহারকারী পরিবর্তন — “নতুন সম্পাদক”");
  });

  it("lists only displayable values for created/deleted rows", () => {
    const v = describeAudit({
      ...base,
      action: "insert",
      entity_type: "announcements",
      details: {
        changed: ["id", "title", "body", "is_published", "created_by", "published_at", "updated_at"],
        values: { id: "x", title: "ঈদ মোবারক", is_published: false, created_by: "abc", published_at: null },
      },
    });
    expect(v.subject).toBe("ঈদ মোবারক");
    expect(v.fields.map((f) => f.key)).toEqual(["title", "is_published"]);
  });

  it("describes account events and settings sections", () => {
    const reset = describeAudit({ ...base, action: "password_reset", entity_type: "staff_profiles", details: { changed: [], values: { full_name: "সম্পাদক" } } });
    expect(auditSentence(reset)).toBe("ব্যবহারকারী পাসওয়ার্ড রিসেট — “সম্পাদক”");
    // Entries written by the current function carry no name: the current one is looked up.
    const resetNow = describeAudit(
      { ...base, action: "password_reset", entity_type: "staff_profiles", entity_id: "u1", details: { changed: [], values: {} } },
      { staff: new Map([["u1", "নতুন নাম"]]) },
    );
    expect(auditSentence(resetNow)).toBe("ব্যবহারকারী পাসওয়ার্ড রিসেট — “নতুন নাম”");
    // Older settings entries (no field list): "content" only, never the bookkeeping column.
    const settings = describeAudit({ ...base, entity_id: "contact", action: "update", entity_type: "site_settings", details: { changed: ["value", "updated_by"], values: {} } });
    expect(settings.subject).toBe("যোগাযোগের তথ্য");
    expect(settings.fields.map((f) => f.label)).toEqual(["বিষয়বস্তু"]);
    // Current entries name the changed fields inside the section (names only).
    const fields = describeAudit({
      ...base,
      entity_id: "contact",
      action: "update",
      entity_type: "site_settings",
      details: { changed: ["value"], values: { key: "contact" }, fields: ["office_hours", "phone", "new_key"] },
    });
    expect(fields.fields.map((f) => [f.label, f.value])).toEqual([
      ["অফিস সময়", null],
      ["ফোন নম্বর", null],
      ["new_key", null],
    ]);
  });

  it("ignores inherited object keys", () => {
    const v = describeAudit({ ...base, action: "constructor", entity_type: "toString", details: { changed: ["constructor"], values: {} } });
    expect(v.action).toBe("constructor");
    expect(v.entity).toBe("toString");
    expect(v.fields[0].label).toBe("constructor");
  });
});
