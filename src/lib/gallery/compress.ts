import { IMAGE_LIMITS } from "@/lib/storage";
import { fitWithin, type UploadExt } from "./paths";
import { FALLBACK_DIMENSION, FALLBACK_QUALITIES, FULL_QUALITIES, FULL_TARGET_BYTES, OVERSIZE_FACTOR } from "./limits";

/**
 * BROWSER-ONLY. In-browser image preparation for gallery uploads: decodes the photo
 * (respecting EXIF orientation), scales it to ≤1600px (full) and ≤480px
 * (thumbnail) and encodes WebP, aiming at about 200 KB per photo (limits.ts). Re-encoding through a canvas also strips
 * EXIF metadata such as GPS location. Browsers that cannot encode WebP
 * (older Safari) fall back to JPEG.
 */

export type PreparedImage = {
  full: Blob;
  thumb: Blob;
  width: number;
  height: number;
  ext: UploadExt;
  contentType: "image/webp" | "image/jpeg";
};

const THUMB_QUALITY = 0.72;

type Decoded = { source: CanvasImageSource; width: number; height: number; release: () => void };

async function decode(file: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      // Fall back to an <img> element below.
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  try {
    await img.decode();
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
}

function drawScaled(source: CanvasImageSource, width: number, height: number, opaque: boolean): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CANVAS_UNAVAILABLE");
  if (opaque) {
    // JPEG has no transparency: paint PNG transparency white instead of black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("ENCODE_FAILED"))), type, quality),
  );
}

let webpSupported: Promise<boolean> | null = null;
/** Whether canvas.toBlob can produce WebP (unsupported types silently fall back to PNG). */
export function canEncodeWebp(): Promise<boolean> {
  webpSupported ??= (async () => {
    try {
      const c = document.createElement("canvas");
      c.width = c.height = 2;
      const blob = await encode(c, "image/webp", 0.8);
      return blob.type === "image/webp";
    } catch {
      return false;
    }
  })();
  return webpSupported;
}

/** Halves the image until it is at most 2× the target size, for smoother downscaling. */
function stepDown(decoded: Decoded, target: { width: number; height: number }): CanvasImageSource {
  let source: CanvasImageSource = decoded.source;
  let w = decoded.width;
  let h = decoded.height;
  while (w / 2 >= target.width * 2 && h / 2 >= target.height * 2) {
    w = Math.round(w / 2);
    h = Math.round(h / 2);
    source = drawScaled(source, w, h, false);
  }
  return source;
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  const webp = await canEncodeWebp();
  const contentType = webp ? "image/webp" : "image/jpeg";
  const decoded = await decode(file);
  try {
    if (!decoded.width || !decoded.height) throw new Error("DECODE_FAILED");

    let size = fitWithin(decoded.width, decoded.height, IMAGE_LIMITS.fullMaxDimension);
    let full: Blob | null = null;
    let canvas = drawScaled(stepDown(decoded, size), size.width, size.height, !webp);
    for (const q of FULL_QUALITIES) {
      full = await encode(canvas, contentType, q);
      if (full.size <= FULL_TARGET_BYTES) break;
    }
    // Very detailed photos: shrink a little more instead of lowering quality further.
    if (full && full.size > FULL_TARGET_BYTES * OVERSIZE_FACTOR) {
      size = fitWithin(size.width, size.height, FALLBACK_DIMENSION);
      canvas = drawScaled(canvas, size.width, size.height, !webp);
      for (const q of FALLBACK_QUALITIES) {
        full = await encode(canvas, contentType, q);
        if (full.size <= FULL_TARGET_BYTES * OVERSIZE_FACTOR) break;
      }
    }
    if (!full) throw new Error("ENCODE_FAILED");

    const thumbSize = fitWithin(size.width, size.height, IMAGE_LIMITS.thumbMaxDimension);
    const thumbCanvas = drawScaled(canvas, thumbSize.width, thumbSize.height, !webp);
    const thumb = await encode(thumbCanvas, contentType, THUMB_QUALITY);
    canvas.width = canvas.height = 0;
    thumbCanvas.width = thumbCanvas.height = 0;

    return { full, thumb, width: size.width, height: size.height, ext: webp ? "webp" : "jpg", contentType };
  } finally {
    decoded.release();
  }
}
