import "server-only";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { isLocale, DEFAULT_LOCALE, fmt, type Locale } from "@/i18n/config";
import { pickField } from "@/i18n/content";
import { Localized } from "@/i18n/localized";
import { localePath } from "@/i18n/paths";
import { common } from "@/i18n/messages/common";
import { faq } from "@/i18n/messages/faq";
import { num } from "@/lib/format";
import { SITE_URL } from "@/lib/env";
import { getPublishedFaqs, type PublicFaq } from "@/lib/faq/queries";
import { pageMetadata } from "@/lib/site/metadata";
import { toParagraphs } from "@/lib/site/text";
import { PageHero } from "@/components/site/page-hero";
import { FaqJsonLd } from "@/components/seo/json-ld";
import { buttonClass } from "@/components/ui/button";
import { container } from "@/components/ui/card";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const locale = ((await params).lang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) return {};
  const t = faq[locale];
  const meta = pageMetadata({ title: t.title, description: t.metaDescription, path: "/faq", lang: locale });
  return { ...meta, title: { absolute: `${t.title} | ${common[locale].orgName}` } };
}

/**
 * প্রশ্নোত্তর: published questions in the admins' order, as a native
 * <details> accordion (works without JavaScript; a “+” icon on the right
 * turns into “−” when open). English pages fall back to the Bengali text
 * (marked lang="bn") with a note; FAQPage JSON-LD mirrors the visible texts.
 */
export default async function FaqPage({ params }: { params: Promise<{ lang: string }> }) {
  const locale = ((await params).lang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) notFound();
  const t = faq[locale];
  const contactHref = localePath(locale, "/contact");

  let entries: PublicFaq[] | null = null;
  try {
    entries = await getPublishedFaqs();
  } catch {
    entries = null;
  }

  const picked = (entries ?? []).map((entry) => ({
    entry,
    question: pickField(locale, entry, "question"),
    answer: pickField(locale, entry, "answer"),
  }));
  const hasFallback = locale === "en" && picked.some((p) => p.question.isFallback || p.answer.isFallback);

  return (
    <>
      <PageHero
        title={t.title}
        eyebrow={t.eyebrow}
        intro={t.intro}
        breadcrumb={[{ href: "/faq", label: t.crumb }]}
        lang={locale}
      />
      <section className={`${container} py-12 sm:py-16`} aria-label={t.listLabel}>
        {entries === null ? (
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold text-forest-800">{t.errorTitle}</h2>
            <p className="mt-3 text-ink/90">{t.errorBody}</p>
            <Link href={contactHref} className={`${buttonClass("primary", "md")} mt-6`}>
              {t.contactCta}
            </Link>
          </div>
        ) : entries.length === 0 ? (
          <div data-testid="faq-empty" className="max-w-3xl rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8">
            <h2 className="text-2xl font-bold text-forest-800">{t.emptyTitle}</h2>
            <p className="mt-3 text-ink/90">{t.emptyBody}</p>
            <Link href={contactHref} className={`${buttonClass("primary", "md")} mt-6`}>
              {t.contactCta}
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <p className="font-semibold text-forest-800">
                {picked.length === 1 ? t.countOne : fmt(t.count, { count: num(locale, picked.length) })}
              </p>
              <p className="text-sm text-muted">{t.hint}</p>
            </div>
            {hasFallback && (
              <p role="note" className="mt-4 rounded-xl bg-gold-50 px-4 py-3 text-sm text-gold-800 ring-1 ring-gold-400/40">
                {t.englishNote}
              </p>
            )}
            <div data-testid="faq-list" className="mt-6 grid items-start gap-4">
              {picked.map(({ entry, question, answer }) => (
                <details
                  key={entry.id}
                  data-faq-id={entry.id}
                  className="group rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)] open:border-gold-400/70"
                >
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-lg font-semibold text-forest-800 [&::-webkit-details-marker]:hidden">
                    <Localized value={question} />
                    <span className="shrink-0 text-forest-600">
                      <Plus className="size-6 group-open:hidden" aria-hidden="true" />
                      <Minus className="hidden size-6 group-open:block" aria-hidden="true" />
                    </span>
                  </summary>
                  <div className="space-y-3 px-5 pb-5">
                    {toParagraphs(answer.text).map((paragraph, i) => (
                      <Localized
                        key={i}
                        as="p"
                        value={{ ...answer, text: paragraph }}
                        className="whitespace-pre-line text-ink/90 wrap-anywhere"
                      />
                    ))}
                  </div>
                </details>
              ))}
            </div>
            <FaqJsonLd
              entries={picked.map(({ question, answer }) => ({ question: question.text, answer: answer.text }))}
              url={`${SITE_URL}${localePath(locale, "/faq")}`}
              lang={locale}
            />
            <div className="mt-12 max-w-3xl">
              <h2 className="text-2xl font-bold text-forest-800">{t.moreTitle}</h2>
              <p className="mt-3 text-ink/90">{t.moreBody}</p>
              <Link href={contactHref} className={`${buttonClass("primary", "md")} mt-6`}>
                {t.contactCta}
              </Link>
            </div>
          </>
        )}
      </section>
    </>
  );
}
