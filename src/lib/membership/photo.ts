import { IMAGE_LIMITS } from "@/lib/storage";

/**
 * BROWSER-ONLY. Prepares a member photo: decodes it (respecting EXIF
 * orientation), crops a square (biased towards the top of portrait photos,
 * where faces usually are), scales it to ≤600px and encodes WebP (JPEG on
 * browsers that cannot encode WebP). Re-encoding also strips EXIF data such
 * as GPS location.
 */

export type PreparedPhoto = { blob: Blob; ext: "webp" | "jpg"; contentType: "image/webp" | "image/jpeg"; size: number };

export class PhotoError extends Error {}

const TARGET_BYTES = 120 * 1024;

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new PhotoError("ENCODE_FAILED"))), type, quality),
  );
}

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close() };
    } catch {
      // fall back to <img>
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new PhotoError("DECODE_FAILED");
  }
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
}

/** Square crop rectangle: centred horizontally, 20% from the top for portrait images. */
export function squareCrop(width: number, height: number): { sx: number; sy: number; side: number } {
  const side = Math.min(width, height);
  const sx = Math.round((width - side) / 2);
  const sy = Math.round((height - side) * (height > width ? 0.2 : 0.5));
  return { sx, sy, side };
}

export function validatePhotoFile(file: File): string | null {
  if (!(IMAGE_LIMITS.acceptedTypes as readonly string[]).includes(file.type)) {
    return "শুধু JPG, PNG অথবা WebP ছবি দেওয়া যাবে।";
  }
  if (file.size > IMAGE_LIMITS.maxInputBytes) return "ছবির আকার ১০ MB-এর কম হতে হবে।";
  return null;
}

export async function prepareMemberPhoto(file: File): Promise<PreparedPhoto> {
  const probe = document.createElement("canvas");
  probe.width = probe.height = 2;
  const webp = (await encode(probe, "image/webp", 0.8).catch(() => null))?.type === "image/webp";
  const contentType = webp ? "image/webp" : "image/jpeg";

  const decoded = await decode(file);
  try {
    if (!decoded.width || !decoded.height) throw new PhotoError("DECODE_FAILED");
    const { sx, sy, side } = squareCrop(decoded.width, decoded.height);
    const out = Math.min(side, IMAGE_LIMITS.memberPhotoMaxDimension);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = out;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new PhotoError("CANVAS_UNAVAILABLE");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out, out);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(decoded.source, sx, sy, side, side, 0, 0, out, out);
    let blob = await encode(canvas, contentType, 0.85);
    for (const q of [0.78, 0.7, 0.62]) {
      if (blob.size <= TARGET_BYTES) break;
      blob = await encode(canvas, contentType, q);
    }
    canvas.width = canvas.height = 0;
    return { blob, ext: webp ? "webp" : "jpg", contentType, size: blob.size };
  } finally {
    decoded.release();
  }
}
