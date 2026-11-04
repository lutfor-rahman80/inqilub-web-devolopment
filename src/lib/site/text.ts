/** Plain-text helpers for rendering admin-entered text safely (no HTML). */

/** Splits text into paragraphs on blank lines; single line breaks are kept inside a paragraph. */
export function toParagraphs(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Collapses whitespace and shortens to at most `max` characters at a word boundary, adding "…". */
export function excerpt(text: string | null | undefined, max = 180): string {
  if (!text) return "";
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s,;:।\-–—]+$/u, "")}…`;
}

/** Parses a ?page= value: positive integer (ASCII or Bengali digits), otherwise 1. */
export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return 1;
  const ascii = raw.replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6));
  if (!/^\d{1,6}$/.test(ascii)) return 1;
  const n = Number(ascii);
  return n >= 1 ? n : 1;
}

/** First sentence (ending in "।", "!" or "?"), or the whole text if there is no sentence end. */
export function firstSentence(text: string | null | undefined): string {
  if (!text) return "";
  const flat = text.replace(/\s+/g, " ").trim();
  const match = flat.match(/^.+?[।!?](?=\s|$)/u);
  return match ? match[0] : flat;
}

/**
 * Compact pagination: first, last and the pages around the current one, with
 * null marking a gap. e.g. (6, 12) → [1, null, 5, 6, 7, null, 12]
 */
export function pageWindow(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | null)[] = [];
  for (const p of sorted) {
    const prev = out[out.length - 1];
    if (typeof prev === "number" && p - prev > 1) out.push(p - prev === 2 ? prev + 1 : null);
    out.push(p);
  }
  return out;
}
