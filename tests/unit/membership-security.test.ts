import { describe, expect, it } from "vitest";
import { EMPTY_APPLICATION, parseApplication, type ApplicationValues } from "@/lib/membership/schema";
import { cleanPersonName } from "@/lib/membership/normalize";
import { membership } from "@/i18n/messages/membership";
import { MIN_FILL_MS, START_TOKEN_MAX_AGE_MS, checkStartToken, signStartToken } from "@/lib/membership/start-token";

/**
 * Abuse protections of the public application form: names cannot carry links
 * or addresses into the organization's emails, and the minimum fill time is
 * measured by the server from a token it signed itself.
 */

const TODAY = "2026-10-27";
const BN = membership.bn.validation;
const valid: ApplicationValues = {
  ...EMPTY_APPLICATION,
  full_name: "মোঃ আব্দুল করিম",
  father_name: "মোঃ রহিম উদ্দিন",
  mother_name: "রাবেয়া খাতুন",
  date_of_birth: "1998-08-15",
  religion: "ইসলাম",
  occupation: "শিক্ষার্থী",
  permanent_address: "গ্রাম: কাশীপুর, ডাকঘর: ফতুল্লা, জেলা: নারায়ণগঞ্জ",
  same_address: true,
  id_type: "nid",
  id_number: "1234567890",
  mobile: "01712345678",
  declaration: true,
};

describe("person names cannot carry links or addresses", () => {
  const nameError = (full_name: string) => {
    const r = parseApplication({ ...valid, full_name }, BN, TODAY);
    return r.ok ? null : r.fieldErrors.full_name ?? null;
  };

  it("refuses URL and email characters", () => {
    for (const bad of ["Verify now at evil-example.com/login", "https:example", "victim@example", "a_b করিম", "করিম <b>"]) {
      expect(nameError(bad), bad).toMatch(/শুধু অক্ষর/);
    }
  });

  it("accepts ordinary Bengali and English names with . - '", () => {
    for (const ok of ["মোঃ আব্দুল করিম", "Md. Abdul Karim", "O'Neil Rahman", "আল-আমিন", "মো: করিম"]) {
      expect(nameError(ok), ok).toBeNull();
    }
  });

  it("breaks up domain-like text so mail clients do not link it", () => {
    expect(cleanPersonName("Verify at evil-example.com")).toBe("Verify at evil-example. com");
    expect(cleanPersonName("Md.Abdul")).toBe("Md. Abdul");
    expect(cleanPersonName("মো:করিম")).toBe("মোঃকরিম");
    const r = parseApplication({ ...valid, full_name: "Verify at evil-example.com" }, BN, TODAY);
    expect(r.ok && r.data.full_name).toBe("Verify at evil-example. com");
  });
});

describe("signed start token (minimum fill time on the server clock)", () => {
  const SECRET = "test-secret";
  const token = "0b5b8f5e-3d0c-4f7e-9a51-6a3c2f1e9d10";
  const t0 = 1_800_000_000_000;

  it("accepts a token after the minimum time and before it expires", () => {
    const start = signStartToken(SECRET, token, t0);
    expect(checkStartToken(SECRET, token, start, t0 + MIN_FILL_MS)).toBe("ok");
    expect(checkStartToken(SECRET, token, start, t0 + START_TOKEN_MAX_AGE_MS)).toBe("ok");
  });

  it("refuses a submission sooner than the minimum, and expired tokens", () => {
    const start = signStartToken(SECRET, token, t0);
    expect(checkStartToken(SECRET, token, start, t0 + MIN_FILL_MS - 1)).toBe("too_fast");
    expect(checkStartToken(SECRET, token, start, t0 + START_TOKEN_MAX_AGE_MS + 1)).toBe("expired");
  });

  it("refuses client-made, tampered or borrowed tokens", () => {
    const start = signStartToken(SECRET, token, t0);
    const later = t0 + 60_000;
    expect(checkStartToken(SECRET, token, null, later)).toBe("invalid");
    expect(checkStartToken(SECRET, token, { issuedAt: 0, sig: "x" }, later)).toBe("invalid");
    expect(checkStartToken(SECRET, token, { issuedAt: start.issuedAt - 10_000, sig: start.sig }, later)).toBe("invalid");
    expect(checkStartToken(SECRET, "1c6b8f5e-3d0c-4f7e-9a51-6a3c2f1e9d10", start, later)).toBe("invalid");
    expect(checkStartToken("other-secret", token, start, later)).toBe("invalid");
    expect(checkStartToken(SECRET, token, { issuedAt: "1", sig: start.sig }, later)).toBe("invalid");
  });
});
