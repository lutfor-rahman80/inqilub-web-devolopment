import "server-only";
import { notFound } from "next/navigation";
import { lang as getLang } from "next/root-params";
import { isLocale, DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { getSettings } from "@/lib/settings";
import { siteTexts } from "@/lib/site/localized-settings";
import { HomeHero } from "@/components/home/hero";
import { HomeIntro } from "@/components/home/intro";

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const locale = ((await params).lang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) notFound();

  const settings = await getSettings();
  const texts = siteTexts(settings, locale);

  return (
    <main>
      <HomeHero
        lang={locale}
        texts={texts}
        membershipOpen={settings.membership.is_open}
        facebookUrl={settings.contact.facebook_url ?? null}
        slides={[]}
      />
      <HomeIntro lang={locale} texts={texts} />
    </main>
  );
}