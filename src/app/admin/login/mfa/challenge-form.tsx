"use client";

import { useActionState, useEffect, useRef } from "react";
import { ShieldCheck } from "lucide-react";
import { Alert, Field, Input, Select } from "@/components/ui/field";
import { PendingButton } from "@/components/admin/pending-button";
import { bn } from "@/lib/format";
import { verifyLoginCode, type ChallengeState } from "./actions";

/** The 6-digit code from the authenticator app (second step after the password). */
export function ChallengeForm({ next, factors }: { next: string; factors: { id: string; label: string }[] }) {
  const [state, action, pending] = useActionState<ChallengeState, FormData>(verifyLoginCode, {});
  const codeRef = useRef<HTMLInputElement>(null);
  const codeError = state.field === "code" ? state.error : undefined;

  useEffect(() => {
    if (state.error) {
      codeRef.current?.select();
      codeRef.current?.focus();
    }
  }, [state]);

  return (
    <form action={action} noValidate className="space-y-5">
      {state.error && !codeError && <Alert>{state.error}</Alert>}
      <input type="hidden" name="next" value={next} />
      {factors.length > 1 && (
        <Field id="factor" label="অথেনটিকেটর অ্যাপ" required hint="যে অ্যাপের কোড দেবেন সেটি বেছে নিন (যেকোনো একটির কোড দিলেই চলবে)।">
          <Select id="factor" name="factor" aria-describedby="factor-hint" defaultValue={factors[0].id}>
            {factors.map((f, i) => (
              <option key={f.id} value={f.id}>
                {bn(i + 1)}. {f.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {factors.length === 1 && <input type="hidden" name="factor" value={factors[0].id} />}
      <Field id="code" label="৬ অঙ্কের কোড" required error={codeError}>
        <Input
          ref={codeRef}
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          dir="ltr"
          maxLength={9}
          autoFocus
          required
          aria-invalid={codeError ? true : undefined}
          aria-describedby={codeError ? "code-error" : undefined}
          className="text-center font-mono text-2xl tracking-[0.35em]"
        />
      </Field>
      <PendingButton type="submit" pending={pending} className="w-full" data-testid="mfa-submit" icon={<ShieldCheck className="size-5" aria-hidden="true" />}>
        যাচাই করুন
      </PendingButton>
    </form>
  );
}
