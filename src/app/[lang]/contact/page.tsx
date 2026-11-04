import "server-only";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock, ExternalLink, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { fmt, isLocale, DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { Localized } from "@/i18n/localized";
import { common } from "@/i18n/messages/common";
import { contact as contactMessages } from "@/i18n/messages/contact";
import { getSettings } from "@/lib/settings";
import { siteTexts } from "@/lib/site/localized-settings";
import { pageMetadata } from "@/lib/site/metadata";
import { safeFacebookUrl } from "@/lib/site/urls";
import { container } from "@/components/ui/card";
import { PageHero } from "@/components/site/page-hero";
import { SectionTitle } from "@/components/site/section-title";
import { FacebookQr } from "@/components/site/facebook-qr";
import { ContactForm } from "./contact-form";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const locale = ((await params).lang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) return {};
  const t = contactMessages[locale];
  const texts = siteTexts(await getSettings(), locale);
  const md = pageMetadata({
    title: t.metaTitle,
    description: fmt(t.metaDescription, { org: common[locale].orgName, location: texts.location.text }),
    path: "/contact",
    lang: locale,
  });
  // No title template survives in the [lang] layout, so the document title
  // carries the "page | organization" form itself.
  return { ...md, title: { absolute: `${t.metaTitle} | ${common[locale].orgName}` } };
}

const cardClass = "rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-[var(--shadow-card)]";

