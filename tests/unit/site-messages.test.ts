import { describe, expect, it } from "vitest";
import { about } from "@/i18n/messages/about";
import { activities } from "@/i18n/messages/activities";
import { announcements } from "@/i18n/messages/announcements";
import { contact } from "@/i18n/messages/contact";
import { faq } from "@/i18n/messages/faq";
import { gallery } from "@/i18n/messages/gallery";
import { privacy } from "@/i18n/messages/privacy";
import { seo } from "@/i18n/messages/seo";

/**
 * The pages module's dictionaries: the type system already requires the same
 * keys in both languages; these tests check the values (no empty strings, no
 * Bengali left in English, the same placeholders, the same privacy structure)
 * and that the old general address never appears.
 */
const BENGALI = /[ঀ-৿]/;
const all = { about, activities, announcements, contact, faq, gallery, privacy, seo };

function leaves(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((v, i) => leaves(v, `${path}[${i}]`));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  return [];
}
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe.each(Object.entries(all))("%s messages", (_name, dict) => {
  const bn = leaves(dict.bn);
  const en = new Map(leaves(dict.en));

  it("have a non-empty English text for every Bengali text", () => {
    for (const [path, text] of bn) {
      expect(text.trim(), `bn ${path}`).not.toBe("");
      expect(en.get(path)?.trim(), `en ${path}`).toBeTruthy();
    }
    expect(en.size).toBe(bn.length);
  });

  it("use the same placeholders in both languages", () => {
    for (const [path, text] of bn) expect(placeholders(en.get(path) ?? ""), path).toEqual(placeholders(text));
  });

  it("contain no Bengali script in English (except the language-switch link)", () => {
    for (const [path, text] of en) {
      if (path.startsWith("id") || path.endsWith(".id")) continue;
      expect(BENGALI.test(text), `en ${path}: ${text}`).toBe(false);
    }
  });

  it("never mention the old address", () => {
    for (const [, text] of [...bn, ...en]) {
      expect(text).not.toContain("কাশীপুর");
      expect(text).not.toContain("ফতুল্লা");
      expect(text.toLowerCase()).not.toContain("kashipur");
      expect(text.toLowerCase()).not.toContain("fatullah");
    }
  });
});

describe("privacy policy", () => {
  it("has the same sections (ids and block shapes) in both languages", () => {
    const shape = (s: typeof privacy.bn.sections) =>
      s.map((x) => ({ id: x.id, blocks: x.blocks.map((b) => ("p" in b ? "p" : `list:${b.list.length}`)) }));
    expect(shape(privacy.en.sections)).toEqual(shape(privacy.bn.sections));
    expect(privacy.en.summary.length).toBe(privacy.bn.summary.length);
  });

  it("covers the Phase 2 topics", () => {
    const ids = privacy.bn.sections.map((s) => s.id);
    for (const id of ["directory", "security", "public-content", "languages", "cookies", "your-rights"]) expect(ids).toContain(id);
    const text = JSON.stringify(privacy.bn);
    expect(text).toContain("১৮ বছরের কম");
    expect(text).toContain("দুই ধাপের লগইন");
    expect(text).toContain("CSP");
    expect(text).toContain("/en");
    const en = JSON.stringify(privacy.en);
    expect(en).toContain("under 18");
    expect(en).toContain("two-step login");
  });
});
