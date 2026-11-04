import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { Localized } from "@/i18n/localized";
import { common } from "@/i18n/messages/common";
import { home } from "@/i18n/messages/home";
import type { SiteTexts } from "@/lib/site/localized-settings";
import { container } from "@/components/ui/card";
import { FacebookIcon } from "@/components/ui/facebook-icon";
import { firstSentenceOf } from "./section-heading";
import { HeroRosette } from "./hero-rosette";
import { HeroSlider } from "./hero-slider";
import type { HeroSlide } from "./hero-slides";

/**
 * Homepage hero, design C (chosen by the organization 2026-10-28): the
 * photos marked “হিরো স্লাইডার” slide as the full hero background with the
 * organization's text on the right, readable on top of them; no logo.
 * From 1024px: photos full-bleed under a light shade, the text in the right
 * half over a deeper shade, the current photo's caption and the slider
 * controls bottom-left. Below 1024px: the photo is a band at the top with the
 * caption and controls under it, then the text.
 * DOM order = visual reading order (HeroSlider places the text): below
 * 1024px the slider (photo, caption, controls) and then the text; from
 * 1024px the text (right half, higher up: h1 and main buttons) and then the
 * caption and controls bottom-left. Without photos (or when they cannot be
 * read) the hero is deep green with the pattern and a rosette, the text
 * first, and below it (bottom-left from 1024px) an invitation to follow the
 * Facebook page.
 */