export default async function ContactPage({ params }: { params: Promise<{ lang: string }> }) {
  const locale = ((await params).lang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) notFound();
  const lang = locale;
  const t = contactMessages[lang];
  const settings = await getSettings();
  const texts = siteTexts(settings, lang);
  const { contact } = settings;
  const facebookUrl = safeFacebookUrl(contact.facebook_url);

  return (
    <main>
      <PageHero
        lang={lang}
        eyebrow={t.eyebrow}
        title={t.title}
        intro={t.intro}
        breadcrumb={[{ href: "/contact", label: t.crumb }]}
      />

      <div className={`${container} grid gap-10 py-14 sm:py-16 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]`}>
        {/* যোগাযোগের তথ্য — address (general only), phone/email when set, hours. */}
        <div className="space-y-6">
          <section aria-label={t.infoLabel} className={cardClass}>
            <dl className="space-y-5">
              {texts.address && (
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 size-6 shrink-0 text-forest-700" aria-hidden="true" />
                  <div>
                    <dt className="font-semibold text-forest-800">{t.address}</dt>
                    <dd>
                      <Localized as="p" value={texts.address} className="text-ink" />
                    </dd>
                  </div>
                </div>
              )}
              {contact.phone && (
                <div className="flex gap-3">
                  <Phone className="mt-0.5 size-6 shrink-0 text-forest-700" aria-hidden="true" />
                  <div>
                    <dt className="font-semibold text-forest-800">{t.phone}</dt>
                    <dd>
                      <a href={`tel:${contact.phone.replace(/[\s-]/g, "")}`} className="text-ink underline-offset-4 hover:underline">
                        {contact.phone}
                      </a>
                    </dd>
                  </div>
                </div>
              )}
              {contact.email && (
                <div className="flex gap-3">
                  <Mail className="mt-0.5 size-6 shrink-0 text-forest-700" aria-hidden="true" />
                  <div>
                    <dt className="font-semibold text-forest-800">{t.email}</dt>
                    <dd>
                      <a href={`mailto:${contact.email}`} className="text-ink underline-offset-4 hover:underline">
                        {contact.email}
                      </a>
                    </dd>
                  </div>
                </div>
              )}
              {texts.officeHours && (
                <div className="flex gap-3">
                  <Clock className="mt-0.5 size-6 shrink-0 text-forest-700" aria-hidden="true" />
                  <div>
                    <dt className="font-semibold text-forest-800">{t.hours}</dt>
                    <dd>
                      <Localized as="p" value={texts.officeHours} className="text-ink" />
                    </dd>
                  </div>
                </div>
              )}
            </dl>
            <p className="mt-5 text-muted">{facebookUrl ? t.noDirectWithFacebook : t.noDirect}</p>
          </section>

          {facebookUrl && (
            <section data-testid="contact-facebook" aria-labelledby="contact-facebook-title" className={cardClass}>
              <h2 id="contact-facebook-title" className="text-xl font-bold text-forest-800">
                {t.facebook.title}
              </h2>
              <p className="mt-1 text-muted">{t.facebook.subtitle}</p>
              <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <FacebookQr url={facebookUrl} lang={lang} />
                <div className="space-y-3">
                  <p className="text-ink">{t.facebook.scan}</p>
                  <p>
                    <a
                      href={facebookUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 font-semibold text-forest-700 underline-offset-4 hover:text-forest-900 hover:underline"
                    >
                      {t.facebook.open}
                      <span className="text-sm font-normal text-muted">{t.newTab}</span>
                      <ExternalLink className="size-4" aria-hidden="true" />
                    </a>
                  </p>
                  <p>
                    <a href="/qr/facebook" data-testid="qr-download" className="font-semibold text-forest-700 underline-offset-4 hover:text-forest-900 hover:underline">
                      {t.facebook.download}
                    </a>
                  </p>
                </div>
              </div>
            </section>
          )}

          {settings.social.links.length > 0 && (
            <section aria-labelledby="contact-social-title" className={cardClass}>
              <h2 id="contact-social-title" className="text-xl font-bold text-forest-800">
                {t.otherSocial}
              </h2>
              <ul className="mt-3 space-y-2">
                {settings.social.links.map((link) => (
                  <li key={link.platform}>
                    <a href={link.url} target="_blank" rel="noreferrer" className="font-semibold text-forest-700 capitalize underline-offset-4 hover:underline">
                      {link.platform}
                      <span className="ms-2 text-sm font-normal text-muted">{t.newTab}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section data-testid="contact-faq" aria-labelledby="contact-faq-title" className={cardClass}>
            <h2 id="contact-faq-title" className="text-xl font-bold text-forest-800">
              {t.faqTitle}
            </h2>
            <p className="mt-2 text-ink">{t.faqBody}</p>
            <Link
              href={localePath(lang, "/faq")}
              className="mt-4 inline-flex items-center gap-1.5 font-semibold text-forest-700 underline-offset-4 hover:text-forest-900 hover:underline"
            >
              {t.faqCta}
              <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
          </section>

          <section data-testid="contact-official" aria-labelledby="contact-official-title" className="rounded-[var(--radius-card)] border border-gold-400/60 bg-gold-50 p-6 shadow-[var(--shadow-card)]">
            <h2 id="contact-official-title" className="flex items-center gap-2 text-xl font-bold text-forest-800">
              <ShieldCheck className="size-6 shrink-0 text-gold-600" aria-hidden="true" />
              {t.officialTitle}
            </h2>
            <p className="mt-2 text-ink">{common[lang].footer.officialChannels}</p>
          </section>
        </div>

        {/* বার্তা পাঠানোর ফর্ম */}
        <section aria-labelledby="contact-form-title" className={cardClass}>
          <SectionTitle id="contact-form-title" title={t.formTitle} align="start" className="mb-6" />
          <p className="-mt-3 mb-5 text-sm text-muted">
            <span className="text-red-700" aria-hidden="true">* </span>
            {t.requiredNote}
          </p>
          <ContactForm lang={lang} t={t} />
        </section>
      </div>

      {contact.map_url && (
        <section aria-labelledby="contact-map-title" className={`${container} pb-14 sm:pb-16`}>
          <SectionTitle id="contact-map-title" title={t.mapTitle} align="start" className="mb-6" />
          <iframe
            src={contact.map_url}
            title={fmt(t.mapFrame, { org: texts.orgName.text })}
            loading="lazy"
            className="h-96 w-full rounded-[var(--radius-card)] border border-line"
          />
        </section>
      )}
    </main>
  );
}
