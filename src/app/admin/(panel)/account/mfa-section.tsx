"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { Alert, Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { AdminModal } from "@/components/admin/modal";
import { PendingButton } from "@/components/admin/pending-button";
import { EnrolPanel } from "@/app/admin/login/mfa/enrol-panel";
import { bn } from "@/lib/format";
import { confirmOwnEnrolment, removeOwnFactorAction, startOwnEnrolment } from "./mfa-actions";

type Factor = { id: string; added: string };

/** Own two-step login: status, authenticator apps (add / remove with a fresh code). */
export function MfaSection({ factors, isSuper }: { factors: Factor[]; isSuper: boolean }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Factor | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const on = factors.length > 0;

  return (
    <div className="space-y-4" data-testid="mfa-section">
      {notice && <Alert tone="success">{notice}</Alert>}
      <p className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
            on ? "bg-brand-50 text-brand-800" : "bg-gold-50 text-gold-800"
          }`}
          data-testid="mfa-status"
        >
          {on ? <ShieldCheck className="size-4" aria-hidden="true" /> : <ShieldAlert className="size-4" aria-hidden="true" />}
          {on ? "চালু আছে" : "চালু নেই"}
        </span>
        {isSuper && <span className="text-sm text-muted">সুপার অ্যাডমিনের জন্য বাধ্যতামূলক</span>}
      </p>

      {!on && !isSuper && (
        <Alert tone="info">
          <strong>সুপারিশ:</strong> আপনার অ্যাকাউন্ট আরও নিরাপদ রাখতে দুই ধাপের লগইন চালু করুন। চালু করলে প্রতিবার লগইনের সময় পাসওয়ার্ডের পরে মোবাইলের
          অথেনটিকেটর অ্যাপ থেকে ৬ অঙ্কের কোড দিতে হবে — পাসওয়ার্ড কেউ জেনে গেলেও আপনার ফোন ছাড়া প্রবেশ করতে পারবে না।
        </Alert>
      )}

      {on && (
        <ul className="space-y-2" aria-label="যুক্ত অথেনটিকেটর অ্যাপ">
          {factors.map((f, i) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white px-3 py-2">
              <span className="flex items-center gap-2">
                <Smartphone className="size-5 text-brand-700" aria-hidden="true" />
                <span>
                  অথেনটিকেটর অ্যাপ {bn(i + 1)} <span className="text-sm text-muted">— যুক্ত হয়েছে {f.added}</span>
                </span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-11 border border-line bg-white text-red-700 hover:bg-red-50"
                onClick={() => {
                  setNotice(null);
                  setRemoving(f);
                }}
                aria-label={`অথেনটিকেটর অ্যাপ ${bn(i + 1)} মুছুন`}
              >
                <Trash2 className="size-4" aria-hidden="true" /> মুছুন
              </Button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="rounded-xl border border-line bg-cream/40 p-4">
          <p className="mb-3 text-sm text-ink/90">
            মোবাইলে অথেনটিকেটর অ্যাপ (যেমন Google Authenticator বা Microsoft Authenticator) খুলে QR কোডটি স্ক্যান করুন, তারপর অ্যাপে দেখানো কোডটি লিখুন।
          </p>
          <EnrolPanel
            idPrefix="account-enrol"
            start={startOwnEnrolment}
            confirm={confirmOwnEnrolment}
            startLabel="QR কোড দেখান"
            onDone={() => {
              setAdding(false);
              setNotice("দুই ধাপের লগইন চালু হয়েছে। নিরাপত্তার জন্য অন্য ডিভাইসে খোলা আপনার লগইনগুলো বন্ধ করা হয়েছে; এরপর থেকে লগইনের সময় অ্যাপের কোড লাগবে।");
              router.refresh();
            }}
          />
          <Button variant="ghost" size="sm" className="mt-3 min-h-11" onClick={() => setAdding(false)}>
            বাতিল
          </Button>
        </div>
      ) : (
        <Button variant={on ? "outline" : "primary"} onClick={() => setAdding(true)} data-testid="mfa-add">
          <Smartphone className="size-5" aria-hidden="true" />
          {on ? "আরেকটি অ্যাপ যুক্ত করুন" : "দুই ধাপের লগইন চালু করুন"}
        </Button>
      )}

      {removing && (
        <RemoveDialog
          factor={removing}
          lastForSuper={isSuper && factors.length <= 1}
          onClose={() => setRemoving(null)}
          onDone={() => {
            setRemoving(null);
            setNotice("অথেনটিকেটর অ্যাপটি মুছে ফেলা হয়েছে।");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function RemoveDialog({
  factor,
  lastForSuper,
  onClose,
  onDone,
}: {
  factor: Factor;
  lastForSuper: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<{ message: string; field?: "code" } | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <AdminModal title="অথেনটিকেটর অ্যাপ মুছুন" onClose={onClose} busy={pending} size="sm">
      {lastForSuper ? (
        <div className="space-y-4">
          <Alert tone="info">
            সুপার অ্যাডমিনের অন্তত একটি অথেনটিকেটর অ্যাপ যুক্ত থাকতে হবে। ফোন বদলাতে চাইলে আগে “আরেকটি অ্যাপ যুক্ত করুন” দিয়ে নতুন ফোনটি যুক্ত করুন, তারপর
            পুরোনোটি মুছুন।
          </Alert>
          <div className="flex justify-end">
            <Button variant="ghost" className="border border-line" onClick={onClose} data-autofocus>
              ঠিক আছে
            </Button>
          </div>
        </div>
      ) : (
        <form
          noValidate
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            setError(null);
            try {
              const r = await removeOwnFactorAction(factor.id, code);
              if (r.ok) onDone();
              else setError({ message: r.error, field: r.field });
            } catch {
              setError({ message: "সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।" });
            } finally {
              setPending(false);
            }
          }}
        >
          <p className="text-ink/90">
            নিশ্চিত করতে আপনার যেকোনো অথেনটিকেটর অ্যাপে এখন দেখানো ৬ অঙ্কের কোডটি লিখুন। মুছে ফেলার পর ওই অ্যাপের কোড দিয়ে আর লগইন করা যাবে না।
          </p>
          {error && !error.field && <Alert>{error.message}</Alert>}
          <Field id="remove-code" label="৬ অঙ্কের কোড" required error={error?.field === "code" ? error.message : undefined}>
            <Input
              id="remove-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              maxLength={9}
              value={code}
              data-autofocus
              onChange={(e) => setCode(e.target.value)}
              aria-invalid={error?.field === "code" ? true : undefined}
              aria-describedby={error?.field === "code" ? "remove-code-error" : undefined}
              className="max-w-48 text-center font-mono text-xl tracking-[0.3em]"
            />
          </Field>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" className="border border-line" onClick={onClose} disabled={pending}>
              বাতিল
            </Button>
            <PendingButton type="submit" variant="danger" pending={pending} icon={<Trash2 className="size-5" aria-hidden="true" />}>
              মুছে ফেলুন
            </PendingButton>
          </div>
        </form>
      )}
    </AdminModal>
  );
}
