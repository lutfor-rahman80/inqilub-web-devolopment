import "server-only";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { home } from "@/i18n/messages/home";
import { getSettings } from "@/lib/settings";
import { siteTexts } from "@/lib/site/localized-settings";
import { pageMetadata } from "@/lib/site/metadata";
import { getActivityCategories } from "@/lib/gallery/queries";
import { emailEnabled } from "@/lib/membership/email-config";
import { socialItems } from "@/components/site/nav";
import { getHeroSlides, getHomeAnnouncements, getHomeProgramSections, getLatestPhotos } from "@/components/home/data";
import { toHeroSlides } from "@/components/home/hero-slides";
import { HomeHero } from "@/components/home/hero";
import { HomeIntro } from "@/components/home/intro";
import { HomeCategories } from "@/components/home/categories";
import { HomeProgramSections } from "@/components/home/program-sections";
import { PhotoHighlights } from "@/components/home/photo-highlights";
import { HomeAnnouncements } from "@/components/home/announcements";
import { MembershipCta } from "@/components/home/membership-cta";
import { SocialBand } from "@/components/home/social-band";
import { OrganizationJsonLd } from "@/components/home/org-jsonld";

/** Latest photos shown in the highlights grid (2 columns on phones, 3 from md: two full rows). */
const PHOTO_HIGHLIGHTS_LIMIT = 6;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const locale = ((await params).lang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) return {};
  const texts = siteTexts(await getSettings(), locale);
  return pageMetadata({
    title: texts.orgName.text,
    description: texts.about.goal.text || texts.tagline.text,
    path: "/",
    lang: locale,
    absoluteTitle: true,
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const locale = ((await params).lang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) notFound();

  const [settings, categories, hero, latestPhotos, announcements, programSections] = await Promise.all([
    getSettings(),
    getActivityCategories(),
    getHeroSlides(),
    getLatestPhotos(PHOTO_HIGHLIGHTS_LIMIT),
    getHomeAnnouncements(),
    getHomeProgramSections(),
  ]);

  const texts = siteTexts(settings, locale);
  const social = socialItems(settings.contact.facebook_url, settings.social.links, locale);
  // getHeroSlides() is null only when the read failed: the hero then shows its
  // "unavailable" empty state instead of pretending there are no photos.
  const slides = hero ? toHeroSlides(hero.photos, locale, home[locale].slider.fallbackLabel) : [];

  return (
    <main>
      <OrganizationJsonLd settings={settings} social={social} lang={locale} />
      <HomeHero
        lang={locale}
        texts={texts}
        membershipOpen={settings.membership.is_open}
        facebookUrl={settings.contact.facebook_url ?? null}
        slides={slides}
        failed={hero === null}
      />
      <HomeIntro lang={locale} texts={texts} />
      <HomeCategories lang={locale} categories={categories} />
      <HomeProgramSections lang={locale} sections={programSections} />
      <PhotoHighlights lang={locale} photos={latestPhotos ?? []} />
      <HomeAnnouncements lang={locale} items={announcements} />
      <MembershipCta lang={locale} isOpen={settings.membership.is_open} emailUpdates={emailEnabled()} />
      <SocialBand lang={locale} social={social} />
    </main>
  );
}
