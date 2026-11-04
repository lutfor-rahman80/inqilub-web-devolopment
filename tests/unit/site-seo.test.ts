import { describe, expect, it } from "vitest";
import { breadcrumbJsonLd, faqPageJsonLd } from "@/lib/site/jsonld";
import { sitemapEntries } from "@/lib/site/sitemap";
import { pageMetadata, OG_DEFAULT_IMAGE } from "@/lib/site/metadata";
import { jsonLdString } from "@/lib/programs/jsonld";

describe("FAQPage JSON-LD", () => {
  it("lists the visible questions and answers in order", () => {
    const data = faqPageJsonLd(
      [
        { question: " প্রশ্ন এক? ", answer: "উত্তর এক।\r\n\r\nদ্বিতীয় অনুচ্ছেদ।" },
        { question: "Question two?", answer: "Answer two." },
      ],
      "https://example.org/faq",
      "bn",
    );
    expect(data).toEqual({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      url: "https://example.org/faq",
      inLanguage: "bn",
      mainEntity: [
        { "@type": "Question", name: "প্রশ্ন এক?", acceptedAnswer: { "@type": "Answer", text: "উত্তর এক।\n\nদ্বিতীয় অনুচ্ছেদ।" } },
        { "@type": "Question", name: "Question two?", acceptedAnswer: { "@type": "Answer", text: "Answer two." } },
      ],
    });
  });

  it("skips empty entries and returns null when nothing is left", () => {
    expect(faqPageJsonLd([{ question: " ", answer: "x" }, { question: "q?", answer: "" }], "u", "en")).toBeNull();
    expect(faqPageJsonLd([], "u", "en")).toBeNull();
  });

  it("cannot close the script element", () => {
    const json = jsonLdString(faqPageJsonLd([{ question: "</script><script>alert(1)</script>?", answer: "a" }], "u", "en"));
    expect(json).not.toContain("</script>");
    expect(JSON.parse(json).mainEntity[0].name).toBe("</script><script>alert(1)</script>?");
  });
});

describe("BreadcrumbList JSON-LD", () => {
  it("numbers the crumbs from 1 and drops empty names", () => {
    expect(
      breadcrumbJsonLd([
        { name: "হোম", url: "https://x.org/" },
        { name: "  ", url: "https://x.org/skip" },
        { name: "ঘোষণা", url: "https://x.org/announcements" },
      ]).itemListElement,
    ).toEqual([
      { "@type": "ListItem", position: 1, name: "হোম", item: "https://x.org/" },
      { "@type": "ListItem", position: 2, name: "ঘোষণা", item: "https://x.org/announcements" },
    ]);
  });
});

describe("sitemap entries", () => {
  it("lists every page in Bengali and English with hreflang alternates", () => {
    const entries = sitemapEntries(
      [
        { path: "/", changeFrequency: "weekly", priority: 1 },
        { path: "/faq", changeFrequency: "monthly", priority: 0.6, lastModified: "2026-10-28T00:00:00Z" },
      ],
      "https://x.org",
    );
    expect(entries.map((e) => e.url)).toEqual(["https://x.org/", "https://x.org/en", "https://x.org/faq", "https://x.org/en/faq"]);
    for (const e of entries.slice(2)) {
      expect(e.alternates?.languages).toEqual({ bn: "https://x.org/faq", en: "https://x.org/en/faq", "x-default": "https://x.org/faq" });
      expect(e.lastModified).toBe("2026-10-28T00:00:00Z");
    }
    expect(entries[0].lastModified).toBeUndefined();
  });
});

describe("page metadata", () => {
  it("English page: canonical /en path, hreflang alternates, OG locale and default image", () => {
    const m = pageMetadata({ lang: "en", title: "FAQ", description: "d", path: "/faq" });
    expect(m.alternates).toEqual({
      canonical: "/en/faq",
      languages: { bn: "/faq", en: "/en/faq", "x-default": "/faq" },
    });
    const og = m.openGraph as Record<string, unknown>;
    expect(og.locale).toBe("en_US");
    expect(og.alternateLocale).toEqual(["bn_BD"]);
    expect(og.url).toBe("/en/faq");
    expect(og.siteName).toBe("Inqilab Jubo Sangathan");
    expect((og.images as { url: string }[])[0].url).toBe(OG_DEFAULT_IMAGE.url);
    expect(JSON.stringify(m)).not.toContain("logo.png");
  });

  it("defaults to Bengali; articles carry their dates; noindex is optional", () => {
    const m = pageMetadata({
      title: "ঘোষণা",
      description: "d",
      path: "/announcements/1",
      type: "article",
      publishedTime: "2026-10-01",
      modifiedTime: "2026-10-02",
      noindex: true,
    });
    const og = m.openGraph as Record<string, unknown>;
    expect(og.locale).toBe("bn_BD");
    expect(og.publishedTime).toBe("2026-10-01");
    expect(og.modifiedTime).toBe("2026-10-02");
    expect(m.robots).toEqual({ index: false, follow: true });
    expect((m.alternates as { canonical: string }).canonical).toBe("/announcements/1");
  });
});
