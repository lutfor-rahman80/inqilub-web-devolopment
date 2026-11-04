import { fmt, type Locale } from "@/i18n/config";
import { home } from "@/i18n/messages/home";
import { num } from "@/lib/format";
import { HOME_STATUS_ORDER } from "./status";

/**
 * Homepage program sections (কর্মসূচি) — pure layout logic, shared by the
 * server components and the unit tests (no database access here).
 */

export type HomeProgramStatus = (typeof HOME_STATUS_ORDER)[number];

/** One status section as read from the database: the first cards and the total number of published programs. */
export type HomeProgramSection<T> = { status: HomeProgramStatus; items: T[]; total: number };

/**
 * A visible section ready to render. `side` is where the title block sits
 * from 1024px on (the cards take the other side): the first visible section
 * puts it on the start (left) side, the next on the end side, and so on.
 * `tone` alternates the background so the last section is always the plain
 * one (it sits next to the sage photo band). `layout` is "single" for exactly
 * one program (the wide horizontal card), otherwise "rail" (scrolling row).
 */
export type HomeProgramSectionView<T> = HomeProgramSection<T> & {
  index: number;
  side: "start" | "end";
  tone: "plain" | "tint";
  layout: "single" | "rail";
};

/**
 * Sections in the organization's order (HOME_STATUS_ORDER: ongoing →
 * completed → upcoming), without the empty ones, with sides re-alternating
 * over the sections that are left.
 */
export function homeProgramSectionViews<T>(sections: readonly HomeProgramSection<T>[]): HomeProgramSectionView<T>[] {
  const visible = HOME_STATUS_ORDER.map((status) => sections.find((s) => s.status === status)).filter(
    (s): s is HomeProgramSection<T> => !!s && s.items.length > 0,
  );
  return visible.map((s, index) => ({
    ...s,
    total: Math.max(s.total, s.items.length),
    index,
    side: index % 2 === 0 ? "start" : "end",
    tone: (visible.length - 1 - index) % 2 === 0 ? "plain" : "tint",
    layout: s.items.length === 1 ? "single" : "rail",
  }));
}

/** "মোট ৩টি কর্মসূচি" (Bengali digits) / "3 programs", "1 program". */
export function programCountText(lang: Locale, n: number): string {
  const t = home[lang].programs;
  return fmt(n === 1 ? t.countOne : t.count, { n: num(lang, n) });
}
