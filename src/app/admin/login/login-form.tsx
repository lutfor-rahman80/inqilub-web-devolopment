"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "../actions";
import { Alert, Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      {notice && !state.error && <Alert tone="info">{notice}</Alert>}
      {state.error && <Alert>{state.error}</Alert>}
      <input type="hidden" name="next" value={next ?? ""} />
      <Field id="email" label="ইমেইল" required>
        <Input id="email" name="email" type="email" autoComplete="username" required inputMode="email" />
      </Field>
      <Field id="password" label="পাসওয়ার্ড" required>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "প্রবেশ করা হচ্ছে…" : "প্রবেশ করুন"}
      </Button>
    </form>
  );
}
