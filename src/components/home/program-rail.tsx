"use client";

import { useEffect, useRef, useState, type FocusEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type RailState = { atStart: boolean; atEnd: boolean; scrollable: boolean; visible: number; progress: number };

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Homepage program cards as a horizontally scrollable row (scroll-snap, no
 * autoplay). Touch users swipe; the prev/next buttons (44px) move one card
 * and are marked aria-disabled at the ends (focus stays on them); keyboard
 * users can also Tab through the card links — a focused card that sits in the
 * faded peek area is scrolled fully into view. A slim bar shows the position.
 * When nothing overflows (e.g. two programs from 640px up) the controls are
 * hidden. Smooth scrolling is off under prefers-reduced-motion.
 *
 * `count` is the number of cards (the server knows it, so the first render
 * already hides the controls for two cards on wider screens).
 */
export function ProgramRail({
  id,
  count,
  label,
  previousLabel,
  nextLabel,
  children,
}: {
  id: string;
  count: number;
  label: string;
  previousLabel: string;
  nextLabel: string;
  children: ReactNode;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const [state, setState] = useState<RailState>({
    atStart: true,
    atEnd: false,
    scrollable: true,
    visible: Math.min(1, 2.3 / Math.max(1, count)),
    progress: 0,
  });

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const max = el.scrollWidth - el.clientWidth;
      const left = Math.abs(el.scrollLeft);
      setState({
        atStart: left <= 2,
        atEnd: left >= max - 2,
        scrollable: max > 2,
        visible: el.scrollWidth > 0 ? Math.min(1, el.clientWidth / el.scrollWidth) : 1,
        progress: max > 0 ? Math.min(1, left / max) : 0,
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    schedule();
    el.addEventListener("scroll", schedule, { passive: true });
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", schedule);
      ro.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const step = (dir: 1 | -1) => {
    const el = listRef.current;
    if (!el) return;
    const item = el.querySelector<HTMLElement>(":scope > li");
    const gap = Number.parseFloat(getComputedStyle(el).columnGap) || 0;
    const amount = item ? item.offsetWidth + gap : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * amount, behavior: reducedMotion() ? "auto" : "smooth" });
  };

  const revealFocused = (e: FocusEvent<HTMLUListElement>) => {
    const item = (e.target as HTMLElement).closest("li");
    if (!item || item.parentElement !== e.currentTarget) return;
    item.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
  };

  const thumbWidth = state.visible * 100;
  const thumbLeft = state.progress * (100 - thumbWidth);
  const arrow =
    "inline-grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-sage-300 bg-surface text-forest-800 transition-[background-color,border-color,opacity,scale] duration-150 focus-visible:rounded-full aria-disabled:cursor-default aria-disabled:opacity-40 hover:not-aria-disabled:border-forest-600 hover:not-aria-disabled:bg-sage-100 active:not-aria-disabled:scale-95";

  return (
    <div
      className="hp-rail reveal relative min-w-0"
      data-testid="program-rail"
      data-scrollable={state.scrollable}
      data-at-start={state.atStart}
      data-at-end={state.atEnd}
    >
      <ul
        ref={listRef}
        id={id}
        aria-label={label}
        onFocus={revealFocused}
        className="hp-rail-list flex snap-x snap-mandatory gap-5 overflow-x-auto overscroll-x-contain"
      >
        {children}
      </ul>
      {/* Hidden when the row does not overflow; two cards always fit side by side from 640px. */}
      <div data-testid="program-rail-controls" hidden={!state.scrollable} className={count === 2 ? "sm:hidden" : undefined}>
        <div className="mt-6 flex items-center gap-2.5">
          <div className="relative me-2 h-[3px] flex-1 overflow-hidden rounded-full bg-sage-200" aria-hidden="true">
            <span
              className="absolute inset-y-0 rounded-full bg-gold-500 transition-[left,width] duration-150 ease-linear"
              style={{ width: `${thumbWidth}%`, left: `${thumbLeft}%` }}
            />
          </div>
          <button
            type="button"
            className={arrow}
            aria-controls={id}
            aria-label={previousLabel}
            aria-disabled={state.atStart}
            data-rail-prev
            onClick={() => !state.atStart && step(-1)}
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={arrow}
            aria-controls={id}
            aria-label={nextLabel}
            aria-disabled={state.atEnd}
            data-rail-next
            onClick={() => !state.atEnd && step(1)}
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
