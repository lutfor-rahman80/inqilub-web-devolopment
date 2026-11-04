import Link from "next/link";
import { ArrowRight, Compass, Quote, Target, Users } from "lucide-react";
import { fmt, type Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { Localized } from "@/i18n/localized";
import { home } from "@/i18n/messages/home";
import type { SiteTexts } from "@/lib/site/localized-settings";
import { excerpt } from "@/lib/site/text";
import { container } from "@/components/ui/card";
import { HomeHeading } from "./section-heading";
import { textLink } from "./styles";

/** পরিচিতি: who we are, goal and objective cards, and an excerpt of “why” linking to /about#why. */
export function HomeIntro({ lang, texts }: { lang: Locale; texts: SiteTexts }) {
  const t = home[lang].intro;
  const { about } = texts;
  const cards = [
    { key: "what-is", title: t.whatIs, value: about.whatIs, icon: Users },
    { key: "goal", title: t.goal, value: about.goal, icon: Target },
    { key: "objective", title: t.objective, value: about.objective, icon: Compass },
  ].filter((c) => c.value.text.trim());
  const why = about.why.text.trim() ? { ...about.why, text: excerpt(about.why.text, 260) } : null;
  if (cards.length === 0 && !why) return null;
  const whyTitle = fmt(t.why, { name: texts.orgName.text });

  return (
    <section aria-labelledby="intro-title" data-home-section="intro" className={`${container} py-16 sm:py-20`}>
      <HomeHeading id="intro-title" eyebrow={t.eyebrow} title={t.title} />
      {cards.length > 0 && (
        <ul className="grid gap-5 md:grid-cols-3">
          {cards.map(({ key, title, value, icon: Icon }) => (
            <li key={key} className="reveal min-w-0 rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
              <span className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-sage-100 text-forest-700">
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <h3 className="text-xl font-bold text-forest-800">{title}</h3>
              <Localized as="p" value={value} className="mt-2 text-ink wrap-anywhere" />
            </li>
          ))}
        </ul>
      )}
      {why && (
        <div className="reveal mt-5 rounded-[var(--radius-card)] border border-gold-400/60 bg-gold-50 p-6 shadow-[var(--shadow-card)] sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <Quote className="size-10 shrink-0 text-gold-500" aria-hidden="true" />
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-forest-800 sm:text-2xl">
                {texts.orgName.isFallback ? <span lang="bn">{whyTitle}</span> : whyTitle}
              </h3>
              <Localized as="p" value={why} className="mt-2 text-ink wrap-anywhere" />
              <Link href={`${localePath(lang, "/about")}#why`} className={`${textLink} mt-2`}>
                {t.readMore}
                <span className="sr-only"> — {whyTitle}</span>
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
