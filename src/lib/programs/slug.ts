import { PROGRAM_SLUG_MAX, PROGRAM_SLUG_RE } from "./filters";

/**
 * Program URL slugs (pure; unit tested). A slug is the program's public
 * address (/programs/<slug>); it may only use a–z, 0–9 and hyphens, and it
 * is locked once the program has been published (the database raises
 * PROGRAM_SLUG_LOCKED).
 */

/** Latin slug from free text: "Winter Clothing Distribution 2026!" → "winter-clothing-distribution-2026". */
export function slugify(text: string, max = PROGRAM_SLUG_MAX): string {
  const base = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x00-\x7f]/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (base.length <= max) return base;
  const cut = base.slice(0, max);
  const lastHyphen = cut.lastIndexOf("-");
  return (lastHyphen > max * 0.5 ? cut.slice(0, lastHyphen) : cut).replace(/-+$/g, "");
}

/**
 * Suggested slug: from the English title when there is one (at least 3
 * latin characters), otherwise "<category-slug>-<start date>", e.g.
 * "winter-clothing-2026-12-15". Empty when neither is available.
 */
export function suggestProgramSlug({
  titleEn,
  startsOn,
  categorySlug,
}: {
  titleEn?: string | null;
  startsOn?: string | null;
  categorySlug?: string | null;
}): string {
  const fromTitle = slugify(titleEn ?? "");
  if (fromTitle.replace(/-/g, "").length >= 3) return fromTitle;
  const date = startsOn && /^\d{4}-\d{2}-\d{2}$/.test(startsOn) ? startsOn : "";
  const cat = categorySlug && PROGRAM_SLUG_RE.test(categorySlug) ? categorySlug : "";
  if (cat && date) return slugify(`${cat}-${date}`);
  if (cat) return cat;
  return date ? `program-${date}` : "";
}

/** `base`, or `base-2`, `base-3`, … — the first one not in `taken` (kept within the length limit). */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; n < 1000; n++) {
    const suffix = `-${n}`;
    const head = base.slice(0, PROGRAM_SLUG_MAX - suffix.length).replace(/-+$/g, "");
    const candidate = `${head}${suffix}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${base.slice(0, PROGRAM_SLUG_MAX - 9)}-${Date.now().toString(36)}`;
}
