import { describe, expect, it } from "vitest";
import { FAQ_LIMITS, isFaqDirection, parseFaq } from "@/lib/faq/schemas";
import { parseAnnouncementForm } from "@/lib/site/announcement-schema";

describe("FAQ admin validation", () => {
  const base = { question_bn: "কীভাবে সদস্য হব?", answer_bn: "অনলাইন ফর্ম পূরণ করুন।", question_en: "", answer_en: "", is_published: false };

  it("accepts Bengali only; empty English becomes null", () => {
    expect(parseFaq(base)).toEqual({
      ok: true,
      data: { question_bn: "কীভাবে সদস্য হব?", answer_bn: "অনলাইন ফর্ম পূরণ করুন।", question_en: null, answer_en: null, is_published: false },
    });
  });

  it("normalizes whitespace and line breaks; reads the publish flag", () => {
    const r = parseFaq({ ...base, question_bn: "  কীভাবে   সদস্য হব?  ", answer_bn: "এক\r\n\r\n\r\n\r\nদুই  ", is_published: "on" });
    expect(r.ok && r.data).toMatchObject({ question_bn: "কীভাবে সদস্য হব?", answer_bn: "এক\n\nদুই", is_published: true });
  });

  it("requires the Bengali question and answer", () => {
    const r = parseFaq({ ...base, question_bn: "ক", answer_bn: "  " });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fieldErrors.question_bn).toMatch(/কমপক্ষে ৩ অক্ষর/);
      expect(r.fieldErrors.answer_bn).toBe("উত্তর লিখুন।");
    }
  });

  it("enforces the database limits", () => {
    expect(parseFaq({ ...base, question_bn: "ক".repeat(FAQ_LIMITS.questionMax + 1) }).ok).toBe(false);
    expect(parseFaq({ ...base, answer_bn: "ক".repeat(FAQ_LIMITS.answerMax + 1) }).ok).toBe(false);
    expect(parseFaq({ ...base, answer_bn: "ক".repeat(FAQ_LIMITS.answerMax) }).ok).toBe(true);
    expect(parseFaq({ ...base, question_en: "ab" }).ok).toBe(false);
  });

  it("an English answer needs an English question", () => {
    const r = parseFaq({ ...base, answer_en: "Fill in the online form." });
    expect(!r.ok && r.fieldErrors.question_en).toMatch(/ইংরেজি প্রশ্নও/);
    const ok = parseFaq({ ...base, question_en: "How can I become a member?", answer_en: "Fill in the online form." });
    expect(ok.ok && ok.data).toMatchObject({ question_en: "How can I become a member?", answer_en: "Fill in the online form." });
  });

  it("ignores non-string input and unknown keys", () => {
    const r = parseFaq({ question_bn: 42, answer_bn: ["x"], evil: "<script>" });
    expect(r.ok).toBe(false);
  });

  it("accepts only up/down as move directions", () => {
    expect(isFaqDirection("up")).toBe(true);
    expect(isFaqDirection("down")).toBe(true);
    expect(isFaqDirection("left")).toBe(false);
    expect(isFaqDirection(undefined)).toBe(false);
  });
});

describe("announcement admin validation (optional English)", () => {
  const base = { title: "সাধারণ সভা", body: "বিস্তারিত", title_en: "", body_en: "", is_published: true, is_pinned: false };

  it("stores empty English as null", () => {
    expect(parseAnnouncementForm(base)).toEqual({
      ok: true,
      data: { title: "সাধারণ সভা", body: "বিস্তারিত", title_en: null, body_en: null, is_published: true, is_pinned: false },
    });
  });

  it("keeps English title and body", () => {
    const r = parseAnnouncementForm({ ...base, title_en: " General   meeting ", body_en: "Details\r\n\r\nMore" });
    expect(r.ok && r.data).toMatchObject({ title_en: "General meeting", body_en: "Details\n\nMore" });
  });

  it("validates lengths and requires an English title with an English body", () => {
    expect(parseAnnouncementForm({ ...base, title: "ক" }).ok).toBe(false);
    expect(parseAnnouncementForm({ ...base, title_en: "x" }).ok).toBe(false);
    const r = parseAnnouncementForm({ ...base, body_en: "Only a body" });
    expect(!r.ok && r.fieldErrors.title_en).toMatch(/ইংরেজি শিরোনামও/);
    expect(parseAnnouncementForm({ ...base, body_en: "x".repeat(20001), title_en: "Title" }).ok).toBe(false);
  });
});
