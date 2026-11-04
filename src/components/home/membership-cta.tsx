import Link from "next/link";
import { ArrowRight, BadgeCheck, ClipboardCheck, FilePen, Search } from "lucide-react";
import { fmt, type Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { home } from "@/i18n/messages/home";
import { num } from "@/lib/format";
import { container } from "@/components/ui/card";
import { HomeHeading } from "./section-heading";
import { outlineButton, primaryButton } from "./styles";

/** সদস্য হোন: form → review → approval, the tracking number, and links to apply / check status. */
export function MembershipCta({ lang, isOpen, emailUpdates }: { lang: Locale; isOpen: boolean; emailUpdates: boolean }) {
  const t = home[lang].membership;
  const steps = [
    { key: "form", ...t.steps.form, icon: FilePen },
    { key: "review", ...t.steps.review, icon: ClipboardCheck },
    { key: "approval", ...t.steps.approval, icon: BadgeCheck },
  ];
  return (
    <section aria-labelledby="membership-title" data-home-section="membership" className="border-y border-gold-100 bg-gold-50 py-16 sm:py-20">
      <div className={container}>
        <HomeHeading id="membership-title" eyebrow={t.eyebrow} title={t.title} intro={t.intro} />
        {!isOpen && (
          <p className="mx-auto -mt-4 mb-8 max-w-2xl rounded-xl border border-gold-400/50 bg-white px-4 py-3 text-center" role="note">
            {t.closed}
          </p>
        )}
        <ol className="grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.key} className="reveal relative rounded-[var(--radius-card)] border border-gold-100 bg-white p-6 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-forest-600 font-serif text-xl font-bold text-white" aria-hidden="true">
                  {num(lang, i + 1)}
                </span>
                <h3 className="text-xl font-bold text-forest-800">
                  <span className="sr-only">{fmt(t.stepLabel, { n: num(lang, i + 1) })} </span>
                  {s.title}
                </h3>
                <s.icon className="ms-auto size-6 shrink-0 text-gold-600" aria-hidden="true" />
              </div>
              <p className="mt-3 text-ink">{s.text}</p>
            </li>
          ))}
        </ol>
        <p className="mx-auto mt-8 max-w-3xl text-center text-ink" data-testid="membership-tracking">
          {t.trackingBefore}
          <strong>{t.trackingNumber}</strong>
          {t.trackingAfter}
          {emailUpdates && ` ${t.emailNote}`}
        </p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          {isOpen && (
            <Link href={localePath(lang, "/membership")} className={primaryButton("lg")}>
              {t.apply}
              <ArrowRight className="size-5 rtl:rotate-180" aria-hidden="true" />
            </Link>
          )}
          <Link href={localePath(lang, "/membership/status")} className={outlineButton("lg")}>
            <Search className="size-5" aria-hidden="true" />
            {t.status}
          </Link>
        </div>
      </div>
    </section>
  );
}
