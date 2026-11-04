import "server-only";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Compass, MapPin, Quote, Target } from "lucide-react";
import { fmt, isLocale, DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { Localized } from "@/i18n/localized";
import { pickField } from "@/i18n/content";
import { about as aboutMessages } from "@/i18n/messages/about";
import { common } from "@/i18n/messages/common";
import { getSettings } from "@/lib/settings";
import { siteTexts } from "@/lib/site/localized-settings";
import { pageMetadata } from "@/lib/site/metadata";
import { getActiveCategories } from "@/lib/site/queries";
import { num } from "@/lib/format";
import { container } from "@/components/ui/card";
import { PageHero } from "@/components/site/page-hero";
import { SectionTitle } from "@/components/site/section-title";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const locale = ((await params).lang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) return {};
  const t = aboutMessages[locale];
  const texts = siteTexts(await getSettings(), locale);
  const md = pageMetadata({
    title: t.title,
    description: fmt(t.metaDescription, {
      name: common[locale].orgName,
      tagline: texts.tagline.text,
      goal: texts.about.goal.text,
      objective: texts.about.objective.text,
    }),
    path: "/about",
    lang: locale,
  });
  // No title template survives in the [lang] layout, so the document title
  // carries the "page | organization" form itself.
  return { ...md, title: { absolute: `${t.title} | ${common[locale].orgName}` } };
}

/** Multi-paragraph settings text: blank lines split paragraphs. */
function Paragraphs({ value, className = "" }: { value: Parameters<typeof Localized>[0]["value"]; className?: string }) {
  const parts = value.text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 1) return <Localized as="p" value={value} className={className} />;
  return (
    <div className="space-y-3">
      {parts.map((p, i) => (
        <Localized key={i} as="p" value={{ ...value, text: p }} className={className} />
      ))}
    </div>
  );
}

const cardClass = "rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-[var(--shadow-card)]";
const cardTitleClass = "text-xl font-bold text-forest-800";
const cardLinkClass =
  "mt-4 inline-flex items-center gap-1.5 font-semibold text-forest-700 underline-offset-4 hover:text-forest-900 hover:underline";

