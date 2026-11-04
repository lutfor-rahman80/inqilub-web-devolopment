import { describe, expect, it } from "vitest";
import { normalizeSettings, telHref } from "@/lib/site/safe-settings";
import { headerNav, isActivePath, publicNavLinks, type HeaderItem } from "@/components/site/nav";

const FB = "https://www.facebook.com/profile.php?id=61566432706839";

const valid = {
  organization: {
    name_bn: "ইনকিলাব যুব সংগঠন", tagline: "ট্যাগলাইন", slogan: "স্লোগান", location: "নারায়ণগঞ্জ",
    en: { name: "Inqilab Jubo Sangathan", tagline: "Tagline", slogan: "Slogan", location: "Narayanganj" },
  },
  about: {
    what_is: "পরিচিতি", goal: "লক্ষ্য", objective: "উদ্দেশ্য", why: "কেন",
    en: { what_is: "About", goal: "Goal", objective: "Objective", why: "Why" },
  },
  contact: {
    address: "ঠিকানা", phone: "01712345678", email: "a@b.org", facebook_url: FB, map_url: null, office_hours: null,
    en: { address: "Address", office_hours: null },
  },
  membership: { is_open: false, declaration: ["আমি {name} অঙ্গীকার করছি"], en: { declaration: ["I, {name}, pledge"] } },
  directory: { enabled: false, committee_term_bn: "২০২৬–২৭", committee_term_en: "2026–27" },
  social: { links: [{ platform: "youtube" as const, url: "https://www.youtube.com/@example" }] },
  quiz: { url: "https://quiz.example.org/", label_bn: "সীরাত কুইজ", label_en: "Seerat Quiz" },
};

describe("normalizeSettings", () => {
  it("keeps valid settings unchanged", () => {
    expect(normalizeSettings(valid)).toEqual(valid);
  });

  it("never passes a non-Facebook URL or a non-embed map URL through", () => {
    for (const url of ["https://evil.example/fb-login", "data:text/html,<script>alert(1)</script>", "javascript:alert(1)", "http://www.facebook.com/x"]) {
      const s = normalizeSettings({ ...valid, contact: { ...valid.contact, facebook_url: url, map_url: url } });
      expect(s.contact.facebook_url).toBeNull();
      expect(s.contact.map_url).toBeNull();
    }
    const ok = normalizeSettings({ ...valid, contact: { ...valid.contact, map_url: "https://www.google.com/maps/embed?pb=1" } });
    expect(ok.contact.map_url).toBe("https://www.google.com/maps/embed?pb=1");
  });

  it("turns wrong-typed values into 'not set' or the built-in defaults instead of crashing", () => {
    const s = normalizeSettings({
      organization: { name_bn: { x: 1 }, tagline: 5, slogan: null },
      about: { goal: ["a"], why: 7 },
      contact: { address: { x: 1 }, phone: 1712345678, email: "  ", office_hours: true },
      membership: { is_open: "yes", declaration: [1, "অনুচ্ছেদ", null, ""] },
      directory: "on",
    });
    expect(s.organization).toEqual({
      name_bn: "ইনকিলাব যুব সংগঠন",
      tagline: "একটি অরাজনৈতিক সামাজিক যুব সংগঠন",
      slogan: "আনতে সুপ্রভাত, পথ দেখাবে ইনকিলাব",
      location: "নারায়ণগঞ্জ",
      en: { name: "", tagline: "", slogan: "", location: "" },
    });
    expect(s.about).toEqual({ what_is: "", goal: "", objective: "", why: "", en: { what_is: "", goal: "", objective: "", why: "" } });
    expect(s.contact).toEqual({
      address: null, phone: null, email: null, facebook_url: null, map_url: null, office_hours: null,
      en: { address: null, office_hours: null },
    });
    expect(s.membership).toEqual({ is_open: true, declaration: ["অনুচ্ছেদ"], en: { declaration: [] } });
    expect(s.directory).toEqual({ enabled: true, committee_term_bn: null, committee_term_en: null });
    expect(s.social).toEqual({ links: [] });
    expect(s.quiz).toEqual({ url: null, label_bn: "সীরাত কুইজ", label_en: "Seerat Quiz" });
  });

  it("keeps only allow-listed https social links on the platform's own host, once per platform", () => {
    const s = normalizeSettings({
      ...valid,
      social: {
        links: [
          { platform: "youtube", url: "https://www.youtube.com/@ok" },
          { platform: "youtube", url: "https://www.youtube.com/@duplicate" },
          { platform: "instagram", url: "https://evil.example/instagram.com" },
          { platform: "tiktok", url: "javascript:alert(1)" },
          { platform: "myspace", url: "https://myspace.com/x" },
          { platform: "x", url: "http://x.com/insecure" },
          { platform: "telegram", url: "https://t.me/example" },
        ],
      },
    });
    expect(s.social.links).toEqual([
      { platform: "youtube", url: "https://www.youtube.com/@ok" },
      { platform: "telegram", url: "https://t.me/example" },
    ]);
  });

  it("accepts only an https quiz link", () => {
    expect(normalizeSettings({ ...valid, quiz: { url: "http://quiz.example.org" } }).quiz.url).toBeNull();
    expect(normalizeSettings({ ...valid, quiz: { url: "javascript:alert(1)" } }).quiz.url).toBeNull();
    expect(normalizeSettings({ ...valid, quiz: { url: "https://quiz.example.org/" } }).quiz.url).toBe("https://quiz.example.org/");
  });

  it("handles a completely missing or non-object value", () => {
    expect(normalizeSettings({}).about.goal).toBe("");
    expect(normalizeSettings(null as never).organization.name_bn).toBe("ইনকিলাব যুব সংগঠন");
  });
});

