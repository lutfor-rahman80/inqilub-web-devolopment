"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronDown, Info, LoaderCircle, Pencil, RotateCcw, Send, Trash2 } from "lucide-react";
import { Alert, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { BLOOD_GROUPS, RELIGIONS, formatDate, num } from "@/lib/format";
import { fmt, type Locale } from "@/i18n/config";
import { localePath, stripLocale } from "@/i18n/paths";
import type { ApplicationFormMessages } from "@/i18n/messages/membership";
import { ageOn, todayInDhaka } from "@/lib/membership/normalize";
import {
  APPLICATION_LIMITS,
  APPLICATION_STEPS,
  MIN_DOB,
  OTHER_RELIGION,
  UNKNOWN_BLOOD_GROUP,
  carryOverValues,
  declarationParts,
  emptyApplication,
  firstErrorField,
  firstErrorStep,
  hasApplicationValues,
  parseApplication,
  prepareApplication,
  readApplicationValues,
  stepErrors,
  type ApplicationField,
  type ApplicationValues,
  type FieldErrors,
} from "@/lib/membership/schema";
import { DIRECTORY_ADULT_AGE } from "@/lib/membership/display";
import { uuidV4 } from "@/lib/membership/uuid";
import { MIN_FILL_MS, START_TOKEN_MAX_AGE_MS, type StartToken } from "@/lib/membership/timing";
import { beginApplication, submitApplication, type SubmittedApplication } from "@/app/[lang]/(site)/membership/actions";
import { CheckboxField } from "./checkbox-field";
import { FormField } from "./form-field";
import { StepIndicator } from "./step-indicator";
import { SubmissionSuccess } from "./submission-success";
import { V2, scriptLang } from "./styles";

const LEGACY_DRAFT_KEY = "ijs-membership-draft-v1";
/** One draft per browser tab, independent of the language the form is shown in. */
const DRAFT_KEY = "ijs-membership-draft-v2";
const RESULT_KEY = "ijs-membership-result-v1";
/** Set just before the visitor follows the BN | EN switch from the form (see below). */
const SWITCH_KEY = "ijs-membership-lang-switch-v1";
/** An unfinished form is only brought back after a reload within this time. */
const DRAFT_TTL_MS = 30 * 60 * 1000;
/** The language-switch hand-over must be used by the very next page load. */
const SWITCH_TTL_MS = 60 * 1000;
/** The confirmation (tracking number) survives reloads in this tab for this long. */
const RESULT_TTL_MS = 2 * 60 * 60 * 1000;
const LAST_STEP = APPLICATION_STEPS.length - 1;

type Start = { token: StartToken; receivedAt: number };
type Draft = {
  values: ApplicationValues;
  step: number;
  maxStep: number;
  token: string | null;
  start: Start | null;
  savedAt: number;
};
type StoredResult = SubmittedApplication & { emailGiven: boolean; storedAt: number };

/** The pledge as shown: the English reference translation on English pages when there is one. */
export type DeclarationTexts = {
  paragraphs: string[];
  /** Language of `paragraphs`. */
  lang: Locale;
  /** The official Bengali text when `paragraphs` is a translation. */
  original: string[] | null;
};

/** The form's first mount in this page load (later mounts are client-side navigations back to it). */
let mountedInThisDocument = false;

function storageGet(key: string): unknown {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storageSet(key: string, value: unknown | null) {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable (private mode / quota) — the form still works without it
  }
}

function readStart(raw: unknown): Start | null {
  const s = raw as Partial<Start> | null;
  const t = s?.token as Partial<StartToken> | undefined;
  if (!s || !t || typeof t.issuedAt !== "number" || typeof t.sig !== "string" || typeof s.receivedAt !== "number") return null;
  return { token: { issuedAt: t.issuedAt, sig: t.sig }, receivedAt: s.receivedAt };
}

function readDraft(lang: Locale): Draft | null {
  const d = storageGet(DRAFT_KEY) as Partial<Draft> | null;
  if (!d || typeof d !== "object") return null;
  const savedAt = Number(d.savedAt);
  if (!Number.isFinite(savedAt) || Date.now() - savedAt > DRAFT_TTL_MS || savedAt > Date.now() + 60_000) return null;
  const step = Number(d.step);
  const maxStep = Number(d.maxStep);
  return {
    values: carryOverValues({ ...emptyApplication(lang), ...readApplicationValues(d.values) }, lang),
    step: Number.isInteger(step) && step >= 0 && step <= LAST_STEP ? step : 0,
    maxStep: Number.isInteger(maxStep) && maxStep >= 0 && maxStep <= LAST_STEP ? maxStep : 0,
    token: typeof d.token === "string" ? d.token : null,
    start: readStart(d.start),
    savedAt,
  };
}

function readResult(): StoredResult | null {
  const r = storageGet(RESULT_KEY) as Partial<StoredResult> | null;
  if (!r || typeof r.applicationNo !== "string" || typeof r.fullName !== "string" || typeof r.submittedAt !== "string") return null;
  const storedAt = Number(r.storedAt);
  if (!Number.isFinite(storedAt) || Date.now() - storedAt > RESULT_TTL_MS) return null;
  return {
    applicationNo: r.applicationNo,
    fullName: r.fullName,
    submittedAt: r.submittedAt,
    alreadySubmitted: r.alreadySubmitted === true,
    emailGiven: r.emailGiven === true,
    storedAt,
  };
}

/**
 * True only when this page itself was reloaded. An unfinished form is restored
 * in that case (and after the language switch, below) only — not when someone
 * opens the form again later in the same tab, and not when someone presses
 * Back after the applicant left the site (shared or public computers). Leaving
 * the form inside the site clears the draft (see the unmount cleanup), so Back
 * there shows an empty form too.
 */
function pageWasReloaded(): boolean {
  try {
    const entry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (!entry || entry.type !== "reload") return false;
    return new URL(entry.name).pathname === window.location.pathname;
  } catch {
    return false;
  }
}

/**
 * True when this page was opened through the BN | EN switch on the same form
 * a moment ago (the hand-over note is written by the click handler below and
 * removed here, whatever the answer). The draft itself is the same one a
 * reload would restore: same tab, same 30-minute limit, same clearing rules.
 */
function cameFromLanguageSwitch(): boolean {
  const note = storageGet(SWITCH_KEY) as { path?: unknown; at?: unknown } | null;
  storageSet(SWITCH_KEY, null);
  if (!note || typeof note.path !== "string" || typeof note.at !== "number") return false;
  const age = Date.now() - note.at;
  return age >= 0 && age < SWITCH_TTL_MS && note.path === window.location.pathname;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** DOM id that receives focus for a field with an error. */
function focusTarget(field: ApplicationField): string {
  if (field === "id_type") return "id_type-nid";
  return field;
}

export function ApplicationForm({
  lang,
  t,
  declaration,
  emailEnabled,
  orgName,
}: {
  lang: Locale;
  t: ApplicationFormMessages;
  declaration: DeclarationTexts;
  emailEnabled: boolean;
  orgName: string;
}) {
  const f = t.form;
  const [values, setValues] = useState<ApplicationValues>(() => emptyApplication(lang));
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [restored, setRestored] = useState<"reload" | "language" | null>(null);
  const [result, setResult] = useState<StoredResult | null>(null);
  const [hp, setHp] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [pending, startTransition] = useTransition();

  /** Submission token: idempotency key for this application (kept across reloads and language switches). */
  const tokenRef = useRef<string | null>(null);
  /** Server-signed "form opened" token for tokenRef. */
  const startRef = useRef<Start | null>(null);
  const startRequest = useRef<Promise<Start> | null>(null);
  const latest = useRef({ values, step, maxStep });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const clearConfirmRef = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<string | null>(null);

  useLayoutEffect(() => {
    latest.current = { values, step, maxStep };
  });

  function persistDraft() {
    const { values: v, step: st, maxStep: ms } = latest.current;
    if (!hasApplicationValues(v)) return;
    storageSet(DRAFT_KEY, { values: v, step: st, maxStep: ms, token: tokenRef.current, start: startRef.current, savedAt: Date.now() } satisfies Draft);
  }

  // On mount: show a confirmation from this tab session, or restore an
  // unfinished form after a reload or a language switch. Leaving the form clears the draft.
  useEffect(() => {
    storageSet(LEGACY_DRAFT_KEY, null); // older versions kept drafts indefinitely
    const first = !mountedInThisDocument;
    mountedInThisDocument = true;
    const switched = cameFromLanguageSwitch(); // always consumes the hand-over note
    const stored = readResult();
    if (stored) {
      storageSet(DRAFT_KEY, null);
      queueMicrotask(() => setResult(stored));
    } else if (first) {
      const reason = pageWasReloaded() ? "reload" : switched ? "language" : null;
      const draft = reason ? readDraft(lang) : null;
      if (draft && reason && hasApplicationValues(draft.values)) {
        tokenRef.current = draft.token;
        startRef.current = draft.token ? draft.start : null;
        // Deferred so the restore is a separate render after hydration.
        queueMicrotask(() => {
          setValues(draft.values);
          setStep(draft.step);
          setMaxStep(Math.max(draft.step, draft.maxStep));
          setRestored(reason);
        });
      } else {
        storageSet(DRAFT_KEY, null);
      }
    }
    return () => storageSet(DRAFT_KEY, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per mount; lang is fixed for the page
  }, []);

  // The BN | EN switch is a plain link to the same page in the other language
  // (a full page load). Just before the browser follows it from this form,
  // save the draft and leave a short-lived hand-over note for that page.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // new tab/window: no hand-over
      const link = (e.target as Element | null)?.closest?.("a[hreflang]");
      if (!(link instanceof HTMLAnchorElement)) return;
      let target: URL;
      try {
        target = new URL(link.href, window.location.href);
      } catch {
        return;
      }
      const here = window.location.pathname;
      if (target.origin !== window.location.origin || target.pathname === here) return;
      if (stripLocale(target.pathname) !== stripLocale(here)) return;
      persistDraft();
      if (hasApplicationValues(latest.current.values)) storageSet(SWITCH_KEY, { path: target.pathname, at: Date.now() });
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Keep the draft (and the submission token) for a reload in this tab.
  useEffect(() => {
    if (result) return;
    persistDraft();
  }, [values, step, maxStep, result]);

  function ensureToken(): string {
    if (!tokenRef.current) tokenRef.current = uuidV4();
    return tokenRef.current;
  }

  /** The signed start token for the current submission token (fetched once, then reused). */
  function ensureStart(): Promise<Start> {
    const current = startRef.current;
    if (current && Date.now() - current.receivedAt < START_TOKEN_MAX_AGE_MS - 15 * 60_000) return Promise.resolve(current);
    if (!startRequest.current) {
      const token = ensureToken();
      startRequest.current = beginApplication(token)
        .then((res) => {
          if (!res.ok) throw new Error("start token refused");
          const s: Start = { token: res.start, receivedAt: Date.now() };
          if (tokenRef.current === token) {
            startRef.current = s;
            persistDraft();
          }
          return s;
        })
        .finally(() => {
          startRequest.current = null;
        });
    }
    return startRequest.current;
  }

  // Ask for the start token as soon as the visitor begins filling in the form.
  const started = hasApplicationValues(values);
  useEffect(() => {
    if (started && !result && !startRef.current) ensureStart().catch(() => undefined); // retried on submit
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ensureStart only reads refs
  }, [started, result]);

  // Move focus after step changes / validation (runs after the DOM is updated).
  useLayoutEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    const el =
      id === "@heading"
        ? headingRef.current
        : id === "@alert"
          ? alertRef.current
          : id === "@clear"
            ? clearConfirmRef.current
            : document.getElementById(id);
    if (!el) return;
    el.focus({ preventScroll: true });
    // A new step starts at the progress indicator (scroll-margin keeps it clear of the sticky site header).
    if (id === "@heading") topRef.current?.scrollIntoView({ block: "start" });
    else el.scrollIntoView({ block: "center" });
  });

  const today = todayInDhaka();
  const prepared = prepareApplication(values);
  const m = t.validation;

  function update<K extends keyof ApplicationValues>(key: K, value: ApplicationValues[K]) {
    // "Same as permanent" does not erase a present address already typed:
    // it is simply not used while the box is ticked.
    const next = { ...values, [key]: value };
    setValues(next);
    // Re-check only the errors already on screen, so messages disappear as soon as they are fixed.
    if (Object.keys(errors).length > 0) {
      const fresh = parseApplication(next, m, today);
      const nextErrors: FieldErrors = {};
      for (const k of Object.keys(errors) as ApplicationField[]) {
        if (!fresh.ok && fresh.fieldErrors[k]) nextErrors[k] = fresh.fieldErrors[k];
      }
      setErrors(nextErrors);
    }
  }

  function showErrors(errs: FieldErrors) {
    setErrors(errs);
    const field = firstErrorField(errs);
    const target = firstErrorStep(errs);
    if (target >= 0 && target !== step) setStep(target);
    pendingFocus.current = field ? focusTarget(field) : "@alert";
  }

  function goTo(target: number) {
    if (target === step || pending) return;
    if (target > step) {
      for (let s = step; s < target; s++) {
        const errs = stepErrors(values, s, m, today);
        if (Object.keys(errs).length > 0) {
          if (s !== step) setStep(s);
          showErrors(errs);
          return;
        }
      }
    }
    setErrors({});
    setFormError(null);
    setRestored(null);
    setStep(target);
    setMaxStep((ms) => Math.max(ms, target));
    pendingFocus.current = "@heading";
  }

  function next() {
    const errs = stepErrors(values, step, m, today);
    if (Object.keys(errs).length > 0) {
      showErrors(errs);
      return;
    }
    goTo(step + 1);
  }

  function submit() {
    if (pending) return;
    const check = parseApplication(values, m, today);
    if (!check.ok) {
      setFormError(f.formError);
      showErrors(check.fieldErrors);
      return;
    }
    const token = ensureToken();
    persistDraft();
    const emailGiven = Boolean(prepared.email);
    setFormError(null);
    setConfirmClear(false);

    // A person never needs to see a "too fast" error: if the form was opened
    // only seconds ago, wait out the server's minimum before sending.
    const send = async () => {
      const start = await ensureStart();
      const wait = start.receivedAt + MIN_FILL_MS + 300 - Date.now();
      if (wait > 0) await sleep(wait);
      return submitApplication({ values, token, hp, start: start.token, lang });
    };

    startTransition(async () => {
      try {
        let res = await send();
        if (!res.ok && res.code === "start") {
          // Expired (or missing) start token: get a fresh one and try once more.
          startRef.current = null;
          res = await send();
        }
        if (res.ok) {
          const stored: StoredResult = { ...res.data, emailGiven, storedAt: Date.now() };
          storageSet(DRAFT_KEY, null);
          storageSet(RESULT_KEY, stored);
          setResult(stored);
          return;
        }
        setFormError(res.error);
        if (res.fieldErrors && Object.keys(res.fieldErrors).length > 0) showErrors(res.fieldErrors);
        else pendingFocus.current = "@alert";
        // Re-render so the focus effect runs even when nothing else changed.
        setErrors((e) => ({ ...e }));
      } catch {
        setFormError(f.networkError);
        pendingFocus.current = "@alert";
        setErrors((e) => ({ ...e }));
      }
    });
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step < LAST_STEP) next();
    else submit();
  }

  /** Clears everything (form, draft, confirmation) and starts a fresh application. */
  function startOver() {
    storageSet(DRAFT_KEY, null);
    storageSet(RESULT_KEY, null);
    tokenRef.current = null;
    startRef.current = null;
    startRequest.current = null;
    setValues(emptyApplication(lang));
    setErrors({});
    setFormError(null);
    setRestored(null);
    setConfirmClear(false);
    setResult(null);
    setStep(0);
    setMaxStep(0);
    pendingFocus.current = "@heading";
  }

  if (result) {
    return (
      <SubmissionSuccess
        lang={lang}
        t={t.success}
        copyLabels={t.copy}
        orgName={orgName}
        applicationNo={result.applicationNo}
        fullName={result.fullName}
        submittedAt={result.submittedAt}
        alreadySubmitted={result.alreadySubmitted}
        emailGiven={result.emailGiven}
        emailEnabled={emailEnabled}
        onNewApplication={startOver}
      />
    );
  }

  const fl = f.fields;
  const err = (k: ApplicationField) => errors[k];
  const describedBy = (k: ApplicationField, hint = false) => (errors[k] ? `${k}-error` : hint ? `${k}-hint` : undefined);
  const invalid = (k: ApplicationField) => (errors[k] ? true : undefined);
  const errorCount = Object.keys(errors).length;
  const optional = t.form.review.optional;
  const idNumberLabel = values.id_type === "nid" ? fl.id_number_nid : values.id_type === "birth_reg" ? fl.id_number_birth_reg : fl.id_number;

  return (
    <div ref={topRef} className="scroll-mt-24 space-y-6">
      <StepIndicator lang={lang} t={f} step={step} maxStep={maxStep} disabled={pending} onJump={goTo} />

      <form onSubmit={onSubmit} noValidate aria-busy={pending} className="space-y-6" data-testid="application-form" data-step={step}>
        <div ref={alertRef} tabIndex={-1} className="space-y-3 focus:outline-none">
          {formError && <Alert>{formError}</Alert>}
          {!formError && errorCount > 0 && (
            <Alert>
              {errorCount === 1 ? f.errorsOne : fmt(f.errorsMany, { count: num(lang, errorCount) })} {f.errorsFix}
            </Alert>
          )}
          {restored && !formError && errorCount === 0 && (
            <Alert tone="info">
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1" data-testid="draft-restored" data-reason={restored}>
                <span>{restored === "language" ? f.restoredLanguage : f.restoredReload}</span>
                <button type="button" onClick={startOver} className="inline-flex min-h-11 items-center gap-1 font-semibold underline underline-offset-4">
                  <RotateCcw className="size-4" aria-hidden="true" />
                  {f.startOver}
                </button>
              </span>
            </Alert>
          )}
        </div>

        {/* Honeypot: invisible to people and assistive technology. */}
        <div aria-hidden="true" className="absolute -left-[9999px] top-auto size-px overflow-hidden">
          <label htmlFor="hp_extra_info">{f.honeypot}</label>
          <input id="hp_extra_info" name="hp_extra_info" type="text" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
        </div>

        <section aria-labelledby="step-heading" className="rounded-[var(--radius-card)] border border-line bg-white p-5 shadow-[var(--shadow-card)] sm:p-8">
          <p className="text-sm font-semibold text-gold-800">
            {fmt(f.stepOf, { n: num(lang, step + 1), total: num(lang, APPLICATION_STEPS.length) })}
          </p>
          <h2 id="step-heading" ref={headingRef} tabIndex={-1} className="mb-1 text-2xl font-bold text-forest-800 focus:outline-none sm:text-3xl">
            {f.steps[step]}
          </h2>
          <p className="mb-6 text-muted">
            {step < LAST_STEP ? (
              <>
                <span className="text-red-700" aria-hidden="true">*</span> {f.requiredNote}
              </>
            ) : (
              f.reviewNote
            )}
          </p>

          {step === 0 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FormField id="full_name" label={fl.full_name} required error={err("full_name")} hint={fl.full_name_hint}>
                  <Input
                    id="full_name"
                    name="full_name"
                    autoComplete="name"
                    required
                    maxLength={APPLICATION_LIMITS.name.max}
                    value={values.full_name}
                    onChange={(e) => update("full_name", e.target.value)}
                    aria-invalid={invalid("full_name")}
                    aria-describedby={describedBy("full_name", true)}
                  />
                </FormField>
              </div>
              <FormField id="father_name" label={fl.father_name} required error={err("father_name")}>
                <Input
                  id="father_name"
                  name="father_name"
                  autoComplete="off"
                  required
                  maxLength={APPLICATION_LIMITS.name.max}
                  value={values.father_name}
                  onChange={(e) => update("father_name", e.target.value)}
                  aria-invalid={invalid("father_name")}
                  aria-describedby={describedBy("father_name")}
                />
              </FormField>
              <FormField id="mother_name" label={fl.mother_name} required error={err("mother_name")}>
                <Input
                  id="mother_name"
                  name="mother_name"
                  autoComplete="off"
                  required
                  maxLength={APPLICATION_LIMITS.name.max}
                  value={values.mother_name}
                  onChange={(e) => update("mother_name", e.target.value)}
                  aria-invalid={invalid("mother_name")}
                  aria-describedby={describedBy("mother_name")}
                />
              </FormField>
              <FormField id="date_of_birth" label={fl.date_of_birth} required error={err("date_of_birth")} hint={fl.date_of_birth_hint}>
                <Input
                  id="date_of_birth"
                  name="date_of_birth"
                  type="date"
                  autoComplete="bday"
                  required
                  min={MIN_DOB}
                  max={today}
                  value={values.date_of_birth}
                  onChange={(e) => update("date_of_birth", e.target.value)}
                  aria-invalid={invalid("date_of_birth")}
                  aria-describedby={describedBy("date_of_birth", true)}
                />
              </FormField>
              <FormField id="nationality" label={fl.nationality} required error={err("nationality")}>
                <Input
                  id="nationality"
                  name="nationality"
                  autoComplete="off"
                  required
                  maxLength={APPLICATION_LIMITS.nationality.max}
                  value={values.nationality}
                  onChange={(e) => update("nationality", e.target.value)}
                  aria-invalid={invalid("nationality")}
                  aria-describedby={describedBy("nationality")}
                />
              </FormField>
              <div className="space-y-5">
                <FormField id="religion" label={fl.religion} required error={err("religion")}>
                  <Select
                    id="religion"
                    name="religion"
                    required
                    value={values.religion}
                    onChange={(e) => update("religion", e.target.value)}
                    aria-invalid={invalid("religion")}
                    aria-describedby={describedBy("religion")}
                  >
                    <option value="">{f.choose}</option>
                    {RELIGIONS.map((r, i) => (
                      <option key={r} value={r}>{f.religions[i] ?? r}</option>
                    ))}
                  </Select>
                </FormField>
                {values.religion === OTHER_RELIGION && (
                  <FormField id="religion_other" label={fl.religion_other} required error={err("religion_other")}>
                    <Input
                      id="religion_other"
                      name="religion_other"
                      autoComplete="off"
                      required
                      maxLength={APPLICATION_LIMITS.religion.max}
                      value={values.religion_other}
                      onChange={(e) => update("religion_other", e.target.value)}
                      aria-invalid={invalid("religion_other")}
                      aria-describedby={describedBy("religion_other")}
                    />
                  </FormField>
                )}
              </div>
              <FormField id="occupation" label={fl.occupation} required error={err("occupation")} hint={fl.occupation_hint}>
                <Input
                  id="occupation"
                  name="occupation"
                  list="occupation-suggestions"
                  autoComplete="organization-title"
                  required
                  maxLength={APPLICATION_LIMITS.occupation.max}
                  value={values.occupation}
                  onChange={(e) => update("occupation", e.target.value)}
                  aria-invalid={invalid("occupation")}
                  aria-describedby={describedBy("occupation", true)}
                />
                <datalist id="occupation-suggestions">
                  {f.occupationSuggestions.map((o) => (
                    <option key={o} value={o} />
                  ))}
                </datalist>
              </FormField>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <FormField id="permanent_address" label={fl.permanent_address} required error={err("permanent_address")} hint={fl.permanent_address_hint}>
                <Textarea
                  id="permanent_address"
                  name="permanent_address"
                  rows={3}
                  autoComplete="off"
                  required
                  maxLength={APPLICATION_LIMITS.address.max}
                  value={values.permanent_address}
                  onChange={(e) => update("permanent_address", e.target.value)}
                  aria-invalid={invalid("permanent_address")}
                  aria-describedby={describedBy("permanent_address", true)}
                />
              </FormField>
              <CheckboxField
                id="same_address"
                checked={values.same_address}
                onChange={(v) => update("same_address", v)}
                label={fl.same_address}
                tone="boxed"
              />
              {values.same_address ? (
                <p className="rounded-xl bg-cream px-4 py-3 text-muted" data-testid="present-same-note">
                  {fl.same_address_note}
                </p>
              ) : (
                <FormField id="present_address" label={fl.present_address} required error={err("present_address")} hint={fl.present_address_hint}>
                  <Textarea
                    id="present_address"
                    name="present_address"
                    rows={3}
                    autoComplete="off"
                    required
                    maxLength={APPLICATION_LIMITS.address.max}
                    value={values.present_address}
                    onChange={(e) => update("present_address", e.target.value)}
                    aria-invalid={invalid("present_address")}
                    aria-describedby={describedBy("present_address", true)}
                  />
                </FormField>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <fieldset className="sm:col-span-2" aria-describedby={errors.id_type ? "id_type-error" : undefined}>
                <legend className="mb-1.5 font-medium text-ink">
                  {fl.id_type}
                  <span className="ms-1 text-red-700" aria-hidden="true">*</span>
                </legend>
                <div className="grid gap-3 min-[420px]:grid-cols-2">
                  {(["nid", "birth_reg"] as const).map((type) => (
                    <label
                      key={type}
                      htmlFor={`id_type-${type}`}
                      className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2 transition-colors ${
                        values.id_type === type
                          ? "border-forest-600 bg-sage-50 ring-2 ring-forest-600/20"
                          : errors.id_type
                            ? "border-red-400 bg-white"
                            : "border-line bg-white hover:border-sage-300"
                      }`}
                    >
                      <input
                        id={`id_type-${type}`}
                        type="radio"
                        name="id_type"
                        value={type}
                        checked={values.id_type === type}
                        onChange={() => update("id_type", type)}
                        required
                        className="size-5 accent-forest-700"
                      />
                      <span className="font-medium">{type === "nid" ? fl.id_type_nid : fl.id_type_birth_reg}</span>
                    </label>
                  ))}
                </div>
                {errors.id_type && (
                  <p id="id_type-error" className="mt-1.5 text-sm font-medium text-red-700">{errors.id_type}</p>
                )}
              </fieldset>
              <div className="sm:col-span-2">
                <FormField
                  id="id_number"
                  label={idNumberLabel}
                  required
                  error={err("id_number")}
                  hint={
                    values.id_type === "birth_reg"
                      ? fl.id_number_hint_birth_reg
                      : values.id_type === "nid"
                        ? fl.id_number_hint_nid
                        : fl.id_number_hint_none
                  }
                >
                  <Input
                    id="id_number"
                    name="id_number"
                    inputMode="numeric"
                    autoComplete="off"
                    required
                    maxLength={30}
                    dir="ltr"
                    className="text-start"
                    value={values.id_number}
                    onChange={(e) => update("id_number", e.target.value)}
                    aria-invalid={invalid("id_number")}
                    aria-describedby={describedBy("id_number", true)}
                  />
                </FormField>
              </div>
              <FormField id="mobile" label={fl.mobile} required error={err("mobile")} hint={fl.mobile_hint}>
                <Input
                  id="mobile"
                  name="mobile"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder={fl.mobile_placeholder}
                  required
                  maxLength={20}
                  value={values.mobile}
                  onChange={(e) => update("mobile", e.target.value)}
                  aria-invalid={invalid("mobile")}
                  aria-describedby={describedBy("mobile", true)}
                />
              </FormField>
              <FormField
                id="email"
                label={fl.email}
                optionalLabel={optional}
                error={err("email")}
                hint={emailEnabled ? fl.email_hint_enabled : fl.email_hint_disabled}
              >
                <Input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  maxLength={APPLICATION_LIMITS.email.max}
                  dir="ltr"
                  className="text-start"
                  value={values.email}
                  onChange={(e) => update("email", e.target.value)}
                  aria-invalid={invalid("email")}
                  aria-describedby={describedBy("email", true)}
                />
              </FormField>
              <FormField id="blood_group" label={fl.blood_group} optionalLabel={optional} error={err("blood_group")}>
                <Select
                  id="blood_group"
                  name="blood_group"
                  value={values.blood_group}
                  onChange={(e) => update("blood_group", e.target.value)}
                  aria-invalid={invalid("blood_group")}
                  aria-describedby={describedBy("blood_group")}
                >
                  <option value="">{f.choose}</option>
                  {BLOOD_GROUPS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                  <option value={UNKNOWN_BLOOD_GROUP}>{fl.blood_group_unknown}</option>
                </Select>
              </FormField>
            </div>
          )}

          {step === 3 && (
            <ReviewStep
              lang={lang}
              t={t}
              values={values}
              prepared={prepared}
              today={today}
              declaration={declaration}
              errors={errors}
              onEdit={goTo}
              onChange={update}
            />
          )}
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          {step > 0 ? (
            <Button variant="outline" size="lg" className={V2.outline} onClick={() => goTo(step - 1)} disabled={pending}>
              <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
              {f.previous}
            </Button>
          ) : (
            <span className="hidden sm:block" />
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            {step < LAST_STEP && maxStep === LAST_STEP && (
              <Button variant="ghost" size="lg" className={V2.ghost} onClick={() => goTo(LAST_STEP)} disabled={pending}>
                {f.backToReview}
              </Button>
            )}
            {step < LAST_STEP ? (
              <Button type="submit" size="lg" className={V2.primary}>
                {f.next}
                <ArrowRight className="size-5 rtl:rotate-180" aria-hidden="true" />
              </Button>
            ) : (
              <Button type="submit" size="lg" className={V2.primary} disabled={pending} data-testid="submit-application">
                {pending ? (
                  <>
                    <LoaderCircle className="size-5 motion-safe:animate-spin" aria-hidden="true" />
                    {f.submitting}
                  </>
                ) : (
                  <>
                    <Send className="size-5" aria-hidden="true" />
                    {f.submit}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
        <p aria-live="polite" className="sr-only">{pending ? f.submittingSr : ""}</p>

        {started && (
          <div className="border-t border-line pt-4" data-testid="clear-form">
            {confirmClear ? (
              <div className="rounded-xl border border-red-200 bg-red-50/60 p-4" role="group" aria-labelledby="clear-form-question">
                <p id="clear-form-question" className="font-medium text-ink">
                  {f.clear.question}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button ref={clearConfirmRef} variant="danger" onClick={startOver} disabled={pending}>
                    <Trash2 className="size-5" aria-hidden="true" />
                    {f.clear.yes}
                  </Button>
                  <Button variant="ghost" className={V2.ghost} onClick={() => setConfirmClear(false)} disabled={pending}>
                    {f.clear.no}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
                <span>{f.clear.note}</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setConfirmClear(true);
                    pendingFocus.current = "@clear";
                  }}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg font-semibold text-red-700 underline-offset-4 hover:underline disabled:opacity-50"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  {f.clear.action}
                </button>
              </p>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

function ReviewStep({
  lang,
  t,
  values,
  prepared,
  today,
  declaration,
  errors,
  onEdit,
  onChange,
}: {
  lang: Locale;
  t: ApplicationFormMessages;
  values: ApplicationValues;
  prepared: ApplicationValues;
  today: string;
  declaration: DeclarationTexts;
  errors: FieldErrors;
  onEdit: (step: number) => void;
  onChange: <K extends keyof ApplicationValues>(key: K, value: ApplicationValues[K]) => void;
}) {
  const f = t.form;
  const fl = f.fields;
  const r = f.review;
  const age = ageOn(prepared.date_of_birth, today);
  const religionIndex = (RELIGIONS as readonly string[]).indexOf(prepared.religion);
  const religion =
    prepared.religion === OTHER_RELIGION
      ? prepared.religion_other
      : religionIndex >= 0
        ? (f.religions[religionIndex] ?? prepared.religion)
        : prepared.religion;
  const blood = values.blood_group === UNKNOWN_BLOOD_GROUP ? fl.blood_group_unknown : prepared.blood_group ? prepared.blood_group : null;
  const idType = prepared.id_type === "nid" ? fl.id_type_nid : prepared.id_type === "birth_reg" ? fl.id_type_birth_reg : prepared.id_type;
  const idNumberLabel = prepared.id_type === "nid" ? fl.id_number_nid : prepared.id_type === "birth_reg" ? fl.id_number_birth_reg : fl.id_number;
  const name = prepared.full_name || r.applicant;
  const translated = declaration.original !== null;
  const minor = age !== null && age < DIRECTORY_ADULT_AGE;

  return (
    <div className="space-y-6">
      <ReviewGroup title={f.steps[0]} editLabel={fmt(r.editLabel, { title: f.steps[0] })} edit={r.edit} onEdit={() => onEdit(0)}>
        <ReviewRow lang={lang} label={fl.full_name} value={prepared.full_name} />
        <ReviewRow lang={lang} label={fl.father_name} value={prepared.father_name} />
        <ReviewRow lang={lang} label={fl.mother_name} value={prepared.mother_name} />
        <ReviewRow
          lang={lang}
          label={fl.date_of_birth}
          value={
            prepared.date_of_birth
              ? `${formatDate(prepared.date_of_birth, lang)}${age !== null ? fmt(r.age, { age: num(lang, age) }) : ""}`
              : ""
          }
        />
        <ReviewRow lang={lang} label={fl.nationality} value={prepared.nationality} />
        <ReviewRow lang={lang} label={fl.religion} value={religion} />
        <ReviewRow lang={lang} label={fl.occupation} value={prepared.occupation} />
      </ReviewGroup>

      <ReviewGroup title={f.steps[1]} editLabel={fmt(r.editLabel, { title: f.steps[1] })} edit={r.edit} onEdit={() => onEdit(1)}>
        <ReviewRow lang={lang} label={fl.permanent_address} value={prepared.permanent_address} multiline />
        <ReviewRow
          lang={lang}
          label={fl.present_address}
          value={values.same_address ? r.sameAsPermanent : prepared.present_address}
          multiline
        />
      </ReviewGroup>

      <ReviewGroup title={f.steps[2]} editLabel={fmt(r.editLabel, { title: f.steps[2] })} edit={r.edit} onEdit={() => onEdit(2)}>
        <ReviewRow lang={lang} label={fl.id_type} value={idType} />
        <ReviewRow lang={lang} label={idNumberLabel} value={prepared.id_number ? num(lang, prepared.id_number) : ""} />
        <ReviewRow lang={lang} label={fl.mobile} value={prepared.mobile ? num(lang, prepared.mobile) : ""} />
        <ReviewRow lang={lang} label={fl.email} value={prepared.email} placeholder={r.notGiven} ltr={Boolean(prepared.email)} />
        <ReviewRow lang={lang} label={fl.blood_group} value={blood} placeholder={r.notGiven} />
      </ReviewGroup>

      <section aria-labelledby="declaration-title" className="rounded-xl border border-gold-400/60 bg-gold-50/60 p-4 sm:p-6">
        <h3 id="declaration-title" className="divider-star text-xl font-bold text-forest-800">{r.declarationTitle}</h3>
        {translated && (
          <p className="mt-3 flex gap-2 rounded-lg bg-white/80 px-3 py-2 text-[0.95rem] text-ink" data-testid="declaration-official-note">
            <Info className="mt-1 size-4 shrink-0 text-forest-700" aria-hidden="true" />
            <span>{r.officialNote}</span>
          </p>
        )}
        {lang === "en" && declaration.lang === "bn" && (
          <p className="mt-3 text-[0.95rem] text-muted">{r.bengaliOnly}</p>
        )}
        <Declaration paragraphs={declaration.paragraphs} lang={declaration.lang} pageLang={lang} name={name} testId="declaration-text" />
        {translated && declaration.original && (
          <details className="group mt-4 rounded-lg border border-gold-400/50 bg-white/70" data-testid="declaration-original">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 font-semibold text-forest-800 [&::-webkit-details-marker]:hidden">
              {r.showOriginal}
              <ChevronDown className="size-5 shrink-0 text-gold-700 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="border-t border-gold-400/40 px-3 pb-3">
              <Declaration paragraphs={declaration.original} lang="bn" pageLang={lang} name={name} />
            </div>
          </details>
        )}
        <p className="mt-4 text-sm text-muted">
          {fmt(r.date, { date: formatDate(today, lang) })} ·{" "}
          <Link href={localePath(lang, "/membership/terms")} target="_blank" className={V2.link}>
            {r.termsLink}
            <span className="sr-only"> {t.newTab}</span>
          </Link>
        </p>
      </section>

      <div className="space-y-4">
        <CheckboxField
          id="declaration"
          checked={values.declaration}
          onChange={(v) => onChange("declaration", v)}
          required
          tone="boxed"
          error={errors.declaration}
          label={r.declarationCheck}
        />
        <CheckboxField
          id="directory_consent"
          checked={values.directory_consent}
          onChange={(v) => onChange("directory_consent", v)}
          tone="boxed"
          label={
            <>
              {r.consentLabel} <span className="text-sm font-normal text-muted">{r.optional}</span>
            </>
          }
          hint={
            <>
              {r.consentHint}
              {minor && values.directory_consent && (
                <span className="mt-1 block font-medium text-ink" data-testid="minor-note">{r.minorNote}</span>
              )}
            </>
          }
        />
      </div>
    </div>
  );
}

/** Pledge paragraphs with the applicant's name emphasised. */
function Declaration({
  paragraphs,
  lang,
  pageLang,
  name,
  testId,
}: {
  paragraphs: string[];
  lang: Locale;
  pageLang: Locale;
  name: string;
  testId?: string;
}) {
  // The name keeps its own script's language inside the other language's text.
  const nameLang: Locale = /[ঀ-৿]/.test(name) ? "bn" : "en";
  return (
    <div className="mt-3 space-y-3 text-ink/90" data-testid={testId} lang={lang !== pageLang ? lang : undefined}>
      {declarationParts(paragraphs, name).map((parts, i) => (
        <p key={i}>
          {parts.map((p, j) =>
            p.isName ? (
              <strong key={j} className="text-forest-800" lang={nameLang !== lang ? nameLang : undefined}>
                {p.text}
              </strong>
            ) : (
              <span key={j}>{p.text}</span>
            ),
          )}
        </p>
      ))}
    </div>
  );
}

function ReviewGroup({ title, editLabel, edit, onEdit, children }: { title: string; editLabel: string; edit: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-cream/60 px-4 py-2">
        <h3 className="font-sans text-lg font-semibold text-forest-800">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 font-semibold text-forest-700 hover:bg-sage-50"
          aria-label={editLabel}
        >
          <Pencil className="size-4" aria-hidden="true" />
          {edit}
        </button>
      </div>
      <dl className="divide-y divide-line">{children}</dl>
    </section>
  );
}

function ReviewRow({
  lang,
  label,
  value,
  placeholder = "—",
  multiline,
  ltr,
}: {
  lang: Locale;
  label: string;
  value: string | null | undefined;
  placeholder?: string;
  multiline?: boolean;
  ltr?: boolean;
}) {
  return (
    <div className="grid gap-0.5 px-4 py-2.5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm text-muted sm:text-base">{label}</dt>
      <dd className={`min-w-0 break-words font-medium text-ink ${multiline ? "whitespace-pre-line" : ""}`} lang={scriptLang(lang, value)}>
        {value ? (
          ltr ? (
            <span dir="ltr" className="inline-block">{value}</span>
          ) : (
            value
          )
        ) : (
          <span className="font-normal text-muted">{placeholder}</span>
        )}
      </dd>
    </div>
  );
}
