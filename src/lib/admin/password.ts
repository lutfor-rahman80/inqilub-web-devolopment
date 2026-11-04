/**
 * Strong random temporary passwords (Web Crypto, available in Node and
 * browsers). Look-alike characters (0/O, 1/l/I) are left out so a password
 * read aloud or copied by hand is not mistyped.
 */

const LOWER = "abcdefghijkmnpqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "@#%+=?!*";
const ALL = LOWER + UPPER + DIGITS + SYMBOLS;

/** Uniform random integer in [0, max) without modulo bias. */
function randomIndex(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
}

const pick = (set: string) => set[randomIndex(set.length)];

/** e.g. "pX7#mK2qR9vT@d" — at least one lower, upper, digit and symbol. */
export function generatePassword(length = 14): string {
  const n = Math.max(10, Math.min(64, Math.floor(length)));
  const chars = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < n) chars.push(pick(ALL));
  // Fisher–Yates shuffle so the guaranteed classes are not always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
