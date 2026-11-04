import "server-only";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fmt, isLocale, DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { common } from "@/i18n/messages/common";
import { membership as membershipMessages } from "@/i18n/messages/membership";
import { getSettings } from "@/lib/settings";
import { siteTexts } from "@/lib/site/localized-settings";
import { pageMetadata } from "@/lib/site/metadata";
import { declarationParts } from "@/lib/membership/schema";
import { PageHero } from "@/components/site/page-hero";
import { container } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";

const PATH = "/membership/terms";

const STATUS_ORDER = ["pending", "under_review", "approved", "rejected"] as const;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const locale = (await params).lang as Locale;
  if (!isLocale(locale)) return {};
  const t = membershipMessages[locale];
  const md = pageMetadata({
    title: t.terms.metaTitle,
    description: t.terms.metaDescription,
    path: PATH,
    lang: locale,
  });
  return { ...md, title: { absolute: `${t.terms.metaTitle} | ${common[locale].orgName}` } };
}

const sectionTitleClass = "font-display text-2xl font-bold text-ink";
const bodyClass = "mt-3 leading-relaxed text-ink-soft";

/** The pledge text with the applicant-name slot emphasized, like the form shows it. */
function DeclarationParagraphs({ paragraphs, nameSlot }: { paragraphs: string[]; nameSlot: string }) {
  return (
    <>
      {declarationParts(paragraphs, nameSlot).map((parts, i) => (
        <p key={i} className={i === 0 ? bodyClass : `${bodyClass} mt-2`}>
          {parts.map((part, j) =>
            part.isName ? (
              <strong key={j} className="font-semibold text-ink">
                {part.text}
              </strong>
            ) : (
              <span key={j}>{part.text}</span>
            ),
          )}
        </p>
      ))}
    </>
  );
}

export default async function MembershipTermsPage({ params }: { params: Promise<{ lang: string }> }) {
  const locale = ((await params).lang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) notFound();

  const t = membershipMessages[locale];
  const settings = await getSettings();
  const texts = siteTexts(settings, locale);
  const declaration = texts.declaration;
  // A translation only "exists" when English declaration text is configured;
  // otherwise the Bengali pledge is shown as-is and there is no original block.
  const translated = locale === "en" && settings.membership.en.declaration.length > 0;

  return (
    <main>
      <PageHero
        lang={locale}
        eyebrow={t.eyebrow}
        title={t.terms.title}
        intro={fmt(t.terms.intro, { org: texts.orgName.text })}
        breadcrumb={[{ href: PATH, label: t.terms.crumb }]}
      />

      <div className={`${container} py-12 sm:py-16`}>
        <div className="max-w-3xl space-y-12">
          <section>
            <h2 className={sectionTitleClass}>{t.terms.declarationTitle}</h2>
            <p className={bodyClass}>{t.terms.declarationLead}</p>
            <div data-testid="terms-declaration" lang={declaration.lang !== locale ? declaration.lang : undefined}>
              {declaration.paragraphs.length > 0 ? (
                <DeclarationParagraphs
                  paragraphs={declaration.paragraphs}
                  nameSlot={membershipMessages[declaration.lang].terms.nameSlot}
                />
              ) : (
                <p className={bodyClass}>{t.terms.declarationMissing}</p>
              )}
            </div>

            {translated ? (
              <>
                <p
                  data-testid="terms-official-note"
                  className="mt-4 rounded-xl bg-gold-50 px-4 py-3 text-sm leading-relaxed text-gold-900 ring-1 ring-gold-200"
                >
                  {t.form.review.officialNote}
                </p>
                <details
                  data-testid="terms-declaration-original"
                  className="mt-4 rounded-[var(--radius-card)] border border-line bg-surface p-5"
                >
                  <summary className="cursor-pointer font-semibold text-brand-800">{t.form.review.showOriginal}</summary>
                  <div lang="bn" className="mt-2">
                    <DeclarationParagraphs
                      paragraphs={settings.membership.declaration}
                      nameSlot={membershipMessages.bn.terms.nameSlot}
                    />
                  </div>
                </details>
              </>
            ) : null}

            <p className={bodyClass}>{t.terms.declarationAuto}</p>
          </section>

          <section>
            <h2 className={sectionTitleClass}>{t.terms.reviewTitle}</h2>
            <dl className="mt-4 space-y-4">
              {STATUS_ORDER.map((key) => (
                <div key={key} className="flex flex-col gap-1 sm:flex-row sm:gap-4">
                  <dt className="w-44 shrink-0 font-display font-bold text-ink">{t.statusLabels[key]}</dt>
                  <dd className="leading-relaxed text-ink-soft">{t.terms.reviewSteps[key]}</dd>
                </div>
              ))}
            </dl>
            <ul className="mt-5 list-disc space-y-1.5 ps-5 leading-relaxed text-ink-soft">
              {t.terms.reviewRules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
            <p className={bodyClass}>
              {t.terms.statusRuleBefore}
              <Link className="font-semibold text-brand-800 underline-offset-4 hover:underline" href={localePath(locale, "/membership/status")}>
                {t.terms.statusRuleLink}
              </Link>
              {t.terms.statusRuleAfter}
            </p>
          </section>

          <section>
            <h2 className={sectionTitleClass}>{t.terms.dataTitle}</h2>
            <p className={bodyClass}>{t.terms.dataCollected}</p>
            <p className={bodyClass}>
              {t.terms.dataAccessBefore}
              <Link className="font-semibold text-brand-800 underline-offset-4 hover:underline" href={localePath(locale, "/privacy")}>
                {t.terms.dataAccessLink}
              </Link>
              {t.terms.dataAccessAfter}
            </p>
          </section>

          <section>
            <h2 className={sectionTitleClass}>{t.terms.directoryTitle}</h2>
            <p className={bodyClass}>
              {t.terms.directoryBefore}
              <Link className="font-semibold text-brand-800 underline-offset-4 hover:underline" href={localePath(locale, "/contact")}>
                {t.terms.directoryLink}
              </Link>
              {t.terms.directoryAfter}
            </p>
            <p className={bodyClass}>{t.terms.directoryMinors}</p>
          </section>

          <div className="flex flex-wrap gap-3 border-t border-line pt-8">
            <Link className={buttonClass("primary", "md")} href={localePath(locale, "/membership")}>
              {t.terms.applyCta}
            </Link>
            <Link className={buttonClass("outline", "md")} href={localePath(locale, "/membership/status")}>
              {t.terms.statusCta}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
