import { describe, expect, it } from "vitest";
import { isVideoLink, youtubeEmbedUrl, youtubeId, youtubeThumbnail } from "@/lib/press/youtube";
import { normalizePressUrl, parsePress, parsePressKind } from "@/lib/press/schemas";

describe("youtubeId", () => {
  const ID = "dQw4w9WgXcQ";
  it.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=42s`,
    `https://m.youtube.com/watch?feature=share&v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=abc`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}`,
    `https://www.youtube.com/live/${ID}`,
  ])("%s", (url) => {
    expect(youtubeId(url)).toBe(ID);
  });
  it.each([
    `http://www.youtube.com/watch?v=${ID}`, // not https
    "https://www.youtube.com/watch?v=short",
    `https://www.youtube.com/watch?v=${ID}x`,
    `https://evil.com/watch?v=${ID}`,
    `https://youtube.com.evil.com/watch?v=${ID}`,
    `https://www.youtube.com/channel/UC1234567890`,
    `https://www.youtube.com/watch?v=abc"onerror=x`,
    `https://user:pw@www.youtube.com/watch?v=${ID}`,
    "javascript:alert(1)",
    "",
    null,
  ])("rejects %s", (url) => {
    expect(youtubeId(url as string | null)).toBeNull();
  });
  it("builds only safe thumbnail/embed URLs", () => {
    expect(youtubeThumbnail(ID)).toBe(`https://i.ytimg.com/vi/${ID}/hqdefault.jpg`);
    expect(youtubeEmbedUrl(ID)).toBe(`https://www.youtube-nocookie.com/embed/${ID}?autoplay=1&rel=0`);
    expect(() => youtubeThumbnail("../../x")).toThrow();
    expect(() => youtubeEmbedUrl("bad id")).toThrow();
  });
  it("recognizes video links", () => {
    expect(isVideoLink(`https://youtu.be/${ID}`)).toBe(true);
    expect(isVideoLink("https://www.facebook.com/somechannel/videos/123456")).toBe(true);
    expect(isVideoLink("https://fb.watch/abcdef/")).toBe(true);
    expect(isVideoLink("https://www.facebook.com/reel/123")).toBe(true);
    expect(isVideoLink("https://www.prothomalo.com/bangladesh/abc")).toBe(false);
    expect(isVideoLink("http://fb.watch/x")).toBe(false);
  });
});

describe("press URL and form", () => {
  it("normalizes https URLs the database accepts", () => {
    expect(normalizePressUrl(" https://www.example.com/news/1 ")).toBe("https://www.example.com/news/1");
    expect(normalizePressUrl("https://example.com?x=1")).toBe("https://example.com/?x=1");
    expect(normalizePressUrl("https://example.com/it's")).toBe("https://example.com/it%27s");
    for (const bad of ["http://example.com/x", "ftp://example.com", "https://1.2.3.4/x", "https://example.com:8443/x", "https://u:p@example.com/", "example.com", "javascript:alert(1)"]) {
      expect(normalizePressUrl(bad), bad).toBeNull();
    }
    expect(normalizePressUrl(`https://example.com/${"a".repeat(1000)}`)).toBeNull();
  });
  const base = {
    kind: "interview",
    title_bn: "সাক্ষাৎকার",
    title_en: "",
    outlet_bn: "উদাহরণ টিভি",
    outlet_en: "",
    url: "https://youtu.be/dQw4w9WgXcQ",
    published_on: "২০২৬-১০-০১",
    summary_bn: "",
    summary_en: "",
    program_id: "",
    is_published: true,
  };
  it("accepts a valid item and nulls empty optionals", () => {
    const r = parsePress(base);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toMatchObject({ published_on: "2026-10-01", title_en: null, outlet_en: null, summary_bn: null, program_id: null });
  });
  it("rejects bad kind, insecure URL, future date and missing outlet", () => {
    const r = parsePress({ ...base, kind: "blog", url: "http://example.com", published_on: "2099-01-01", outlet_bn: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fieldErrors).sort()).toEqual(["kind", "outlet_bn", "published_on", "url"]);
  });
  it("parses ?kind", () => {
    expect(parsePressKind("news")).toBe("news");
    expect(parsePressKind("video_report")).toBe("video_report");
    expect(parsePressKind("all")).toBeNull();
    expect(parsePressKind(undefined)).toBeNull();
  });
});
