import { describe, expect, it } from "vitest";
import { groupSecret, mfaRule, normalizeAal, normalizeTotpCode, safeAdminNext, tokenAal } from "@/lib/admin/mfa";
import { hotp, totp } from "../e2e/helpers/totp";

/** Two-step login helpers (pure). */

const jwt = (payload: object) => `x.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.y`;

describe("mfaRule", () => {
  it("super admins always need the second step; without a factor they must enrol", () => {
    expect(mfaRule("super_admin", "aal1", 0)).toEqual({ required: true, mustEnrol: true, satisfied: false });
    expect(mfaRule("super_admin", "aal1", 1)).toEqual({ required: true, mustEnrol: false, satisfied: false });
    expect(mfaRule("super_admin", "aal2", 1)).toEqual({ required: true, mustEnrol: false, satisfied: true });
  });
  it("a super admin whose last factor was removed is not satisfied by a stale aal2 token", () => {
    expect(mfaRule("super_admin", "aal2", 0)).toEqual({ required: true, mustEnrol: true, satisfied: false });
  });
  it("other staff: optional, but once enrolled it is required", () => {
    expect(mfaRule("secretary", "aal1", 0)).toEqual({ required: false, mustEnrol: false, satisfied: true });
    expect(mfaRule("secretary", "aal1", 2)).toEqual({ required: true, mustEnrol: false, satisfied: false });
    expect(mfaRule("secretary", "aal2", 2)).toEqual({ required: true, mustEnrol: false, satisfied: true });
    expect(mfaRule("content_editor", null, 1).satisfied).toBe(false);
  });
});

describe("tokenAal", () => {
  it("reads the aal claim and ignores anything else", () => {
    expect(tokenAal(jwt({ aal: "aal2" }))).toBe("aal2");
    expect(tokenAal(jwt({ aal: "aal1" }))).toBe("aal1");
    expect(tokenAal(jwt({ aal: "aal3" }))).toBeNull();
    expect(tokenAal(jwt({}))).toBeNull();
    expect(tokenAal("not a token")).toBeNull();
  });
  it("normalizeAal keeps only aal1 / aal2 (getAuthenticatorAssuranceLevel answers)", () => {
    expect(normalizeAal("aal2")).toBe("aal2");
    expect(normalizeAal("aal1")).toBe("aal1");
    expect(normalizeAal("AAL2")).toBeNull();
    expect(normalizeAal(undefined)).toBeNull();
    expect(normalizeAal(2)).toBeNull();
  });
});

describe("normalizeTotpCode", () => {
  it("accepts 6 digits in Bengali or ASCII, with spaces or a dash", () => {
    expect(normalizeTotpCode("১২৩ ৪৫৬")).toBe("123456");
    expect(normalizeTotpCode(" 123-456 ")).toBe("123456");
  });
  it("refuses anything else", () => {
    for (const v of ["12345", "1234567", "12345a", "", null, 123456]) expect(normalizeTotpCode(v)).toBeNull();
  });
});

describe("safeAdminNext", () => {
  it("only allows admin pages, never the sign-in pages or other sites", () => {
    expect(safeAdminNext("/admin/members?page=2")).toBe("/admin/members?page=2");
    for (const v of ["https://evil.com", "//evil.com", "/admin/login", "/admin/login/mfa", "/admin/login?x=1", "/about", "/admin\\evil", null]) {
      expect(safeAdminNext(v), String(v)).toBe("/admin");
    }
  });
});

describe("groupSecret", () => {
  it("groups the base32 secret in fours", () => {
    expect(groupSecret("ABCDEFGHIJKLMNOP")).toBe("ABCD EFGH IJKL MNOP");
  });
});

describe("test TOTP implementation (RFC 6238 vectors)", () => {
  it("matches the RFC test values", () => {
    const secret = Buffer.from("12345678901234567890");
    expect(hotp(secret, 1, 8)).toBe("94287082");
    expect(hotp(secret, Math.floor(1111111109 / 30), 8)).toBe("07081804");
    expect(totp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 59_000)).toBe("287082");
  });
});
