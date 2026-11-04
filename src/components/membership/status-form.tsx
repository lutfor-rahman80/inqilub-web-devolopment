"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { BadgeCheck, CircleX, Clock3, LoaderCircle, Search, SearchCheck, SearchX } from "lucide-react";
import { Alert, Input } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APPLICATION_STATUS, formatDate } from "@/lib/format";
import type { Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import type { StatusFormMessages } from "@/i18n/messages/membership";
import { lookupStatus, type ApplicationStatusView, type StatusLookupState } from "@/app/[lang]/(site)/membership/status/actions";
import { CopyButton } from "./copy-button";
import { FormField } from "./form-field";
import { V2, scriptLang } from "./styles";

/** Tracking number + mobile → application status (works without JavaScript too). */
export function StatusForm({ lang, t, initialNo }: { lang: Locale; t: StatusFormMessages; initialNo: string }) {
  const [state, formAction, pending] = useActionState<StatusLookupState, FormData>(lookupStatus, null);
  const resultRef = useRef<HTMLDivElement>(null);
  const fieldErrors = state && !state.ok ? state.fieldErrors ?? {} : {};
  const f = t.statusForm;

  useEffect(() => {
    if (state) resultRef.current?.focus();
  }, [state]);

  const noValue = state?.values.application_no ?? initialNo;
  const mobileValue = state?.values.mobile ?? "";

  return (
    <div className="space-y-6">
      <form action={formAction} noValidate aria-busy={pending} className="space-y-5" data-testid="status-form">
        <input type="hidden" name="lang" value={lang} />
        <FormField
          id="application_no"
          label={f.tracking}
          required
          error={fieldErrors.application_no}
          hint={
            <>
              {f.trackingHint} <span dir="ltr" className="whitespace-nowrap">IJS-A-2026-0001</span>
            </>
          }
        >
          <Input
            id="application_no"
            name="application_no"
            // Remount with the server's value after each lookup (keeps what was typed).
            key={`no-${noValue}`}
            defaultValue={noValue}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            required
            maxLength={40}
            dir="ltr"
            placeholder="IJS-A-2026-0001"
            className="text-start uppercase tracking-wide"
            aria-invalid={fieldErrors.application_no ? true : undefined}
            aria-describedby={fieldErrors.application_no ? "application_no-error" : "application_no-hint"}
          />
        </FormField>
        <FormField id="mobile" label={f.mobile} required error={fieldErrors.mobile} hint={f.mobileHint}>
          <Input
            id="mobile"
            name="mobile"
            key={`m-${mobileValue}`}
            defaultValue={mobileValue}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder={f.mobilePlaceholder}
            required
            maxLength={20}
            aria-invalid={fieldErrors.mobile ? true : undefined}
            aria-describedby={fieldErrors.mobile ? "mobile-error" : "mobile-hint"}
          />
        </FormField>
        <Button type="submit" size="lg" className={`w-full sm:w-auto ${V2.primary}`} disabled={pending}>
          {pending ? (
            <>
              <LoaderCircle className="size-5 motion-safe:animate-spin" aria-hidden="true" />
              {f.searching}
            </>
          ) : (
            <>
              <Search className="size-5" aria-hidden="true" />
              {f.submit}
            </>
          )}
        </Button>
      </form>

      <div ref={resultRef} tabIndex={-1} aria-live="polite" className="focus:outline-none">
        {state && !state.ok && !state.fieldErrors && (
          state.notFound ? (
            <div className="rounded-[var(--radius-card)] border border-amber-200 bg-amber-50 p-5" role="alert" data-testid="status-not-found">
              <p className="flex items-center gap-2 text-lg font-bold text-amber-900">
                <SearchX className="size-6" aria-hidden="true" />
                {f.notFoundTitle}
              </p>
              <p className="mt-1 text-amber-900">{state.error}</p>
            </div>
          ) : (
            <Alert>{state.error}</Alert>
          )
        )}
        {state && !state.ok && state.fieldErrors && <Alert>{state.error}</Alert>}
        {state?.ok && <StatusResult lang={lang} t={t} r={state.result} />}
      </div>
    </div>
  );
}

function StatusResult({ lang, t, r }: { lang: Locale; t: StatusFormMessages; r: ApplicationStatusView }) {
  const f = t.statusForm;
  const tone = APPLICATION_STATUS[r.status].tone;
  const label = t.statusLabels[r.status];
  const Icon = r.status === "approved" ? BadgeCheck : r.status === "rejected" ? CircleX : r.status === "under_review" ? SearchCheck : Clock3;
  const iconTone =
    r.status === "approved"
      ? "bg-sage-100 text-forest-800"
      : r.status === "rejected"
        ? "bg-red-50 text-red-700"
        : r.status === "under_review"
          ? "bg-sky-50 text-sky-800"
          : "bg-amber-50 text-amber-800";

  return (
    <section
      aria-labelledby="status-result-title"
      className="rounded-[var(--radius-card)] border border-line bg-white p-5 shadow-[var(--shadow-card)] sm:p-7"
      data-testid="status-result"
      data-status={r.status}
    >
      <div className="flex items-start gap-4">
        <span className={`inline-flex size-12 shrink-0 items-center justify-center rounded-full ${iconTone}`}>
          <Icon className="size-7" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="status-result-title" className="text-xl font-bold text-forest-800 wrap-anywhere sm:text-2xl" lang={scriptLang(lang, r.fullName)}>
            {r.fullName}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-muted">{f.statusLabel}</span>
            <Badge tone={tone}>{label}</Badge>
          </p>
        </div>
      </div>

      <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted">{f.tracking}</dt>
          <dd dir="ltr" className="text-start font-semibold tabular-nums text-ink">{r.applicationNo}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{f.submittedOn}</dt>
          <dd className="font-semibold text-ink">{formatDate(r.submittedAt, lang)}</dd>
        </div>
        {(r.status === "approved" || r.status === "rejected") && r.reviewedAt && (
          <div>
            <dt className="text-sm text-muted">{f.decidedOn}</dt>
            <dd className="font-semibold text-ink">{formatDate(r.reviewedAt, lang)}</dd>
          </div>
        )}
        {r.status === "under_review" && r.reviewedAt && (
          <div>
            <dt className="text-sm text-muted">{f.reviewStartedOn}</dt>
            <dd className="font-semibold text-ink">{formatDate(r.reviewedAt, lang)}</dd>
          </div>
        )}
        {r.status === "approved" && r.memberNo && (
          <div className="sm:col-span-2">
            <dt className="text-sm text-muted">{f.memberNo}</dt>
            <dd className="mt-1 flex flex-wrap items-center gap-3">
              <span dir="ltr" data-testid="member-number" className="text-2xl font-bold tabular-nums tracking-wide text-forest-800">
                {r.memberNo}
              </span>
              <CopyButton text={r.memberNo} labels={t.copy} />
            </dd>
          </div>
        )}
      </dl>

      <p className="mt-5 rounded-xl bg-sage-50 px-4 py-3 text-ink/90">
        {r.status === "pending" && f.pending}
        {r.status === "under_review" && f.underReview}
        {r.status === "approved" && f.approved}
        {r.status === "rejected" && (
          <>
            {f.rejectedBefore}
            <Link href={localePath(lang, "/contact")} className={V2.link}>{f.rejectedLink}</Link>
            {f.rejectedAfter}
          </>
        )}
      </p>
    </section>
  );
}
