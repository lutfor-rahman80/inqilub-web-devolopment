"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * ফটো স্লাইডার — আগের static পেজের assets/js/slider.js এর React রূপ।
 * আচরণ হুবহু একই: ৫ সেকেন্ডে ক্রসফেড অটোপ্লে, হোভার/ফোকাস/ট্যাব লুকালে
 * থামে, সোয়াইপ, কিবোর্ড, লোড-না-হওয়া ছবি এড়িয়ে যাওয়া, ক্যাপশন বদল।
 */

type Slide = {
  src: string;
  caption: string;
  focus: string;
  width: number;
  height: number;
  alt: string;
  fitContain?: boolean;
  eager?: boolean;
};

const SLIDES: Slide[] = [
  { src: "/quiz/assets/prize-1.webp", caption: "বিগত বছর · ১ম পুরস্কার", focus: "72% 72%", width: 1200, height: 450, alt: "", eager: true },
  { src: "/quiz/assets/prize-2.webp", caption: "বিগত বছর · ২য় পুরস্কার", focus: "30% 85%", width: 1200, height: 435, alt: "" },
  { src: "/quiz/assets/prize-3.webp", caption: "বিগত বছর · ৩য় পুরস্কার", focus: "55% 75%", width: 1200, height: 397, alt: "" },
  { src: "/quiz/assets/round-2.webp", caption: "বিগত বছর · ২য় রাউন্ড", focus: "50% 50%", width: 1200, height: 460, alt: "" },
  { src: "/quiz/assets/quiz.webp", caption: "সীরাত কুইজের মুহূর্ত", focus: "50% 40%", width: 1200, height: 539, alt: "" },
  { src: "/quiz/assets/quiz-distribution.webp", caption: "কুইজ সংগ্রহে শিক্ষার্থীদের উদ্দীপনা", focus: "50% 38%", width: 1200, height: 730, alt: "কুইজ সংগ্রহে শিক্ষার্থীদের উদ্দীপনা" },
  { src: "/quiz/assets/eid-gift.webp", caption: "ঈদ সামগ্রী বিতরণ · ২০২৫", focus: "50% 50%", width: 1200, height: 622, alt: "ঈদ সামগ্রী বিতরণ · ২০২৫" },
  { src: "/quiz/assets/amanot.webp", caption: "আমানতের ভার নিয়ে, তা পূরণে ছুটে চলা", focus: "45% 35%", width: 1200, height: 931, alt: "আমানতের ভার নিয়ে, তা পূরণে ছুটে চলা" },
  { src: "/quiz/assets/help.webp", caption: "বন্যার্তদের আর্থিক উপহার", focus: "50% 50%", width: 1600, height: 588, alt: "", fitContain: true },
];

const INTERVAL_MS = 5000;
const SWIPE_MIN_PX = 50;
const SWIPE_RATIO = 1.5;
const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const toBn = (n: number) => String(n).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);

