"use client";

import {
  useCallback,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { fmt, type Locale } from "@/i18n/config";
import { FmtText } from "@/i18n/localized";
import type { HomeMessages } from "@/i18n/messages/home";
import { num } from "@/lib/format";
import { container } from "@/components/ui/card";
import type { HeroSlide } from "./hero-slides";

/** Autoplay interval (ms); the progress segment fills over exactly this time. */
export const SLIDE_DELAY = 6000;

/** A media query as an external store (the server and the first client render assume `false`). */
function useMedia(query: string) {
  const subscribe = useCallback(
    (cb: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

function subscribeVisibility(cb: () => void) {
  document.addEventListener("visibilitychange", cb);
  return () => document.removeEventListener("visibilitychange", cb);
}
/** True while the tab is in the background (the slideshow waits). */
function useDocumentHidden() {
  return useSyncExternalStore(subscribeVisibility, () => document.hidden, () => false);
}

const noop = () => () => {};
/** False during the server render and hydration, true afterwards. */
function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}

const roundButton =
  "press inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-white/35 bg-night-950/45 text-white backdrop-blur-sm transition-colors hover:bg-white/20";

/**
 * Homepage hero photo slider (design C) and the order of the hero's parts.
 * From 1024px the photos fill the whole hero (crossfade ~700 ms, slow zoom),
 * the hero text (`children`) sits in the right half and this component's
 * caption and controls bottom-left; below 1024px the photo is a band at the
 * top with the caption and controls under it, then the text.
 *
 * DOM order = visual reading order: below 1024px the slider comes first and
 * the text after it; from 1024px the text (higher up, with the h1 and the
 * main buttons) comes first. Both are placed in the same grid cell there, so
 * swapping them after hydration moves nothing on screen.
 *
 * The caption names the current photo's program or activity (at most two
 * lines) and its date on a line of its own (never cut off), with a link; the
 * link is one element for all photos, so keyboard focus is never lost when
 * the photo changes. Below 1024px the caption area always reserves two title
 * lines and the date line (in `lh` units, the same in any font), so the text
 * under it does not move when the web fonts arrive.
 *
 * Controls: pause/play first, then the segmented progress bar (one segment
 * per photo, doubling as navigation) and previous/next, on one row; on
 * narrow phones previous/next wrap to a second row (every segment stays at
 * least 44px wide). ←/→ while focus is inside; swipe on touch screens (on the
 * photo band below 1024px, anywhere on the hero from 1024px, but not starting
 * on a link or button). The progress fill is a CSS animation and the next
 * photo shows when it ends, so pausing (hover, keyboard focus, hidden tab,
 * the pause button) stops the bar and the timer together. The current
 * segment is always marked: while the timer runs it fills; when the visitor
 * changed the photo while the slideshow waits it is filled completely (as
 * under reduced motion) until the timer starts again. Under
 * prefers-reduced-motion nothing auto-advances, there is no zoom and no
 * pause button (hidden by CSS from the first paint). Only photo changes the
 * visitor makes are announced (polite live region).
 * One photo: no region, controls or progress — just the photo and caption.
 */
export function HeroSlider({
  slides,
  lang,
  t,
  children,
}: {
  slides: HeroSlide[];
  lang: Locale;
  t: HomeMessages["slider"];
  /** The hero text (tagline, h1, slogan, mission, buttons). */
  children: ReactNode;
}) {
  const total = slides.length;
  const multiple = total > 1;
  const reducedMotion = useMedia("(prefers-reduced-motion: reduce)");
  const wide = useMedia("(min-width: 64rem)");
  const hidden = useDocumentHidden();
  const hydrated = useHydrated();

  const [pos, setPos] = useState({ index: 0, prev: -1, run: 0 });
  // Photos that may load now: the first one and its neighbour, then the neighbours of every photo shown.
  const [nearby, setNearby] = useState<ReadonlySet<number>>(() => new Set([0, 1 % total]));
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  /** The photo to announce after the visitor changed it (null: say nothing, e.g. on autoplay). */
  const [announced, setAnnounced] = useState<number | null>(null);
  /** The last photo (run) the timer has run on — its segment shows the timed fill. */
  const [timedRun, setTimedRun] = useState(-1);
  const swipeX = useRef<number | null>(null);
  const band = useRef<HTMLDivElement>(null);

  const { index, prev, run } = pos;
  const canAutoplay = multiple && !reducedMotion;
  const autoplayOn = canAutoplay && !userPaused;
  const playing = hydrated && autoplayOn && !hovered && !focused && !hidden;
  // The timer starts on this photo as soon as the slideshow plays (state adjusted while rendering).
  if (playing && timedRun !== run) setTimedRun(run);
  const timed = canAutoplay && timedRun === run;

  const goTo = useCallback(
    (target: number, byUser: boolean) => {
      const i = ((target % total) + total) % total;
      setPos((p) => (p.index === i ? p : { index: i, prev: p.index, run: p.run + 1 }));
      setNearby((s) => {
        const want = [i, (i + 1) % total, (i - 1 + total) % total];
        return want.every((n) => s.has(n)) ? s : new Set([...s, ...want]);
      });
      setAnnounced(byUser ? i : null);
    },
    [total],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!multiple || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      goTo(index + (e.key === "ArrowRight" ? 1 : -1), true);
    }
  };

  // Swipe (touch and pen): on the photo band below 1024px; from 1024px the photo is the whole
  // hero's background, so a swipe may start anywhere on it (also on the text), but not on a link
  // or button. Vertical movements stay page scrolling (touch-action: pan-y pinch-zoom).
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const target = e.target as Element;
    const where = wide || !!band.current?.contains(target);
    swipeX.current = multiple && e.pointerType !== "mouse" && where && !target.closest("a, button") ? e.clientX : null;
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const startX = swipeX.current;
    swipeX.current = null;
    if (startX === null) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 48) goTo(dx < 0 ? index + 1 : index - 1, true);
  };

  const n = (v: number) => num(lang, v);
  const pad = (v: number) => num(lang, String(v).padStart(2, "0"));
  const current = slides[index];
  const spoken = announced === null ? null : slides[announced];

  // The controls (rendered below in DOM = visual order).
  const toggle = canAutoplay && (
    <button
      type="button"
      onClick={() => setUserPaused((p) => !p)}
      aria-label={autoplayOn ? t.pauseLabel : t.playLabel}
      title={autoplayOn ? t.pauseLabel : t.playLabel}
      // Hidden by CSS under reduced motion from the first paint (the server cannot know the setting).
      className={`${roundButton} motion-reduce:hidden`}
      data-testid="slider-toggle"
    >
      {autoplayOn ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
    </button>
  );
  const progress = (
    <div className="flex flex-auto items-center" role="group" aria-label={t.dots} data-testid="hero-progress">
      {slides.map((slide, i) => {
        const active = i === index;
        return (
          <button
            key={slide.id}
            type="button"
            onClick={() => goTo(i, true)}
            aria-label={fmt(t.goTo, { n: n(i + 1) })}
            aria-current={active ? "true" : undefined}
            className="group flex h-11 min-w-11 flex-1 items-center px-1"
          >
            <span className="relative block h-1 w-full overflow-hidden rounded-full bg-white/40 transition-colors group-hover:bg-white/60">
              {active && (!canAutoplay || hydrated) ? (
                <span
                  key={timed ? `t${run}` : `s${run}`}
                  className={`absolute inset-0 origin-left rounded-full bg-gold-400 ${timed ? "hero-progress-run" : ""}`}
                  style={timed ? ({ "--hero-delay": `${SLIDE_DELAY}ms` } as CSSProperties) : undefined}
                  onAnimationEnd={(e) => {
                    if (timed && e.animationName === "hero-progress" && autoplayOn) goTo(index + 1, false);
                  }}
                  data-testid="hero-progress-fill"
                  data-timed={timed ? "true" : "false"}
                />
              ) : (
                i < index && <span className="absolute inset-0 rounded-full bg-white/85" />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );

  const slider = (
    <div
      role={multiple ? "region" : undefined}
      aria-roledescription={multiple ? t.roleCarousel : undefined}
      aria-label={multiple ? t.label : undefined}
      onKeyDown={onKeyDown}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(false)}
      // Keyboard focus pauses; a mouse click on a control does not (hover already does).
      onFocus={(e) => setFocused(e.target.matches(":focus-visible"))}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      className="flex flex-col lg:pointer-events-none lg:col-start-1 lg:row-start-1 lg:self-end"
      data-testid="hero-slider"
      data-count={total}
      data-selected={index}
      data-paused={playing ? "false" : "true"}
      data-autoplay={playing ? "running" : "stopped"}
      data-layout={wide ? "wide" : "narrow"}
    >
      {/* Photo band below 1024px; from 1024px this box is static and the photo layer fills the
          whole hero (its containing block is the section). */}
      <div
        ref={band}
        className="relative aspect-[16/10] max-h-[62svh] touch-pan-y touch-pinch-zoom overflow-hidden sm:aspect-video lg:static lg:aspect-auto lg:max-h-none lg:overflow-visible"
        data-testid="hero-band"
      >
        <div
          className="absolute inset-0 -z-10 touch-pan-y touch-pinch-zoom overflow-hidden bg-night-800 lg:pointer-events-auto"
          data-testid="hero-media"
        >
          {slides.map((slide, i) => {
            const active = i === index;
            const layer = active ? "z-20 opacity-100" : i === prev ? "z-10 opacity-100" : "z-0 opacity-0";
            const first = i === 0;
            return (
              <div
                key={slide.id}
                className={`absolute inset-0 overflow-hidden transition-opacity duration-700 ease-out ${layer}`}
                role={multiple ? "group" : undefined}
                aria-roledescription={multiple ? t.roleSlide : undefined}
                aria-label={multiple ? fmt(t.slideOf, { n: n(i + 1), total: n(total) }) : undefined}
                aria-hidden={active ? undefined : true}
                inert={active ? undefined : true}
                data-slide={i}
              >
                {(first || nearby.has(i)) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={slide.src}
                    srcSet={slide.srcSet}
                    sizes="100vw"
                    alt={slide.alt}
                    lang={slide.altLang}
                    width={slide.width}
                    height={slide.height}
                    loading={first ? "eager" : "lazy"}
                    fetchPriority={first ? "high" : undefined}
                    decoding={first ? "auto" : "async"}
                    draggable={false}
                    className={`size-full origin-[40%_55%] select-none object-cover ${active || i === prev ? "hero-kenburns" : ""}`}
                  />
                )}
              </div>
            );
          })}
          {/* ≥1024px: light shade over the photo, deep shade behind the text on the right. */}
          <div aria-hidden="true" className="hero-shade pointer-events-none absolute inset-0 z-30 hidden lg:block" />
          {/* Below 1024px: soft edge into the dark caption area under the band. */}
          <div aria-hidden="true" className="hero-band-fade pointer-events-none absolute inset-x-0 bottom-0 z-30 h-14 lg:hidden" />
        </div>
      </div>

      {/* Caption + controls: under the band below 1024px, bottom-left over the photo from 1024px. */}
      <div className={`${container} relative z-10 pb-1 pt-3.5 sm:pt-5 lg:pb-9 lg:pt-0`}>
        <div className="relative min-w-0 lg:pointer-events-auto lg:w-[min(34rem,calc(50%-2rem))]" data-hero-content="caption" data-testid="hero-caption">
          <div aria-hidden="true" className="hero-caption-shade pointer-events-none absolute -bottom-9 -left-[50vw] -right-40 -top-36 -z-10 hidden lg:block" />
          {/* Every caption sits in the same grid cell (only the current one visible) at its bottom,
              so the block keeps the height of the longest and nothing below it moves between
              photos; a shorter caption leaves the space above its label line. Below 1024px the
              block always takes the label line, two title lines and the date line (lh = the
              title's line height, the same in any font), so the text under it does not move when
              the web fonts arrive. */}
          <div
            className="grid font-serif text-lg leading-snug sm:text-xl max-lg:min-h-[calc(1.25rem+0.375rem+2lh+0.125rem+1.5rem)]"
            data-testid="hero-caption-box"
          >
            {slides.map((slide, i) => {
              const active = i === index;
              const [from, to] = slide.date ? slide.date.split(" – ") : [];
              return (
                <div key={slide.id} className={`col-start-1 row-start-1 min-w-0 self-end ${active ? "" : "invisible"}`} aria-hidden={active ? undefined : true}>
                  <p className="flex items-center gap-3 font-sans text-sm font-semibold text-gold-200">
                    <span aria-hidden="true" className="h-px w-8 bg-gold-400" />
                    {t.inPhoto}
                    {multiple && (
                      <span
                        className="inline-flex items-center gap-3 font-medium tabular-nums text-mist-200"
                        aria-hidden="true"
                        data-testid={active ? "hero-counter" : undefined}
                      >
                        <span className="size-1 rounded-full bg-white/50" />
                        {pad(i + 1)} / {pad(total)}
                      </span>
                    )}
                  </p>
                  <div className={`mt-1.5 ${active && run > 0 ? "hero-rise" : ""}`} data-testid={active ? "hero-caption-text" : undefined}>
                    <p className="line-clamp-2 font-semibold text-white wrap-anywhere" lang={slide.labelLang} data-testid={active ? "hero-caption-label" : undefined}>
                      {slide.label}
                    </p>
                    {from && (
                      // The date always shows in full; a range may break only before its dash.
                      <p className="mt-0.5 font-sans text-base font-medium leading-6 text-mist-200" data-testid={active ? "hero-caption-date" : undefined}>
                        <span className="whitespace-nowrap">{from}</span>
                        {to && (
                          <>
                            {" "}
                            <span className="whitespace-nowrap">– {to}</span>
                          </>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <Link
            href={current.href}
            className="group mt-0.5 inline-flex min-h-11 items-center gap-1.5 font-semibold text-gold-200 underline decoration-gold-200/40 underline-offset-[6px] transition-colors hover:text-white hover:decoration-white"
            data-testid="hero-caption-link"
          >
            {current.link === "gallery" ? t.viewGallery : t.viewActivity}
            <span className="sr-only">
              {" — "}
              <span lang={current.labelLang}>{current.label}</span>
            </span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden="true" />
          </Link>

          {multiple && (
            // One row (pause, segments, previous/next); on narrow phones previous/next wrap to a second row.
            <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 lg:mt-3" data-testid="hero-controls">
              {toggle}
              {progress}
              <div className="ms-auto flex items-center gap-1.5">
                <button type="button" className={roundButton} onClick={() => goTo(index - 1, true)} aria-label={t.previous} title={t.previous}>
                  <ChevronLeft className="size-5" aria-hidden="true" />
                </button>
                <button type="button" className={roundButton} onClick={() => goTo(index + 1, true)} aria-label={t.next} title={t.next}>
                  <ChevronRight className="size-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
          {multiple && (
            <p className="sr-only" aria-live="polite" aria-atomic="true" data-testid="hero-announcer">
              {spoken && (
                <FmtText
                  template={fmt(t.announce, { n: n((announced ?? 0) + 1), total: n(total) })}
                  name="caption"
                  value={
                    <>
                      <span lang={spoken.labelLang}>{spoken.label}</span>
                      {spoken.date && `, ${spoken.date}`}
                    </>
                  }
                />
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  // Swipe handlers on a box-less wrapper around the slider and the text (events bubble from both).
  // From 1024px the text comes first (see above); slot positions keep the slider mounted in place.
  return (
    <div className="contents" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => (swipeX.current = null)}>
      {wide ? children : null}
      {slider}
      {wide ? null : children}
    </div>
  );
}
