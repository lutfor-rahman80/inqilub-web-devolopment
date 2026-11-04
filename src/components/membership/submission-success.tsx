"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { CircleCheck, FilePlus2, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime, num } from "@/lib/format";
import { fmt, type Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import type { MembershipMessages } from "@/i18n/messages/membership";
import { CopyButton } from "./copy-button";
import { V2, scriptLang, v2Button } from "./styles";

// Printing the confirmation: hide the site header/footer and on-screen controls.
const PRINT_CSS = `@media print {
  body > header, body > footer, body > a, header, footer, [data-print-hide] { display: none !important; }
  body { background: #fff !important; }
  main { padding: 0 !important; }
}`;

export function SubmissionSuccess({
  lang,
  t,
  copyLabels,
  orgName,
  applicationNo,
  fullName,
  submittedAt,
  alreadySubmitted,
  emailGiven,
  emailEnabled,
  onNewApplication,
}: {
  lang: Locale;
  t: MembershipMessages["success"];
  copyLabels: MembershipMessages["copy"];
  orgName: string;
  applicationNo: string;
  fullName: string;
  submittedAt: string;
  alreadySubmitted: boolean;
  emailGiven: boolean;
  emailEnabled: boolean;
  onNewApplication: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    // scroll-margin keeps the card clear of the sticky site header.
    topRef.current?.scrollIntoView({ block: "start" });
  }, []);

  const statusHref = `${localePath(lang, "/membership/status")}?no=${encodeURIComponent(applicationNo)}`;
  const steps = [...t.nextSteps, ...(emailGiven && emailEnabled ? [t.emailStep] : [])];

  return (
    <div ref={topRef} data-testid="application-success" className="mx-auto max-w-2xl scroll-mt-24">
      <style>{PRINT_CSS}</style>
      <div className="rounded-[var(--radius-card)] border border-sage-200 bg-white p-5 shadow-[var(--shadow-card)] sm:p-8 print:border-0 print:shadow-none">
        <p className="hidden font-serif text-xl font-bold text-forest-800 print:block">{fmt(t.printTitle, { org: orgName })}</p>
        <div className="text-center">
          <CircleCheck className="mx-auto size-14 text-forest-600" aria-hidden="true" />
          <h2 ref={headingRef} tabIndex={-1} className="mt-3 text-2xl font-bold text-forest-800 focus:outline-none sm:text-3xl">
            {t.title}
          </h2>
          <p className="mt-2 text-lg text-ink/90">
            {t.thanksBefore}
            <strong lang={scriptLang(lang, fullName)}>{fullName}</strong>
            {t.thanksAfter}
          </p>
          {alreadySubmitted && (
            <p className="mt-3 rounded-xl bg-sky-50 px-4 py-2 text-sky-900" role="status">
              {t.already}
            </p>
          )}
        </div>

        <div className="mt-6 rounded-2xl border-2 border-dashed border-gold-400 bg-cream px-4 py-5 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-gold-700">{t.trackingLabel}</p>
          <p
            dir="ltr"
            data-testid="tracking-number"
            className="mt-1 break-all text-3xl font-bold tabular-nums tracking-wider text-forest-800 sm:text-4xl"
          >
            {applicationNo}
          </p>
          <p className="mt-2 text-sm text-muted">{fmt(t.submittedAt, { time: formatDateTime(submittedAt, lang) })}</p>
          <div className="mt-4 flex justify-center" data-print-hide>
            <CopyButton text={applicationNo} label={t.copy} labels={copyLabels} />
          </div>
        </div>

        <p className="mt-4 rounded-xl bg-sage-50 px-4 py-3 text-ink">
          <strong>{t.keepStrong}</strong>
          {t.keepRest}
        </p>

        <h3 className="mt-6 text-xl font-bold text-forest-800">{t.nextTitle}</h3>
        <ol className="mt-3 space-y-2">
          {steps.map((text, i) => (
            <li key={i} className="flex gap-3">
              <span aria-hidden="true" className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-sage-100 font-semibold text-forest-800">
                {num(lang, i + 1)}
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap" data-print-hide>
          <Link href={statusHref} className={v2Button("primary", "lg")}>
            <Search className="size-5" aria-hidden="true" />
            {t.statusCta}
          </Link>
          <Button variant="outline" size="lg" className={V2.outline} onClick={() => window.print()}>
            <Printer className="size-5" aria-hidden="true" />
            {t.print}
          </Button>
          <Button variant="ghost" size="lg" className={V2.ghost} onClick={onNewApplication}>
            <FilePlus2 className="size-5" aria-hidden="true" />
            {t.another}
          </Button>
        </div>
      </div>
    </div>
  );
}
