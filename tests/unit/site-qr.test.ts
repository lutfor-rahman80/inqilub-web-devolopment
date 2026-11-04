import { describe, expect, it } from "vitest";
import sharp from "sharp";
import jsQR from "jsqr";
import { qrPng, qrSvg } from "@/lib/site/qr";
import { safeFacebookUrl } from "@/lib/site/urls";

const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61566432706839";

async function decode(image: Buffer): Promise<string | null> {
  const { data, info } = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const code = jsQR(new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), info.width, info.height);
  return code?.data ?? null;
}

describe("Facebook QR code", () => {
  it("keeps the configured Facebook URL unchanged through validation", () => {
    expect(safeFacebookUrl(FACEBOOK_URL)).toBe(FACEBOOK_URL);
  });

  it("print PNG is 1024px and decodes to the Facebook URL", async () => {
    const png = await qrPng(FACEBOOK_URL, 1024);
    const meta = await sharp(png).metadata();
    expect(meta.format).toBe("png");
    expect(meta.width).toBe(1024);
    expect(meta.height).toBe(1024);
    expect(await decode(png)).toBe(FACEBOOK_URL);
  });

  it("on-screen SVG decodes to the Facebook URL", async () => {
    const svg = await qrSvg(FACEBOOK_URL);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).not.toMatch(/<script/i);
    const raster = await sharp(Buffer.from(svg), { density: 300 }).resize(600, 600).flatten({ background: "#ffffff" }).png().toBuffer();
    expect(await decode(raster)).toBe(FACEBOOK_URL);
  });
});
