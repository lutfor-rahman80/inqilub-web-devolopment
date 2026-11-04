import "server-only";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ShieldCheck } from "lucide-react";
import { fmt, isLocale, DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { common } from "@/i18n/messages/common";
import {
  membership as membershipMessages,
  applicationFormMessages,
} from "@/i18n/messages/membership";
import { getSettings } from "@/lib/settings";
import { siteTexts } from "@/lib/site/localized-settings";
import { pageMetadata } from "@/lib/site/metadata";
import { emailEnabled } from "@/lib/membership/email-config";
import { ApplicationForm, type DeclarationTexts } from "@/components/membership/application-form";
import { PageHero } from "@/components/site/page-hero";
import { container } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";

const PATH = "/membership";

// Applications open/close in the admin settings; the public page is cached
// so a change can take a few minutes to show.
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const locale = (await params).lang as Locale;
  if (!isLocale(locale)) return {};
  const t = membershipMessages[locale];
  const org = common[locale].orgName;
  const md = pageMetadata({
    title: t.apply.metaTitle,
    description: fmt(t.apply.metaDescription, { org }),
    path: PATH,
    lang: locale,
  });
  return { ...md, title: { absolute: `${t.apply.metaTitle} | ${org}` } };
}

const cardClass =
  "rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-[var(--shadow-card)]";
const cardTitleClass = "font-display text-lg font-bold text-ink";
const cardBodyClass = "mt-2 text-sm leading-relaxed text-ink-soft";

export default async function MembershipPage({ params }: { params: Promise<{ lang: string }> }) {
  const locale = ((await params).lang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) notFound();

  const t = membershipMessages[locale];
  const settings = await getSettings();
  const texts = siteTexts(settings, locale);
  const orgName = texts.orgName.text;
  const open = settings.membership.is_open;
  const facebookUrl = (settings.contact.facebook_url ?? "").trim();

  // The form shows the visitor-language declaration when one is configured;
  // otherwise it shows the Bengali text honestly (see DeclarationTexts).
  const translated = locale === "en" && settings.membership.en.declaration.length > 0;
  const declaration: DeclarationTexts = {
    paragraphs: texts.declaration.paragraphs,
    lang: texts.declaration.lang,
    original: translated ? settings.membership.declaration : null,
  };

  return (
    <main>
      <PageHero
        lang={locale}
        eyebrow={t.eyebrow}
        title={t.apply.title}
        intro={fmt(t.apply.intro, { org: orgName })}
        breadcrumb={[{ href: PATH, label: t.apply.crumb }]}
      />

      <section className={`${container} py-12 sm:py-16`}>
        {open ? (
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <ApplicationForm
              lang={locale}
              t={applicationFormMessages(locale)}
              declaration={declaration}
              emailEnabled={emailEnabled()}
              orgName={orgName}
            />

            <aside aria-label={t.apply.aside.label} className="space-y-5">
              <div className={cardClass}>
                <h2 className={cardTitleClass}>{t.apply.aside.needTitle}</h2>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-soft">
                  {[t.apply.aside.needId, t.apply.aside.needMobile, t.apply.aside.needEmail].map((item) => (
                    <li key={item} className="flex gap-2">
                      <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={cardClass}>
                <h2 className={`${cardTitleClass} flex items-center gap-2`}>
                  <ShieldCheck aria-hidden className="h-5 w-5 text-brand-700" />
                  {t.apply.aside.privacyTitle}
                </h2>
                <p className={cardBodyClass}>{t.apply.aside.privacyBody}</p>
                <ul className="mt-3 space-y-1.5 text-sm font-semibold">
                  <li>
                    <Link className="text-brand-800 underline-offset-4 hover:underline" href={localePath(locale, "/membership/terms")}>
                      {t.apply.aside.terms}
                    </Link>
                  </li>
                  <li>
                    <Link className="text-brand-800 underline-offset-4 hover:underline" href={localePath(locale, "/privacy")}>
                      {t.apply.aside.privacy}
                    </Link>
                  </li>
                </ul>
              </div>

              <div className={cardClass}>
                <h2 className={cardTitleClass}>{t.apply.aside.alreadyTitle}</h2>
                <p className={cardBodyClass}>{t.apply.aside.alreadyBody}</p>
                <Link className={`${buttonClass("outline", "sm")} mt-4`} href={localePath(locale, "/membership/status")}>
                  {t.apply.aside.alreadyCta}
                </Link>
              </div>

              {t.apply.aside.languageNote ? (
                <p className="rounded-xl bg-gold-50 px-4 py-3 text-sm leading-relaxed text-gold-900 ring-1 ring-gold-200">
                  {t.apply.aside.languageNote}
                </p>
              ) : null}
            </aside>
          </div>
        ) : (
          <div data-testid="membership-closed" className={`${cardClass} max-w-3xl p-8`}>
            <h2 className="font-display text-2xl font-bold text-ink">{t.apply.closed.title}</h2>
            <p className="mt-3 leading-relaxed text-ink-soft">{t.apply.closed.body}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className={buttonClass("primary", "md")} href={localePath(locale, "/membership/status")}>
                {t.apply.closed.statusCta}
              </Link>
              <Link className={buttonClass("outline", "md")} href={localePath(locale, "/contact")}>
                {t.apply.closed.contactCta}
              </Link>
            </div>
            {facebookUrl ? (
              <p className="mt-6 text-sm leading-relaxed text-ink-soft">
                {t.apply.closed.facebookBefore}
                <a
                  className="font-semibold text-brand-800 underline-offset-4 hover:underline"
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t.apply.closed.facebookLink}
                </a>
                {t.apply.closed.facebookAfter}
              </p>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