export default async function AboutPage({ params }: { params: Promise<{ lang: string }> }) {
  const locale = ((await params).lang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) notFound();
  const lang = locale;
  const t = aboutMessages[lang];
  const settings = await getSettings();
  const texts = siteTexts(settings, lang);
  const categories = await getActiveCategories();

  const whyTitle = fmt(t.why, { name: common[lang].orgName });

  return (
    <main>
      <PageHero
        lang={lang}
        eyebrow={t.title}
        title={common[lang].orgName}
        intro={<Localized value={texts.tagline} />}
        breadcrumb={[{ href: "/about", label: t.crumb }]}
      />

      {/* পরিচিতি — who we are (the organization's own words from settings). */}
      <section aria-labelledby="about-intro-title" className={`${container} py-14 sm:py-16`}>
        <SectionTitle id="about-intro-title" title={t.intro} align="start" className="mb-8" />
        <div className={cardClass}>
          <h3 className={`${cardTitleClass} mb-3`}>{t.identity.title}</h3>
          <div data-testid="about-identity">
            <Paragraphs value={texts.about.whatIs} className="text-ink wrap-anywhere" />
          </div>
        </div>
      </section>

      {/* লক্ষ্য ও উদ্দেশ্য */}
      <section aria-labelledby="about-goal-title" className="border-y border-sage-200 bg-sage-50">
        <div className={`${container} py-14 sm:py-16`}>
          <SectionTitle id="about-goal-title" title={t.goalObjective} />
          <div className="grid gap-5 md:grid-cols-2">
            <div className={cardClass}>
              <span className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-sage-100 text-forest-700">
                <Target className="size-6" aria-hidden="true" />
              </span>
              <h3 className={cardTitleClass}>{t.goal}</h3>
              <div data-testid="about-goal" className="mt-2">
                <Paragraphs value={texts.about.goal} className="text-ink wrap-anywhere" />
              </div>
            </div>
            <div className={cardClass}>
              <span className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-sage-100 text-forest-700">
                <Compass className="size-6" aria-hidden="true" />
              </span>
              <h3 className={cardTitleClass}>{t.objective}</h3>
              <div data-testid="about-objective" className="mt-2">
                <Paragraphs value={texts.about.objective} className="text-ink wrap-anywhere" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* কেন — why this organization exists (homepage intro links to /about#why). */}
      <section id="why" aria-labelledby="about-why-title" className={`${container} py-14 sm:py-16`}>
        <div className="rounded-[var(--radius-card)] border border-gold-400/60 bg-gold-50 p-6 shadow-[var(--shadow-card)] sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <Quote className="size-10 shrink-0 text-gold-500" aria-hidden="true" />
            <div className="min-w-0">
              <h2 id="about-why-title" className="text-2xl font-bold text-forest-800 sm:text-3xl">
                {whyTitle}
              </h2>
              <div data-testid="about-why" className="mt-3">
                <Paragraphs value={texts.about.why} className="text-ink wrap-anywhere" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* কার্যক্রম — the areas of work, numbered, each linking to its page. */}
      {categories.length > 0 && (
        <section aria-labelledby="about-activities-title" className="border-y border-sage-200 bg-sage-50">
          <div className={`${container} py-14 sm:py-16`}>
            <SectionTitle id="about-activities-title" eyebrow={t.activities.eyebrow} title={t.activities.title} intro={t.activities.intro} />
            <ol data-testid="about-activities" className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
              {categories.map((c, i) => (
                <li key={c.id} className={`${cardClass} flex gap-4 p-5`}>
                  <span aria-hidden="true" className="text-2xl font-bold text-gold-600">
                    {num(lang, i + 1)}.
                  </span>
                  <span className="min-w-0">
                    <Link
                      href={localePath(lang, `/activities/${c.slug}`)}
                      className="text-lg font-bold text-forest-800 underline-offset-4 hover:text-forest-900 hover:underline"
                    >
                      <Localized value={pickField(lang, c, "name")} />
                    </Link>
                    {(c.summary || c.summary_en) && (
                      <Localized as="p" value={pickField(lang, c, "summary")} className="mt-1 text-muted wrap-anywhere" />
                    )}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-8 text-center">
              <Link href={localePath(lang, "/programs")} className="inline-flex items-center gap-1.5 font-semibold text-forest-700 underline-offset-4 hover:text-forest-900 hover:underline">
                {t.activities.programsLink}
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </p>
          </div>
        </section>
      )}

      {/* স্লোগান — always in Bengali; the English rendering goes beneath it. */}
      <section aria-labelledby="about-slogan-title" className={`${container} py-14 text-center sm:py-16`}>
        <h2 id="about-slogan-title" className="divider-star mb-4 justify-center text-sm font-semibold tracking-wide text-gold-800">
          {t.slogan}
        </h2>
        <Localized as="p" value={texts.slogan} className="mx-auto max-w-3xl text-2xl font-bold text-forest-800 sm:text-3xl" />
        {texts.sloganTranslation && <p className="mt-3 text-lg text-muted">{texts.sloganTranslation}</p>}
      </section>

      {/* যুক্ত থাকুন — address and the way into the rest of the site. */}
      <section aria-labelledby="about-connect-title" className="border-t border-sage-200 bg-sage-50">
        <div className={`${container} py-14 sm:py-16`}>
          <SectionTitle id="about-connect-title" title={t.connect.title} />
          <div data-testid="about-links" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className={cardClass}>
              <span className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-sage-100 text-forest-700">
                <MapPin className="size-6" aria-hidden="true" />
              </span>
              <h3 className={cardTitleClass}>{t.connect.address}</h3>
              {texts.address && <Localized as="p" value={texts.address} className="mt-2 text-ink" />}
              <Link href={localePath(lang, "/contact")} className={cardLinkClass}>
                {t.connect.contact}
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </div>

            <div className={cardClass}>
              <h3 className={cardTitleClass}>{t.connect.members}</h3>
              <p className="mt-2 text-ink">{t.connect.membersBody}</p>
              {texts.committeeTerm && (
                <p className="mt-2 text-ink">
                  {t.connect.membersTerm} <Localized value={texts.committeeTerm} />
                </p>
              )}
              <Link href={localePath(lang, "/members")} className={cardLinkClass}>
                {t.connect.membersCta}
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </div>

            <div className={cardClass}>
              <h3 className={cardTitleClass}>{t.connect.join}</h3>
              {settings.membership.is_open ? (
                <>
                  <p className="mt-2 text-ink">{t.connect.joinBody}</p>
                  <Link href={localePath(lang, "/membership")} className={cardLinkClass}>
                    {t.connect.joinCta}
                    <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                  </Link>
                </>
              ) : (
                <>
                  <p className="mt-2 text-ink">{t.connect.joinClosed}</p>
                  <Link href={localePath(lang, "/membership/status")} className={cardLinkClass}>
                    {t.connect.statusCta}
                    <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                  </Link>
                </>
              )}
            </div>

            <div className={cardClass}>
              <h3 className={cardTitleClass}>{t.connect.press}</h3>
              <p className="mt-2 text-ink">{t.connect.pressBody}</p>
              <Link href={localePath(lang, "/notice")} className={cardLinkClass}>
                {t.connect.pressCta}
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </div>

            <div className={cardClass}>
              <h3 className={cardTitleClass}>{t.connect.faq}</h3>
              <p className="mt-2 text-ink">{t.connect.faqBody}</p>
              <Link href={localePath(lang, "/faq")} className={cardLinkClass}>
                {t.connect.faqCta}
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
