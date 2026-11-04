import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FmtText, splitTemplate } from "@/i18n/localized";
import { home } from "@/i18n/messages/home";
import { announcements } from "@/i18n/messages/announcements";

describe("splitTemplate", () => {
  it("splits at the placeholder", () => {
    expect(splitTemplate("View larger: {alt}", "alt")).toEqual(["View larger: ", ""]);
    expect(splitTemplate("{name} (no photo added)", "name")).toEqual(["", " (no photo added)"]);
    expect(splitTemplate("{name}-এর ছবি", "name")).toEqual(["", "-এর ছবি"]);
  });
  it("keeps the whole template when the placeholder is missing", () => {
    expect(splitTemplate("Share", "title")).toEqual(["Share", ""]);
  });
});

describe("FmtText", () => {
  it("marks only the inserted text with its language", () => {
    const html = renderToStaticMarkup(createElement(FmtText, { template: "Play video: {title}", name: "title", value: "যুব সমাজ", valueLang: "bn" }));
    expect(html).toBe('Play video: <span lang="bn">যুব সমাজ</span>');
  });
  it("adds no wrapper when the text is in the page's language", () => {
    const html = renderToStaticMarkup(createElement(FmtText, { template: "শেয়ার করুন: {title}", name: "title", value: "সভা" }));
    expect(html).toBe("শেয়ার করুন: সভা");
  });
});

describe("homepage and announcements wording", () => {
  it("the hero slider and the photo section have different names (unique landmarks)", () => {
    for (const lang of ["bn", "en"] as const) expect(home[lang].slider.label).not.toBe(home[lang].photos.title);
  });
  it("the Bengali announcements page uses the menu word ঘোষণা, never বিজ্ঞপ্তি (Notice is a separate page)", () => {
    expect(announcements.bn.title).toBe("ঘোষণা");
    for (const text of Object.values(announcements.bn)) expect(String(text)).not.toContain("বিজ্ঞপ্তি");
  });
});