export function HomeHero({
  lang,
  texts,
  membershipOpen,
  facebookUrl,
  slides,
  failed = false,
}: {
  lang: Locale;
  texts: SiteTexts;
  membershipOpen: boolean;
  /** Already validated (safeFacebookUrl). */
  facebookUrl: string | null;
  slides: HeroSlide[];
  /** The photos could not be read (shown like "no photos", with an honest title). */
  failed?: boolean;
}) {
  const t = home[lang].hero;
  const goal = texts.about.goal;
  const mission = goal.text.trim() ? { ...goal, text: firstSentenceOf(goal.text) } : null;
  const empty = slides.length === 0;

  // The text, painted above the caption's shade. From 1024px only its column takes pointer events.
  const text = (
    <div className="relative z-20 lg:pointer-events-none lg:col-start-1 lg:row-start-1 lg:self-center">
      <div className={`${container} pb-8 pt-3 sm:pb-10 sm:pt-4 lg:py-16`}>
        <div
          className={`lg:grid lg:grid-cols-12 lg:gap-8 ${empty ? "pt-6 sm:pt-8 lg:pt-0" : "border-t border-white/12 pt-6 sm:pt-7 lg:border-0 lg:pt-0"}`}
        >
          <div className="min-w-0 lg:pointer-events-auto lg:col-span-6 lg:col-start-7" data-hero-content="main" data-testid="hero-content">
            <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/25 bg-night-950/35 px-3.5 py-1 text-sm font-semibold text-white backdrop-blur-sm sm:text-[0.95rem]">
              <span aria-hidden="true" className="size-1.5 shrink-0 rotate-45 bg-gold-400" />
              <Localized value={texts.tagline} />
            </p>
            <h1
              id="hero-title"
              className="mt-4 font-serif text-[2.35rem] font-bold leading-[1.22] text-white wrap-anywhere [text-shadow:0_2px_18px_rgb(0_0_0/0.35)] sm:text-5xl lg:mt-5 xl:text-[3.5rem]"
            >
              <Localized value={texts.orgName} />
            </h1>
            <span aria-hidden="true" className="mt-4 block h-[3px] w-14 rounded-full bg-gold-400 lg:mt-5" />
            {texts.slogan.text && (
              <p className="mt-3.5 font-serif text-xl font-semibold leading-snug text-gold-200 sm:text-2xl lg:mt-4" lang="bn">
                <span aria-hidden="true">“</span>
                <span data-testid="hero-slogan">{texts.slogan.text}</span>
                <span aria-hidden="true">”</span>
              </p>
            )}
            {texts.sloganTranslation && (
              <p className="mt-1 text-base italic text-mist-200" data-testid="hero-slogan-translation">
                {texts.sloganTranslation}
              </p>
            )}
            {mission && (
              <Localized as="p" value={mission} className="mt-3.5 max-w-xl text-[1.05rem] leading-relaxed text-mist-100 wrap-anywhere sm:text-lg lg:mt-4" />
            )}
            <div className="mt-6 flex flex-wrap items-center gap-2.5 lg:mt-7">
              <Link
                href={localePath(lang, "/activities")}
                className="press inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl bg-gold-400 px-4.5 font-semibold text-brand-950 shadow-[0_6px_20px_-8px_rgb(0_0_0/0.5)] transition-colors hover:bg-gold-100"
              >
                {t.activities}
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
              {membershipOpen && (
                <Link
                  href={localePath(lang, "/membership")}
                  className="press inline-flex min-h-11 items-center whitespace-nowrap rounded-xl border border-white/60 bg-night-950/30 px-4.5 font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/15"
                >
                  {t.join}
                </Link>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-0 text-[0.95rem] lg:mt-5">
              {texts.location.text && (
                <>
                  <p className="inline-flex min-h-11 items-center gap-2 text-mist-100">
                    <MapPin className="size-[1.1rem] shrink-0 text-gold-400" aria-hidden="true" />
                    <span className="sr-only">{t.location}: </span>
                    <Localized value={texts.location} />
                  </p>
                  <span aria-hidden="true" className="h-4 w-px bg-white/30" />
                </>
              )}
              <Link
                href={localePath(lang, "/programs")}
                className="inline-flex min-h-11 items-center gap-2 font-semibold text-gold-200 underline-offset-[6px] hover:text-white hover:underline"
              >
                <CalendarDays className="size-[1.1rem] shrink-0" aria-hidden="true" />
                {t.programs}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <section
      aria-labelledby="hero-title"
      data-home-section="hero"
      data-hero-empty={empty ? "true" : undefined}
      className={`relative isolate flex flex-col overflow-hidden bg-night-900 text-white lg:grid lg:min-h-[clamp(560px,calc(100svh-9rem),660px)] lg:grid-cols-1 lg:grid-rows-[1fr] ${
        // From 1024px the photos are the whole hero's background: a horizontal swipe anywhere changes the photo.
        empty ? "" : "lg:touch-pan-y lg:touch-pinch-zoom"
      }`}
    >
      {empty ? (
        <>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute inset-0 bg-linear-118 from-brand-800 via-brand-900 via-40% to-brand-950" />
            <div className="pattern-islamic absolute inset-0 opacity-80" />
            <div className="hero-glow absolute inset-0" />
            <HeroRosette className="absolute -right-28 -top-28 size-80 text-gold-400/25 sm:size-96 lg:left-[8%] lg:right-auto lg:top-[40%] lg:size-[23rem] lg:-translate-y-1/2 lg:text-gold-400/55 xl:left-[10%]" />
          </div>
          {text}
          <EmptyInvite lang={lang} facebookUrl={facebookUrl} failed={failed} />
        </>
      ) : (
        <>
          <div aria-hidden="true" className="pattern-islamic pointer-events-none absolute inset-0 -z-20 opacity-60 lg:hidden" />
          <HeroSlider slides={slides} lang={lang} t={home[lang].slider}>
            {text}
          </HeroSlider>
        </>
      )}
    </section>
  );
}

/** No photos yet: the caption area invites visitors to follow the Facebook page (or see the activities). */
function EmptyInvite({ lang, facebookUrl, failed }: { lang: Locale; facebookUrl: string | null; failed: boolean }) {
  const t = home[lang].slider;
  return (
    <div className="relative z-10 lg:pointer-events-none lg:col-start-1 lg:row-start-1 lg:self-end" data-testid="hero-empty">
      <div className={`${container} pb-9 lg:pb-10`}>
        <div
          className="min-w-0 border-t border-white/15 pt-5 lg:pointer-events-auto lg:w-[min(30rem,calc(50%-2rem))] lg:border-t-0 lg:pt-0"
          data-hero-content="caption"
        >
          <p className="flex items-center gap-3 text-sm font-semibold text-gold-200">
            <span aria-hidden="true" className="h-px w-8 bg-gold-400" />
            {failed ? t.unavailableLabel : t.emptyLabel}
          </p>
          <p className="mt-1.5 font-serif text-lg font-semibold leading-snug text-white sm:text-xl">{failed ? t.unavailableTitle : t.emptyTitle}</p>
          <p className="mt-1 text-[0.95rem] text-mist-200">{facebookUrl ? t.emptyBody : t.emptyBodyNoFacebook}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            {facebookUrl ? (
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-4 font-semibold text-white transition-colors hover:bg-white/20"
              >
                <FacebookIcon className="size-5" />
                {t.facebook}
                <span className="sr-only"> {common[lang].social.opensInNewTab}</span>
              </a>
            ) : (
              <Link
                href={localePath(lang, "/activities")}
                className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-gold-200 underline-offset-[6px] hover:text-white hover:underline"
              >
                {t.activities}
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
