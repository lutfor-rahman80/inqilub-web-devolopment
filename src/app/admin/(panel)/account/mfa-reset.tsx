"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Alert, Field, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { bn } from "@/lib/format";
import { resetStaffMfa } from "./mfa-actions";

type Person = { id: string; name: string; email: string; factors: number };

/** Super admins: remove another staff member's authenticator apps (lost / replaced phone). */
export function MfaResetCard({ people }: { people: Person[] }) {
  const router = useRouter();
  const [target, setTarget] = useState(people[0]?.id ?? "");
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const person = people.find((p) => p.id === target) ?? null;

  if (!people.length) {
    return <p className="text-muted" data-testid="mfa-reset-empty">অন্য কোনো কর্মীর অথেনটিকেটর অ্যাপ যুক্ত নেই।</p>;
  }

  return (
    <div className="space-y-4" data-testid="mfa-reset">
      {notice && <Alert tone="success">{notice}</Alert>}
      <Field id="mfa-reset-target" label="ব্যবহারকারী" required>
        <Select id="mfa-reset-target" value={target} onChange={(e) => setTarget(e.target.value)}>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.email}) — {bn(p.factors)}টি অ্যাপ
            </option>
          ))}
        </Select>
      </Field>
      <Button variant="outline" onClick={() => setConfirming(true)} disabled={!person}>
        <RotateCcw className="size-5" aria-hidden="true" /> দুই ধাপের লগইন রিসেট করুন
      </Button>
      {confirming && person && (
        <ConfirmDialog
          title="দুই ধাপের লগইন রিসেট"
          confirmLabel="রিসেট করুন"
          onCancel={() => setConfirming(false)}
          onConfirm={async () => {
            const r = await resetStaffMfa(person.id);
            if (!r.ok) return r.error;
            setConfirming(false);
            setNotice(`${person.name}-এর অথেনটিকেটর অ্যাপ মুছে ফেলা হয়েছে। তিনি পাসওয়ার্ড দিয়ে লগইন করে নতুন ফোনে আবার চালু করবেন।`);
            router.refresh();
            return null;
          }}
        >
          <p>
            <strong>{person.name}</strong>-এর সব অথেনটিকেটর অ্যাপ মুছে ফেলা হবে। শুধু তখনই করুন যখন আপনি নিশ্চিত যে অনুরোধটি তিনিই করেছেন (যেমন সরাসরি বা
            ফোনে কথা বলে) — অন্যথায় তার পাসওয়ার্ড জানা কেউ অ্যাকাউন্টে ঢুকে যেতে পারে।
          </p>
          <p className="text-sm text-muted">সুপার অ্যাডমিন হলে পরের লগইনে তাকে নতুন অ্যাপ যুক্ত করতে বলা হবে। কাজটি অডিট লগে থাকবে।</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
