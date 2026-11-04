"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { QrCode, RefreshCw, ShieldCheck } from "lucide-react";
import { Alert, Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/admin/pending-button";
import type { EnrolmentStart, MfaResult } from "@/lib/admin/mfa-server";

type Started = Extract<EnrolmentStart, { ok: true }>;

/**
 * Authenticator-app set-up: “start” creates a factor and shows its QR code
 * and secret; the first 6-digit code from the app confirms it. Used on the
 * required set-up page (super admins) and on the account page.
 */
export function EnrolPanel({
  start,
  confirm,
  onDone,
  startLabel = "শুরু করুন",
  idPrefix = "enrol",
}: {
  start: () => Promise<EnrolmentStart>;
  confirm: (factorId: string, code: string) => Promise<MfaResult>;
  onDone?: () => void;
  startLabel?: string;
  idPrefix?: string;
}) {
  const [setup, setSetup] = useState<Started | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<{ message: string; field?: "code" } | null>(null);
  const [pending, startTransition] = useTransition();
  const codeRef = useRef<HTMLInputElement>(null);
  const codeId = `${idPrefix}-code`;
  // Fixed id: the e2e login helper (tests/e2e/helpers/login.ts) fills #code.
  const inputId = idPrefix === "enrol" ? "code" : codeId;

  useEffect(() => {
    if (setup) codeRef.current?.focus();
  }, [setup]);
  useEffect(() => {
    if (error?.field === "code") codeRef.current?.focus();
  }, [error]);

  function begin() {
    setError(null);
    startTransition(async () => {
      try {
        const r = await start();
        if (r.ok) {
          setSetup(r);
          setCode("");
        } else setError({ message: r.error });
      } catch {
        setError({ message: "সংযোগে সমস্যা হয়েছে। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।" });
      }
    });
  }

  function submit() {
    if (!setup) return;
    setError(null);
    startTransition(async () => {
      try {
        const r = await confirm(setup.factorId, code);
        if (r.ok) {
          setSetup(null);
          setCode("");
          onDone?.();
        } else setError({ message: r.error, field: r.field });
      } catch {
        setError({ message: "সংযোগে সমস্যা হয়েছে। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।" });
      }
    });
  }

  if (!setup) {
    return (
      <div className="space-y-3">
        {error && <Alert>{error.message}</Alert>}
        <PendingButton pending={pending} onClick={begin} data-testid="mfa-start" icon={<QrCode className="size-5" aria-hidden="true" />}>
          {startLabel}
        </PendingButton>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {error && !error.field && <Alert>{error.message}</Alert>}
      <div className="flex flex-col items-center gap-4 rounded-xl border border-line bg-cream/60 p-4 sm:flex-row sm:items-start">
        {/* PNG data URL produced on the server by the qrcode library from the Auth server's otpauth:// URI. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={setup.qr}
          width={200}
          height={200}
          alt="অথেনটিকেটর অ্যাপ দিয়ে স্ক্যান করার QR কোড"
          className="size-[200px] shrink-0 rounded-lg bg-white ring-1 ring-line"
          data-testid="totp-qr"
        />
        <div className="min-w-0 space-y-2 text-sm">
          <p className="font-semibold text-ink">স্ক্যান করা না গেলে অ্যাপে এই গোপন কোডটি হাতে লিখুন:</p>
          <code
            dir="ltr"
            data-testid="totp-secret"
            className="block select-all break-all rounded-lg bg-white px-3 py-2 font-mono text-base tracking-wider text-brand-900 ring-1 ring-line"
          >
            {setup.secret}
          </code>
          <p className="text-muted">
            অ্যাপে ধরন হিসেবে “সময়-ভিত্তিক” (Time based) বেছে নিন। এই কোড বা QR কোডটি কাউকে দেখাবেন না, ছবি তুলে রাখবেন না।
          </p>
        </div>
      </div>
      <Field id={inputId} label="অ্যাপে দেখানো ৬ অঙ্কের কোড" required error={error?.field === "code" ? error.message : undefined}>
        <Input
          ref={codeRef}
          id={inputId}
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          dir="ltr"
          maxLength={9}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-invalid={error?.field === "code" ? true : undefined}
          aria-describedby={error?.field === "code" ? `${inputId}-error` : undefined}
          className="max-w-48 text-center font-mono text-xl tracking-[0.3em]"
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <PendingButton type="submit" pending={pending} data-testid="mfa-submit" icon={<ShieldCheck className="size-5" aria-hidden="true" />}>
          যাচাই করে চালু করুন
        </PendingButton>
        <Button variant="ghost" className="border border-line" disabled={pending} onClick={begin}>
          <RefreshCw className="size-4" aria-hidden="true" /> নতুন QR কোড
        </Button>
      </div>
    </form>
  );
}
