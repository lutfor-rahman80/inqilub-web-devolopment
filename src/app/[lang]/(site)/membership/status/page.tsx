import "server-only";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { common } from "@/i18n/messages/common";
import { membership as membershipMessages, statusFormMessages } from "@/i18n/messages/membership";
import { normalizeTrackingNo } from "@/lib/membership/normalize";
import { pageMetadata } from "@/lib/site/metadata";
import { StatusForm } from "@/components/membership/status-form";
import { PageHero } from "@/components/site/page-hero";
import { container } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";

const PATH = "/membership/status";

const STATUS_ORDER = ["pending", "under_review", "approved", "rejected"] as const;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const locale = (await params).lang as Locale;
  if (!isLocale(locale)) return {};
  const t = membershipMessages[locale];
  const md = pageMetadata({
    title: t.status.metaTitle,
    description: t.status.metaDescription,
    path: PATH,
    lang: locale,
  });
  return { ...md, title: { absolute: `${t.status.metaTitle} | ${common[locale].orgName}` } };
}

const cardClass =
  "rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-[var(--shadow-card)]";
const cardTitleClass = "font-display text-lg font-bold text-ink";
const cardBodyClass = "mt-2 text-sm leading-relaxed text-ink-soft";

export default async function MembershipStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ no?: string | string[] }>;
}) {
  const locale = ((await params).lang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) notFound();

  const t = membershipMessages[locale];
  const query = await searchParams;
  const rawNo = Array.isArray(query.no) ? query.no[0] : query.no;
  const initialNo = rawNo ? normalizeTrackingNo(rawNo.slice(0, 60)) : "";

  return (
    <main>
      <PageHero
        lang={locale}
        eyebrow={t.eyebrow}
        title={t.status.title}
        intro={t.status.intro}
        breadcrumb={[{ href: PATH, label: t.status.crumb }]}
      />

      <section className={`${container} py-12 sm:py-16`}>
        <div className="mx-auto max-w-3xl">
          <div className={cardClass}>
            <StatusForm lang={locale} t={statusFormMessages(locale)} initialNo={initialNo} />
          </div>

          <section aria-label={t.status.meaningsLabel} data-testid="status-meanings" className="mt-10">
            <h2 className="font-display text-xl font-bold text-ink">{t.status.meaningsTitle}</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {STATUS_ORDER.map((key) => (
                <div key={key} className={cardClass}>
                  <dt className="font-display font-bold text-ink">{t.statusLabels[key]}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-ink-soft">{t.status.meanings[key]}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <div className={cardClass}>
              <h2 className={cardTitleClass}>{t.status.privacyTitle}</h2>
              <p className={cardBodyClass}>{t.status.privacyBody}</p>
            </div>
            <div className={cardClass}>
              <h2 className={cardTitleClass}>{t.status.notYetTitle}</h2>
              <Link className={`${buttonClass("primary", "sm")} mt-4`} href={localePath(locale, "/membership")}>
                {t.status.notYetCta}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
