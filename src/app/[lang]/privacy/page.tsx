import "server-only";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import { isLocale, DEFAULT_LOCALE, fmt, type Locale } from "@/i18n/config";
import { Localized, splitTemplate } from "@/i18n/localized";
import { localePath } from "@/i18n/paths";
import { common } from "@/i18n/messages/common";
import { privacy, PRIVACY_LAST_UPDATED } from "@/i18n/messages/privacy";
import { formatDate } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { siteTexts } from "@/lib/site/localized-settings";
import { pageMetadata } from "@/lib/site/metadata";
import { PageHero } from "@/components/site/page-hero";
import { container } from "@/components/ui/card";

type PrivacyMessages = (typeof privacy)[Locale];

/** Renders a policy text, turning {contact} and {access} into the links the message file promises. */
function RichText({ text, lang, t }: { text: string; lang: Locale; t: PrivacyMessages }): ReactNode {
  const parts = text.split(/(\{contact\}|\{access\})/g);
  return parts.map((part, i) => {
    if (part === "{contact}") {
      return (
        <Link
          key={i}
          href={localePath(lang, "/contact")}
          className="font-semibold text-forest-700 underline underline-offset-4 hover:text-forest-900"
        >
          {t.links.contact}
        </Link>
      );
    }
    if (part === "{access}") {
      return (
        <a key={i} href="#access" className="font-semibold text-forest-700 underline underline-offset-4 hover:text-forest-900">
          {t.links.access}
        </a>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const locale = ((await params).lang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) return {};
  const t = privacy[locale];
  const meta = pageMetadata({ title: t.title, description: t.metaDescription, path: "/privacy", lang: locale });
  return { ...meta, title: { absolute: `${t.title} | ${common[locale].orgName}` } };
}

/**
 * গোপনীয়তা নীতি: fixed policy text from the message file (summary,
 * contents with one link per section, then every section in order).
 */
export default async function PrivacyPage({ params }: { params: Promise<{ lang: string }> }) {
  const locale = ((await params).lang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) notFound();
  const t = privacy[locale];

  const settings = await getSettings();
  const texts = siteTexts(settings, locale);
  const [introBefore, introAfter] = splitTemplate(t.intro, "org");

  return (
    <>
      <PageHero
        title={t.title}
        eyebrow={t.eyebrow}
        intro={
          <>
            {introBefore}
            <Localized value={texts.orgName} />
            {introAfter}
          </>
        }
        breadcrumb={[{ href: "/privacy", label: t.crumb }]}
        lang={locale}
      />
      <div className={`${container} py-12 sm:py-16`}>
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-muted">{fmt(t.lastUpdated, { date: formatDate(PRIVACY_LAST_UPDATED, locale) })}</p>

          <section aria-labelledby="privacy-summary" className="mt-8 rounded-[var(--radius-card)] border border-gold-400/60 bg-gold-50 p-6 shadow-[var(--shadow-card)] sm:p-8">
            <h2 id="privacy-summary" className="text-2xl font-bold text-forest-800">
              {t.summaryTitle}
            </h2>
            <ul className="mt-4 list-disc space-y-2 ps-5 text-ink/90">
              {t.summary.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <nav aria-label={t.tocLabel} className="mt-10">
            <h2 className="text-xl font-bold text-forest-800">{t.tocTitle}</h2>
            <ol className="mt-3 list-decimal space-y-1 ps-5">
              {t.sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="inline-flex min-h-11 items-center font-medium text-forest-700 underline-offset-4 hover:text-forest-900 hover:underline">
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {t.sections.map((section) => (
            <section key={section.id} id={section.id} aria-labelledby={`privacy-${section.id}`} className="mt-12 scroll-mt-24">
              <h2 id={`privacy-${section.id}`} className="text-2xl font-bold text-forest-800">
                {section.title}
              </h2>
              <div className="mt-4 space-y-4">
                {section.blocks.map((block, i) =>
                  "list" in block ? (
                    <ul key={i} className="list-disc space-y-2 ps-5 text-ink/90">
                      {block.list.map((item, j) => (
                        <li key={j}>
                          <RichText text={item} lang={locale} t={t} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p key={i} className="text-ink/90 wrap-anywhere">
                      <RichText text={block.p} lang={locale} t={t} />
                    </p>
                  ),
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
