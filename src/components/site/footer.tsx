import Link from "next/link";
import { ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { num } from "@/lib/format";
import type { SiteSettings } from "@/lib/settings";
import { normalizeSettings, telHref } from "@/lib/site/safe-settings";
import { siteTexts } from "@/lib/site/localized-settings";
import type { Locale } from "@/i18n/config";
import { common } from "@/i18n/messages/common";
import { localePath } from "@/i18n/paths";
import { Localized } from "@/i18n/localized";
import { SocialIcon } from "./social-menu-icons";
import type { FooterLink, SocialItem } from "./nav";

const linkClass =
  "inline-flex min-h-11 items-center gap-1.5 rounded text-sage-100 underline-offset-4 transition-colors hover:text-gold-400 hover:underline";

/** Site footer (deep forest band): identity and trust lines, social links, all site links, contact. */
export function SiteFooter({
  settings,
  links,
  social,
  lang,
}: {
  settings: SiteSettings;
  /** Quick links in menu order (quiz link included when configured; Notice last). */
  links: FooterLink[];
  social: SocialItem[];
  lang: Locale;
}) {
  // Normalize so a malformed value can never break every page or turn a link
  // into an arbitrary URL.
  const normalized = normalizeSettings(settings);
  const { contact, membership } = normalized;
  const texts = siteTexts(normalized, lang);
  const t = common[lang];
  const phoneHref = contact.phone ? telHref(contact.phone) : null;

  return (
    <footer className="pattern-islamic mt-20 bg-forest-900 text-sage-100">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.25fr_1.4fr_1fr_1.15fr] lg:px-8">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Logo size={56} alt={t.logoAlt} className="shrink-0" />
            <div className="min-w-0">
              <Localized as="p" className="font-serif text-xl font-bold leading-snug text-white wrap-anywhere" value={texts.orgName} />
              <Localized as="p" className="text-sm text-sage-200 wrap-anywhere" value={texts.tagline} />
            </div>
          </div>
          <p className="mt-4 font-serif text-lg text-gold-400 wrap-anywhere" lang="bn">“{texts.slogan.text}”</p>
          {texts.sloganTranslation && <p className="mt-1 text-sm text-sage-200">{texts.sloganTranslation}</p>}
          <p className="mt-4 text-sm text-sage-200">{t.footer.nonPolitical}</p>
          <p className="mt-1 text-sm text-sage-200">{t.footer.officialChannels}</p>
          {social.length > 0 && (
            <div className="mt-5">
              <p id="footer-social" className="mb-2 text-sm font-semibold text-white">{t.footer.followUs}</p>
              <ul aria-labelledby="footer-social" className="flex flex-wrap gap-2" data-testid="footer-social">
                {social.map((s) => (
                  <li key={s.platform}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-platform={s.platform}
                      aria-label={`${s.label} ${t.social.opensInNewTab}`}
                      title={s.label}
                      className="press inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-gold-500 hover:text-forest-900"
                    >
                      <SocialIcon platform={s.platform} className="size-5" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <nav aria-labelledby="footer-explore" className="min-w-0">
          <p id="footer-explore" className="mb-3 font-semibold text-white">{t.footer.quickLinks}</p>
          <ul className="grid grid-cols-2 gap-x-4">
            {links.map((l) => (
              <li key={l.href} className="min-w-0">
                {l.external ? (
                  <a href={l.href} target="_blank" rel="noopener noreferrer" className={linkClass} data-testid="footer-quiz-link">
                    {l.label}
                    <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="sr-only"> {t.social.opensInNewTab}</span>
                  </a>
                ) : (
                  <Link href={l.href} className={linkClass}>{l.label}</Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-membership" className="min-w-0">
          <p id="footer-membership" className="mb-3 font-semibold text-white">{t.footer.membership}</p>
          <ul>
            {membership.is_open && (
              <li><Link href={localePath(lang, "/membership")} className={linkClass}>{t.nav.join}</Link></li>
            )}
            <li><Link href={localePath(lang, "/membership/status")} className={linkClass}>{t.footer.membershipStatus}</Link></li>
            <li><Link href={localePath(lang, "/membership/terms")} className={linkClass}>{t.footer.terms}</Link></li>
            <li><Link href={localePath(lang, "/privacy")} className={linkClass}>{t.footer.privacy}</Link></li>
          </ul>
        </nav>

        <div className="min-w-0">
          <p className="mb-3 font-semibold text-white">{t.footer.contact}</p>
          <ul className="space-y-1">
            {texts.address && (
              <li className="flex gap-2 py-2.5">
                <MapPin className="mt-1 size-5 shrink-0 text-gold-400" aria-hidden="true" />
                <Localized className="min-w-0 wrap-anywhere" value={texts.address} />
              </li>
            )}
            {contact.phone && (
              <li className="flex items-center gap-2">
                <Phone className="size-5 shrink-0 text-gold-400" aria-hidden="true" />
                {phoneHref ? (
                  <a href={phoneHref} className={`${linkClass} min-w-0 wrap-anywhere`}>{num(lang, contact.phone)}</a>
                ) : (
                  <span className="min-w-0 wrap-anywhere">{num(lang, contact.phone)}</span>
                )}
              </li>
            )}
            {contact.email && (
              <li className="flex items-center gap-2">
                <Mail className="size-5 shrink-0 text-gold-400" aria-hidden="true" />
                <a href={`mailto:${contact.email}`} className={`${linkClass} min-w-0 break-all`}>{contact.email}</a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-4 text-center text-sm text-sage-200 sm:px-6 lg:px-8">
          © <Localized value={texts.orgName} /> · {t.footer.rights}
        </p>
      </div>
    </footer>
  );
}
