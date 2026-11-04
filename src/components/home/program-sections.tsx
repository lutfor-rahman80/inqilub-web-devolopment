import Link from "next/link";
import { Activity, ArrowRight, CalendarClock, CircleCheckBig, type LucideIcon } from "lucide-react";
import { fmt, type Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { home } from "@/i18n/messages/home";
import { programs } from "@/i18n/messages/programs";
import { homeProgramSectionViews, programCountText, type HomeProgramSectionView, type HomeProgramStatus } from "@/lib/programs/home-sections";
import type { ProgramCardRow } from "@/lib/programs/queries";
import { container } from "@/components/ui/card";
import { ProgramCard } from "@/components/programs/program-card";
import type { HomeProgramSection } from "./data";
import { ProgramRail } from "./program-rail";
import { outlineButton } from "./styles";

const ICONS: Record<HomeProgramStatus, LucideIcon> = {
  ongoing: Activity,
  completed: CircleCheckBig,
  upcoming: CalendarClock,
};

/**
 * The program (কর্মসূচি) sections of the homepage as a zig-zag (design
 * option 2, approved 2026-10-28): ongoing → completed → upcoming
 * (HOME_STATUS_ORDER), empty sections left out. From 1024px each section has
 * two columns — a title block (eyebrow, heading, intro, total count, "see
 * all") and the cards — and the sides alternate per visible section; a thin
 * gold line runs between them from section to section (styles: .hp-* in
 * globals.css). Below 1024px the title block sits above the cards.
 */
export function HomeProgramSections({ lang, sections }: { lang: Locale; sections: HomeProgramSection[] }) {
  const views = homeProgramSectionViews(sections);
  if (views.length === 0) return null;
  return (
    <div className="hp-programs" data-testid="home-programs">
      {views.map((view) => (
        <ProgramSection key={view.status} lang={lang} view={view} />
      ))}
    </div>
  );
}

function ProgramSection({ lang, view }: { lang: Locale; view: HomeProgramSectionView<ProgramCardRow> }) {
  const { status, items, total, side, tone, layout } = view;
  const t = home[lang].programs;
  const title = programs[lang].sections[status];
  const titleId = `programs-${status}-title`;
  const Icon = ICONS[status];

  return (
    <section
      aria-labelledby={titleId}
      data-home-section={`programs-${status}`}
      data-testid={`home-programs-${status}`}
      data-tone={tone}
      data-side={side}
      data-layout={layout}
      className="hp-section"
    >
      <div className={container}>
        <div className="hp-grid" data-side={side}>
          {/* Title block first in the DOM (heading before cards for screen readers); the visual side is swapped with CSS order. */}
          <div className="hp-title relative min-w-0" data-testid="program-section-title">
            <div className="flex items-center gap-3.5">
              <span
                className={`relative inline-grid size-12 shrink-0 place-items-center rounded-[0.875rem] border border-line bg-surface text-forest-700 shadow-[var(--shadow-card)] ${status === "ongoing" ? "hp-live" : ""}`}
                aria-hidden="true"
              >
                <Icon className="size-6" strokeWidth={1.75} />
              </span>
              <p className="flex flex-1 items-center gap-3 text-[0.9375rem] font-semibold tracking-[0.02em] text-gold-800 after:h-px after:w-12 after:bg-gold-500 after:content-['']">
                {t.eyebrow}
              </p>
            </div>
            <h2
              id={titleId}
              className="hp-heading mt-[1.125rem] leading-[1.3] font-bold text-balance text-forest-800 wrap-anywhere"
            >
              {title}
            </h2>
            <p className="mt-3 max-w-[34rem] text-lg leading-[1.7] text-muted">{t.intro[status]}</p>
            <div
              className={`mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t pt-5 lg:mt-7 ${tone === "tint" ? "border-sage-200" : "border-line"}`}
            >
              <p
                className="inline-flex items-center gap-2 font-semibold text-forest-800 before:size-2 before:rounded-full before:bg-gold-500 before:content-['']"
                data-testid="program-count"
              >
                {programCountText(lang, total)}
              </p>
              <Link href={`${localePath(lang, "/programs")}?status=${status}`} className={outlineButton("md", "px-4")}>
                {t.seeAll}
                <span className="sr-only">: {title}</span>
                <ArrowRight className="size-5" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="hp-cards min-w-0" data-testid="program-section-cards">
            {layout === "single" ? (
              <div className="reveal">
                <ProgramCard program={items[0]} lang={lang} headingLevel="h3" layout="horizontal" />
              </div>
            ) : (
              <ProgramRail
                id={`programs-${status}-list`}
                count={items.length}
                label={fmt(t.listLabel, { title })}
                previousLabel={t.previous}
                nextLabel={t.next}
              >
                {items.map((p) => (
                  <li
                    key={p.id}
                    className={`grid min-w-0 shrink-0 grow-0 snap-start basis-[min(84%,22rem)] ${
                      items.length === 2 ? "sm:grow sm:basis-0" : "sm:basis-[calc((100%-1.25rem)/2.25)] lg:basis-[calc((100%-1.25rem)/2.3)]"
                    }`}
                  >
                    <ProgramCard program={p} lang={lang} headingLevel="h3" />
                  </li>
                ))}
              </ProgramRail>
            )}
          </div>

          <span className="hp-thread" aria-hidden="true" />
          <span className="hp-node" aria-hidden="true">
            <StarNode />
          </span>
        </div>
      </div>
    </section>
  );
}

/** Eight-point star (long main points, shorter diagonals), echoing .pattern-islamic. */
function StarNode() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
      <path d="M12 .5L13.49 8.4 17.8 6.2 15.6 10.51 23.5 12 15.6 13.49 17.8 17.8 13.49 15.6 12 23.5 10.51 15.6 6.2 17.8 8.4 13.49.5 12 8.4 10.51 6.2 6.2 10.51 8.4z" />
    </svg>
  );
}