export default function QuizSlider() {
  const [current, setCurrent] = useState(0);
  const [failed, setFailed] = useState<ReadonlySet<number>>(new Set());
  const [caption, setCaption] = useState(SLIDES[0].caption);
  const [captionChanging, setCaptionChanging] = useState(false);
  const [paused, setPaused] = useState(false);
  const [docHidden, setDocHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef(0);
  const failedRef = useRef<ReadonlySet<number>>(failed);
  const captionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchRef = useRef<{ x: number; y: number; tracking: boolean }>({ x: 0, y: 0, tracking: false });
  const firstRender = useRef(true);

  const isUsable = useCallback((i: number) => !failedRef.current.has(i), []);
  const usableCount = useCallback(
    () => SLIDES.reduce((c, _s, i) => c + (isUsable(i) ? 1 : 0), 0),
    [isUsable],
  );
  const step = useCallback(
    (from: number, dir: number) => {
      const n = SLIDES.length;
      for (let k = 1; k <= n; k++) {
        const idx = (((from + dir * k) % n) + n) % n;
        if (isUsable(idx)) return idx;
      }
      return from;
    },
    [isUsable],
  );

  const goTo = useCallback(
    (index: number) => {
      const n = SLIDES.length;
      let idx = ((index % n) + n) % n;
      if (!isUsable(idx)) idx = step(idx, 1);
      currentRef.current = idx;
      setCurrent(idx);
    },
    [isUsable, step],
  );

  const next = useCallback(() => goTo(step(currentRef.current, 1)), [goTo, step]);
  const prev = useCallback(() => goTo(step(currentRef.current, -1)), [goTo, step]);

  // ক্যাপশন বদল (মূল slider.js এর মতো ২০০ms ফেড)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const text = SLIDES[current].caption;
    if (captionTimer.current) clearTimeout(captionTimer.current);
    if (!reducedMotion) {
      setCaptionChanging(true);
      captionTimer.current = setTimeout(() => {
        setCaption(text);
        setCaptionChanging(false);
      }, 200);
    } else {
      setCaption(text);
    }
    // পরের ছবি প্রিলোড
    const nxt = step(current, 1);
    if (nxt !== current) {
      const warm = new Image();
      warm.src = SLIDES[nxt].src;
    }
    return () => {
      if (captionTimer.current) clearTimeout(captionTimer.current);
    };
  }, [current, reducedMotion, step]);

  // reduced-motion পছন্দ শোনা
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // ট্যাব লুকালে অটোপ্লে থামানো
  useEffect(() => {
    const onVis = () => setDocHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const autoplay = !reducedMotion && !paused && !docHidden && usableCount() > 1;

  useEffect(() => {
    failedRef.current = failed;
  }, [failed]);

  useEffect(() => {
    if (!autoplay) return;
    const t = setInterval(() => {
      currentRef.current = step(currentRef.current, 1);
      setCurrent(currentRef.current);
    }, INTERVAL_MS);
    return () => clearInterval(t);
  }, [autoplay, step]);

  const markFailed = (i: number) => {
    setFailed((prevSet) => {
      if (prevSet.has(i)) return prevSet;
      const s = new Set(prevSet);
      s.add(i);
      return s;
    });
    failedRef.current = new Set([...failedRef.current, i]);
    if (i === currentRef.current && SLIDES.length - failedRef.current.size > 0) {
      goTo(step(currentRef.current, 1));
    }
  };

  const fewUsable = usableCount() <= 1;

  return (
    <section className="slider-section container container--tight" aria-label="ফটো গ্যালারি">
      <div
        className="slider"
        data-slider
        role="region"
        aria-roledescription="carousel"
        aria-label="ফটো স্লাইডার"
        tabIndex={0}
        ref={rootRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={(e) => {
          const root = rootRef.current;
          const within = !!root && root.contains(document.activeElement) && root.matches(":focus-within");
          setPaused(within);
        }}
        onFocus={() => setPaused(true)}
        onBlur={(e) => {
          const root = rootRef.current;
          if (e.relatedTarget && root && root.contains(e.relatedTarget as Node)) return;
          setPaused(!!root && root.matches(":hover"));
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            prev();
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            next();
          }
        }}
        onTouchStart={(e) => {
          if (e.touches.length !== 1) {
            touchRef.current.tracking = false;
            return;
          }
          touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, tracking: true };
        }}
        onTouchEnd={(e) => {
          if (!touchRef.current.tracking) return;
          touchRef.current.tracking = false;
          const t = e.changedTouches[0];
          const dx = t.clientX - touchRef.current.x;
          const dy = t.clientY - touchRef.current.y;
          if (Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * SWIPE_RATIO) {
            if (dx < 0) next();
            else prev();
          }
        }}
        onTouchCancel={() => {
          touchRef.current.tracking = false;
        }}
      >
        <div className="slider-stage">
          {SLIDES.map((s, i) => (
            <figure
              key={s.src}
              className={`slide${s.fitContain ? " fit-contain" : ""}${failed.has(i) ? " is-failed" : ""}${i === current ? " is-active" : ""}`}
              data-caption={s.caption}
              style={{ "--focus": s.focus } as React.CSSProperties}
              aria-hidden={i === current ? "false" : "true"}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.src}
                alt={s.alt}
                width={s.width}
                height={s.height}
                loading={s.eager ? "eager" : "lazy"}
                fetchPriority={s.eager ? "high" : undefined}
                decoding="async"
                onError={() => markFailed(i)}
              />
            </figure>
          ))}
          <div className="slider-shade" aria-hidden="true"></div>
          <button type="button" className="slider-arrow prev" aria-label="পূর্ববর্তী ছবি" hidden={fewUsable} onClick={prev}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button type="button" className="slider-arrow next" aria-label="পরবর্তী ছবি" hidden={fewUsable} onClick={next}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
        <div className="slider-footer">
          <span className={`slider-caption${captionChanging ? " is-changing" : ""}`} aria-live={autoplay ? "off" : "polite"} title={caption}>
            {caption}
          </span>
          <div className="slider-dots" aria-label="ছবি নির্বাচন" hidden={SLIDES.length < 2}>
            {SLIDES.map((s, i) => (
              <button
                key={s.src}
                type="button"
                className={`slider-dot${i === current ? " is-active" : ""}`}
                aria-label={`ছবি ${toBn(i + 1)} / ${toBn(SLIDES.length)}`}
                aria-current={i === current ? "true" : undefined}
                hidden={!isUsable(i)}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
