"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2, LoaderCircle, Send } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import type { contact } from "@/i18n/messages/contact";
import { Alert, Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { submitContact, type ContactFormState } from "./actions";

type ContactMessages = (typeof contact)[Locale];

/**
 * The public message form. Works without JavaScript: the server action
 * validates and answers in the page's language, and the re-rendered page
 * carries the errors (aria-invalid + `${id}-error`) and the typed values.
 */
export function ContactForm({ lang, t }: { lang: Locale; t: ContactMessages }) {
  const [state, formAction, pending] = useActionState<ContactFormState, FormData>(submitContact, null);
  const f = t.form;
  const fieldErrors = state && !state.ok ? state.fieldErrors ?? {} : {};
  const values = state && !state.ok ? state.values : { name: "", mobile: "", email: "", subject: "", message: "" };

  if (state?.ok) {
    return (
      <div data-testid="contact-success" className="rounded-[var(--radius-card)] border border-brand-200 bg-brand-50 p-6 sm:p-8">
        <p className="flex items-center gap-2 text-xl font-bold text-brand-800">
          <CheckCircle2 className="size-7 shrink-0" aria-hidden="true" />
          {f.successTitle}
        </p>
        <p className="mt-2 text-ink">{f.successBody}</p>
        <form action={formAction} className="mt-5">
          <input type="hidden" name="lang" value={lang} />
          <Button type="submit" name="intent" value="reset" variant="outline">
            {f.another}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate aria-busy={pending} data-testid="contact-form" className="space-y-5">
      <input type="hidden" name="lang" value={lang} />
      {state && !state.ok && <Alert>{state.error}</Alert>}

      <Field id="name" label={f.name} required error={fieldErrors.name} optionalLabel={null}>
        <Input
          id="name"
          name="name"
          key={`name-${values.name}`}
          defaultValue={values.name}
          autoComplete="name"
          required
          maxLength={120}
          aria-invalid={fieldErrors.name ? true : undefined}
          aria-describedby={fieldErrors.name ? "name-error" : undefined}
        />
      </Field>

      <fieldset className="space-y-4">
        <legend className="font-medium text-ink">{f.replyLegend}</legend>
        <p className="text-sm text-muted">{f.replyHint}</p>
        <Field id="mobile" label={f.mobile} error={fieldErrors.mobile} optionalLabel={f.optional}>
          <Input
            id="mobile"
            name="mobile"
            key={`mobile-${values.mobile}`}
            defaultValue={values.mobile}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder={f.mobilePlaceholder}
            maxLength={20}
            aria-invalid={fieldErrors.mobile ? true : undefined}
            aria-describedby={fieldErrors.mobile ? "mobile-error" : undefined}
          />
        </Field>
        <Field id="email" label={f.email} error={fieldErrors.email} optionalLabel={f.optional}>
          <Input
            id="email"
            name="email"
            key={`email-${values.email}`}
            defaultValue={values.email}
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={254}
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
          />
        </Field>
      </fieldset>

      <Field id="subject" label={f.subject} required error={fieldErrors.subject} optionalLabel={null}>
        <Input
          id="subject"
          name="subject"
          key={`subject-${values.subject}`}
          defaultValue={values.subject}
          required
          maxLength={200}
          aria-invalid={fieldErrors.subject ? true : undefined}
          aria-describedby={fieldErrors.subject ? "subject-error" : undefined}
        />
      </Field>

      <Field id="message" label={f.message} required hint={f.messageHint} error={fieldErrors.message} optionalLabel={null}>
        <Textarea
          id="message"
          name="message"
          key={`message-${values.message}`}
          defaultValue={values.message}
          required
          rows={6}
          maxLength={5000}
          aria-invalid={fieldErrors.message ? true : undefined}
          aria-describedby={fieldErrors.message ? "message-error" : "message-hint"}
        />
      </Field>

      {/* Honeypot: visually hidden; people never fill it, bots do — the
          server acknowledges those submissions but stores nothing. */}
      <div className="sr-only">
        <label htmlFor="contact-website">{f.honeypot}</label>
        <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <p className="text-sm text-muted">
        {f.privacyBefore}
        <Link href={localePath(lang, "/privacy")} className="font-semibold text-forest-700 underline-offset-4 hover:underline">
          {f.privacyLink}
        </Link>
        {f.privacyAfter}
      </p>

      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending ? (
          <>
            <LoaderCircle className="size-5 motion-safe:animate-spin" aria-hidden="true" />
            {f.sending}
          </>
        ) : (
          <>
            <Send className="size-5" aria-hidden="true" />
            {f.submit}
          </>
        )}
      </Button>
    </form>
  );
}
