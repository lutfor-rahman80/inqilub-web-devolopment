import { describe, expect, it } from "vitest";
import { facebookShareUrl, isUuid, safeFacebookUrl, safeMapEmbedUrl } from "@/lib/site/urls";
import { excerpt, firstSentence, pageWindow, parsePage, toParagraphs } from "@/lib/site/text";

describe("safeFacebookUrl", () => {
  it.each([
    "https://www.facebook.com/profile.php?id=61566432706839",
    "https://facebook.com/inqilab",
    "https://m.facebook.com/inqilab",
  ])("accepts %s", (url) => {
    expect(safeFacebookUrl(url)).toBe(url);
  });

  it.each([
    null,
    "",
    "not a url",
    "http://www.facebook.com/x",
    "https://evil.com/?https://www.facebook.com",
    "https://www.facebook.com.evil.com/x",
    "https://facebook.co/x",
    "https://user:pass@www.facebook.com/x",
    "https://www.facebook.com:8443/x",
    "javascript:alert(1)//facebook.com",
  ])("rejects %s", (url) => {
    expect(safeFacebookUrl(url)).toBeNull();
  });
});

describe("safeMapEmbedUrl", () => {
  it("accepts Google Maps embed URLs", () => {
    const url = "https://www.google.com/maps/embed?pb=!1m18!1m12";
    expect(safeMapEmbedUrl(url)).toBe(url);
  });
  it.each([
    "https://www.google.com/maps/place/x",
    "http://www.google.com/maps/embed?pb=1",
    "https://maps.google.com/maps/embed?pb=1",
    "https://evil.com/maps/embed",
    "javascript:alert(1)",
    null,
  ])("rejects %s", (url) => {
    expect(safeMapEmbedUrl(url)).toBeNull();
  });
});

describe("facebookShareUrl / isUuid", () => {
  it("encodes the page URL", () => {
    expect(facebookShareUrl("https://x.test/a?b=1&c=2")).toBe(
      "https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fx.test%2Fa%3Fb%3D1%26c%3D2",
    );
  });
  it("validates uuids", () => {
    expect(isUuid("0b7c8d2e-1f3a-4b5c-8d9e-0f1a2b3c4d5e")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("0b7c8d2e-1f3a-4b5c-8d9e-0f1a2b3c4d5e' or 1=1")).toBe(false);
  });
});

describe("text helpers", () => {
  it("splits paragraphs on blank lines and keeps single line breaks", () => {
    expect(toParagraphs("এক\nদুই\n\n  \nতিন\r\n\r\nচার")).toEqual(["এক\nদুই", "তিন", "চার"]);
    expect(toParagraphs("")).toEqual([]);
    expect(toParagraphs(null)).toEqual([]);
  });

  it("shortens long text at a word boundary", () => {
    expect(excerpt("ছোট লেখা", 50)).toBe("ছোট লেখা");
    const long = "আমরা জানি, আদর্শবান যুবকরাই একটি জাতির কর্ণধার। তারা জাতিকে নেতৃত্ব দিয়ে থাকে।";
    const out = excerpt(long, 30);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(31);
    expect(long.startsWith(out.slice(0, -1))).toBe(true);
  });

  it("takes the first Bengali sentence", () => {
    expect(firstSentence("প্রথম বাক্য। দ্বিতীয় বাক্য।")).toBe("প্রথম বাক্য।");
    expect(firstSentence("দাঁড়ি ছাড়া লেখা")).toBe("দাঁড়ি ছাড়া লেখা");
  });

  it("parses ?page= safely", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("3")).toBe(3);
    expect(parsePage("৩")).toBe(3);
    expect(parsePage(["2", "5"])).toBe(2);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-1")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("1e9")).toBe(1);
    expect(parsePage("99999999")).toBe(1);
  });

  it("builds a compact pagination window", () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(6, 12)).toEqual([1, null, 5, 6, 7, null, 12]);
    expect(pageWindow(1, 12)).toEqual([1, 2, null, 12]);
    expect(pageWindow(3, 12)).toEqual([1, 2, 3, 4, null, 12]);
    expect(pageWindow(12, 12)).toEqual([1, null, 11, 12]);
  });
});
