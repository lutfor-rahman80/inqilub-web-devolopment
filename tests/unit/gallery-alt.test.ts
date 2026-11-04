import { describe, expect, it } from "vitest";
import type { GalleryPhoto } from "@/lib/gallery/types";
import { FULL_TARGET_BYTES } from "@/lib/gallery/limits";

// types.ts resolves storage URLs, which reads the public Supabase settings.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= "test-key";
const { photoAlt } = await import("@/lib/gallery/types");

const photo = (caption: string, category: GalleryPhoto["category"]): GalleryPhoto => ({
  id: "1", src: "", thumb: "", width: 1, height: 1, thumbWidth: 1, thumbHeight: 1, caption, eventDate: null, category,
});

describe("photoAlt (caption, else category name)", () => {
  it("uses the caption when there is one", () => {
    expect(photoAlt(photo("শীতবস্ত্র বিতরণ", null), 0)).toBe("শীতবস্ত্র বিতরণ");
    expect(photoAlt(photo("শীতবস্ত্র বিতরণ", null), 0, "en")).toBe("শীতবস্ত্র বিতরণ");
  });
  it("falls back to the category name in the page language", () => {
    const cat = { slug: "winter-clothing", name: "শীতবস্ত্র বিতরণ", nameEn: "Winter Clothing Distribution" };
    expect(photoAlt(photo("", cat), 2)).toBe("শীতবস্ত্র বিতরণ — ছবি ৩");
    expect(photoAlt(photo("", cat), 2, "en")).toBe("Winter Clothing Distribution — photo 3");
    expect(photoAlt(photo("", { ...cat, nameEn: null }), 0, "en")).toBe("শীতবস্ত্র বিতরণ — photo 1");
    expect(photoAlt(photo("", null), 0)).toBe("ছবি ১");
  });
  it("targets about 200 KB per photo", () => {
    expect(FULL_TARGET_BYTES).toBe(200 * 1024);
  });
});
