"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { changeOwnPassword } from "@/app/admin/(panel)/account/actions";
import { Alert, Field, Input } from "@/components/ui/field";
import { PendingButton } from "@/components/admin/pending-button";
import { PASSWORD_LIMITS, type FieldErrors } from "@/lib/admin/schemas";
import { bn } from "@/lib/format";

const EMPTY = { current: "", next: "", confirm: "" };

/** Change own password: current password + new password twice. */
export function PasswordForm({ email }: { email: string }) {
  const [v, setV] = useState(EMPTY);
  const [show, setShow] = useState(false);
  const [fe, setFe] = useState<FieldErrors>({});
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (Object.keys(fe).length) ref.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [fe]);

  const field = (key: keyof typeof EMPTY, label: string, autoComplete: string, hint?: string) => (
    <Field id={`pw-${key}`} label={label} required error={fe[key]} hint={hint}>
      <Input
        id={`pw-${key}`}
        name={key}
        type={show ? "text" : "password"}
        dir="ltr"
        autoComplete={autoComplete}
        spellCheck={false}
        maxLength={key === "current" ? 200 : PASSWORD_LIMITS.max}
        value={v[key]}
        onChange={(e) => setV((p) => ({ ...p, [key]: e.target.value }))}
        aria-invalid={fe[key] ? true : undefined}
        aria-describedby={fe[key] ? `pw-${key}-error` : hint ? `pw-${key}-hint` : undefined}
      />
    </Field>
  );

  return (
    <form
      ref={ref}
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setStatus(null);
        startTransition(async () => {
          try {
            const r = await changeOwnPassword(v);
            if (!r.ok) {
              setFe(r.fieldErrors ?? {});
              setStatus({ ok: false, message: r.error });
              return;
            }
            setFe({});
            setV(EMPTY);
            setStatus({ ok: true, message: "পাসওয়ার্ড পরিবর্তন হয়েছে। পরের বার নতুন পাসওয়ার্ড দিয়ে লগইন করুন। অন্য ডিভাইসে খোলা সেশনগুলো বন্ধ করা হয়েছে।" });
          } catch {
            setStatus({ ok: false, message: "পাসওয়ার্ড পরিবর্তন করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।" });
          }
        });
      }}
    >
      {status && !pending && <Alert tone={status.ok ? "success" : "error"}>{status.message}</Alert>}
      {/* Lets password managers associate the new password with this account. */}
      <input type="text" name="username" autoComplete="username" value={email} readOnly hidden />
      {field("current", "বর্তমান পাসওয়ার্ড", "current-password")}
      {field("next", "নতুন পাসওয়ার্ড", "new-password", `কমপক্ষে ${bn(PASSWORD_LIMITS.min)} অক্ষর। অক্ষর, সংখ্যা ও চিহ্ন মিলিয়ে এমন পাসওয়ার্ড দিন যা অন্য কোথাও ব্যবহার করেননি।`)}
      {field("confirm", "নতুন পাসওয়ার্ড আবার লিখুন", "new-password")}
      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="size-5 accent-brand-700" />
        {show ? <EyeOff className="size-4 text-muted" aria-hidden="true" /> : <Eye className="size-4 text-muted" aria-hidden="true" />}
        পাসওয়ার্ড দেখান
      </label>
      <div>
        <PendingButton type="submit" pending={pending} icon={<KeyRound className="size-5" aria-hidden="true" />}>
          {pending ? "পরিবর্তন হচ্ছে…" : "পাসওয়ার্ড পরিবর্তন করুন"}
        </PendingButton>
      </div>
    </form>
  );
}
