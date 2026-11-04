import { describe, expect, it } from "vitest";
import { toHeroSlides, type HeroPhoto } from "@/components/home/hero-slides";
import { home } from "@/i18n/messages/home";

function photo(over: Partial<HeroPhoto> = {}): HeroPhoto {
  return {
    id: "p1",
    src: "https://cdn.test/full.webp",
    thumb: "https://cdn.test/thumb.webp",
    width: 1600,
    height: 900,
    thumbWidth: 480,
    thumbHeight: 270,
    caption: "",
    eventDate: null,
    category: { slug: "winter-clothing", name: "শীতবস্ত্র বিতরণ", nameEn: "Winter clothing distribution" },
    program: null,
    ...over,
  };
}

const program = { slug: "winter-2026", titleBn: "শীতবস্ত্র বিতরণ ২০২৬", titleEn: "Winter clothing drive 2026", startsOn: "2026-01-10", endsOn: "2026-01-12" };
const fallback = { bn: home.bn.slider.fallbackLabel, en: home.en.slider.fallbackLabel };

describe("toHeroSlides", () => {
  it("program photo: program title, the photo's own date, link to the program page", () => {
    const [bn] = toHeroSlides([photo({ program, eventDate: "2026-01-11", caption: "কাশীপুরে শীতবস্ত্র বিতরণ" })], "bn", fallback.bn);
    expect(bn).toMatchObject({
      label: "শীতবস্ত্র বিতরণ ২০২৬",
      labelLang: undefined,
      date: "১১ জানুয়ারি ২০২৬",
      href: "/programs/winter-2026",
      link: "program",
      alt: "কাশীপুরে শীতবস্ত্র বিতরণ",
      altLang: undefined,
    });
    const [en] = toHeroSlides([photo({ program, eventDate: "2026-01-11", caption: "কাশীপুরে শীতবস্ত্র বিতরণ" })], "en", fallback.en);
    expect(en).toMatchObject({
      label: "Winter clothing drive 2026",
      labelLang: undefined,
      date: "11 January 2026",
      href: "/en/programs/winter-2026",
      // Captions are Bengali only: marked on English pages.
      alt: "কাশীপুরে শীতবস্ত্র বিতরণ",
      altLang: "bn",
    });
  });

  it("without an event date the program's dates are used (a range when it spans days)", () => {
    expect(toHeroSlides([photo({ program })], "bn", fallback.bn)[0].date).toBe("১০ জানুয়ারি ২০২৬ – ১২ জানুয়ারি ২০২৬");
    expect(toHeroSlides([photo({ program: { ...program, endsOn: null } })], "en", fallback.en)[0].date).toBe("10 January 2026");
  });

  it("a Bengali-only program title is marked lang=bn on English pages", () => {
    const [en] = toHeroSlides([photo({ program: { ...program, titleEn: null } })], "en", fallback.en);
    expect(en).toMatchObject({ label: "শীতবস্ত্র বিতরণ ২০২৬", labelLang: "bn", alt: "শীতবস্ত্র বিতরণ ২০২৬", altLang: "bn" });
  });

  it("no program: the category name (localized) and a link to the activity page", () => {
    const [bn] = toHeroSlides([photo({ eventDate: "2025-12-01" })], "bn", fallback.bn);
    expect(bn).toMatchObject({ label: "শীতবস্ত্র বিতরণ", date: "১ ডিসেম্বর ২০২৫", href: "/activities/winter-clothing", link: "activity", alt: "শীতবস্ত্র বিতরণ" });
    const [en] = toHeroSlides([photo()], "en", fallback.en);
    expect(en).toMatchObject({ label: "Winter clothing distribution", labelLang: undefined, date: null, href: "/en/activities/winter-clothing" });
    const [enFallback] = toHeroSlides([photo({ category: { slug: "x", name: "অন্যান্য", nameEn: null } })], "en", fallback.en);
    expect(enFallback).toMatchObject({ label: "অন্যান্য", labelLang: "bn" });
  });

  it("no program and no category: the caption, else the generic label; link to the gallery", () => {
    const [withCaption] = toHeroSlides([photo({ category: null, caption: "ইফতার আয়োজন" })], "en", fallback.en);
    expect(withCaption).toMatchObject({ label: "ইফতার আয়োজন", labelLang: "bn", href: "/en/gallery", link: "gallery" });
    const [bare] = toHeroSlides([photo({ category: null })], "bn", fallback.bn);
    expect(bare).toMatchObject({ label: "কার্যক্রমের ছবি", alt: "কার্যক্রমের ছবি", href: "/gallery", date: null });
  });

  it("srcset offers the thumbnail and the full photo; none when there is no thumbnail", () => {
    expect(toHeroSlides([photo()], "bn", fallback.bn)[0].srcSet).toBe("https://cdn.test/thumb.webp 480w, https://cdn.test/full.webp 1600w");
    expect(toHeroSlides([photo({ thumb: "https://cdn.test/full.webp" })], "bn", fallback.bn)[0].srcSet).toBeUndefined();
  });
});
