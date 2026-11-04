import { createHmac } from "node:crypto";

/**
 * Minimal RFC 6238 TOTP (SHA-1, 6 digits, 30-second steps) — the same
 * parameters authenticator apps and Supabase Auth use. Test-only helper so the
 * e2e suite can complete two-step login without an extra dependency.
 */

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = BASE32.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid base32 character: ${ch}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** RFC 4226 HOTP value for a counter. */
export function hotp(secret: Buffer, counter: number, digits = 6): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secret).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
  return String(code % 10 ** digits).padStart(digits, "0");
}

/** Current TOTP code for a base32 secret (optionally at another time, in ms). */
export function totp(secretBase32: string, now = Date.now(), step = 30): string {
  return hotp(base32Decode(secretBase32), Math.floor(now / 1000 / step));
}

/** Milliseconds left in the current 30-second step. */
export function msLeftInStep(now = Date.now(), step = 30): number {
  return step * 1000 - (now % (step * 1000));
}
