import type { Locale } from "@/i18n/config";
import { common } from "@/i18n/messages/common";
import { localePath } from "@/i18n/paths";
import { getSettings } from "@/lib/settings";
import { siteTexts } from "@/lib/site/localized-settings";
import { headerNav, publicNavLinks, socialItems } from "./nav";
import { SiteHeader } from "./header";
import { SiteFooter } from "./footer";

/** Skip link + header + <main> + footer for every public page (and the public 404). */
export async function SiteChrome({ lang, children }: { lang: Locale; children: React.ReactNode }) {
  const settings = await getSettings();
  const t = common[lang];
  const texts = siteTexts(settings, lang);
  // URLs below are already validated by getSettings() → normalizeSettings().
  const social = socialItems(settings.contact.facebook_url, settings.social.links, lang);
  // Seerat Quiz is removed from top header menu, but kept in footer pointing to the internal /quiz portal
  const items = headerNav({ directoryEnabled: settings.directory.enabled, quizUrl: null, quizLabel: texts.quizLabel }, lang);
  const footerQuiz = {
    url: localePath(lang, "/quiz"),
    label: texts.quizLabel,
  };

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow">
        {t.skipToContent}
      </a>
      <SiteHeader
        items={items}
        social={social}
        membershipOpen={settings.membership.is_open}
        lang={lang}
        labels={{
          orgName: texts.orgName.text,
          orgNameLang: texts.orgName.lang,
          tagline: texts.tagline.text,
          taglineLang: texts.tagline.lang,
          navLabel: t.nav.label,
          mobileLabel: t.nav.mobileLabel,
          menuTitle: t.nav.menuTitle,
          join: t.nav.join,
          joinShort: t.nav.joinShort,
          openMenu: t.nav.openMenu,
          closeMenu: t.nav.closeMenu,
          languageLabel: t.language.label,
          socialLabel: t.social.label,
          socialMenuLabel: t.social.menuLabel,
          opensInNewTab: t.social.opensInNewTab,
        }}
        homeHref={localePath(lang, "/")}
        joinHref={localePath(lang, "/membership")}
      />
      <main id="main">{children}</main>
      <SiteFooter
        settings={settings}
        links={publicNavLinks(settings.directory.enabled, lang, footerQuiz)}
        social={social}
        lang={lang}
      />
    </>
  );
}