describe("telHref", () => {
  it.each([
    ["01712-345678", "tel:01712345678"],
    ["০১৭১২ ৩৪৫৬৭৮", "tel:01712345678"],
    ["+880 1712-345678", "tel:+8801712345678"],
    ["02-7641234", "tel:027641234"],
  ])("%s → %s", (input, expected) => {
    expect(telHref(input)).toBe(expected);
  });

  it("returns null when there is no number", () => {
    expect(telHref("নেই")).toBeNull();
  });
});

describe("isActivePath", () => {
  it("matches whole path segments only", () => {
    expect(isActivePath("/members", "/members")).toBe(true);
    expect(isActivePath("/members/abc", "/members")).toBe(true);
    expect(isActivePath("/membership", "/members")).toBe(false);
    expect(isActivePath("/membership/status", "/members")).toBe(false);
    expect(isActivePath("/announcements/1", "/announcements")).toBe(true);
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/about", "/")).toBe(false);
  });

  it("hides the directory link when the directory is disabled", () => {
    expect(publicNavLinks(false).map((l) => l.href)).not.toContain("/members");
    expect(publicNavLinks(true).map((l) => l.href)).toContain("/members");
  });
});

/** Organization decisions 2026-10-28: no Media dropdown; Gallery and Notice are top-level; Notice is always last. */
describe("menu order", () => {
  const labels = (items: HeaderItem[]) => items.map((i) => (i.type === "group" ? `${i.label} ▾` : i.label));
  const QUIZ = "https://quiz.example.org/";

  it("header (Bengali): হোম · পরিচিতি · কার্যক্রম ▾ · গ্যালারি · সদস্যবৃন্দ · ঘোষণা · প্রশ্নোত্তর · যোগাযোগ · Notice", () => {
    const items = headerNav({ directoryEnabled: true, quizUrl: null, quizLabel: "সীরাত কুইজ" }, "bn");
    expect(labels(items)).toEqual(["হোম", "পরিচিতি", "কার্যক্রম ▾", "গ্যালারি", "সদস্যবৃন্দ", "ঘোষণা", "প্রশ্নোত্তর", "যোগাযোগ", "Notice"]);
    const activities = items.find((i) => i.type === "group");
    expect(activities?.type === "group" && activities.items.map((l) => [l.label, l.href])).toEqual([
      ["কার্যক্রমের ক্ষেত্র", "/activities"],
      ["কর্মসূচি", "/programs"],
    ]);
    expect(items.filter((i) => i.type === "group")).toHaveLength(1);
    // FAQ only in the mobile drawer; the desktop bar must fit on one line.
    expect(items.find((i) => i.type === "link" && i.href === "/faq")).toMatchObject({ mobileOnly: true });
    expect(items.at(-1)).toMatchObject({ type: "link", href: "/notice", label: "Notice" });
  });

  it("header (English): Announcements, not Notices; Notice last even with the quiz link and without the directory", () => {
    const items = headerNav({ directoryEnabled: false, quizUrl: QUIZ, quizLabel: "Seerat Quiz" }, "en");
    expect(labels(items)).toEqual(["Home", "About", "Activities ▾", "Gallery", "Announcements", "FAQ", "Contact", "Seerat Quiz", "Notice"]);
    expect(items.at(-2)).toMatchObject({ type: "link", href: QUIZ, external: true });
    expect(items.at(-1)).toMatchObject({ type: "link", href: "/en/notice", label: "Notice" });
    expect(labels(items)).not.toContain("Notices");
    expect(labels(items).join(" ")).not.toMatch(/Media|Press/);
  });

  it("footer quick links: FAQ included, quiz before Notice, Notice last (both languages)", () => {
    expect(publicNavLinks(true, "bn").map((l) => l.label)).toEqual([
      "হোম", "আমাদের সম্পর্কে", "আমাদের কার্যক্রম", "কর্মসূচি", "গ্যালারি", "সদস্যবৃন্দ", "ঘোষণা", "প্রশ্নোত্তর", "যোগাযোগ", "Notice",
    ]);
    const en = publicNavLinks(true, "en", { url: QUIZ, label: "Seerat Quiz" });
    expect(en.map((l) => l.href)).toEqual([
      "/en", "/en/about", "/en/activities", "/en/programs", "/en/gallery", "/en/members", "/en/announcements", "/en/faq", "/en/contact", QUIZ, "/en/notice",
    ]);
    expect(en.at(-2)).toMatchObject({ external: true, label: "Seerat Quiz" });
    expect(en.at(-1)).toEqual({ href: "/en/notice", label: "Notice" });
    expect(en.map((l) => l.label)).toContain("Announcements");
  });
});
