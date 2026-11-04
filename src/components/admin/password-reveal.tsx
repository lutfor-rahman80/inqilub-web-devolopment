import { ShieldAlert } from "lucide-react";
import { CopyButton } from "@/components/admin/copy-button";

/** A temporary password shown exactly once, with a copy button and safe-handling advice. */
export function PasswordReveal({ email, password }: { email: string | null; password: string }) {
  return (
    <div className="space-y-4">
      {email && (
        <div>
          <p className="text-sm text-muted">ইমেইল (লগইন আইডি)</p>
          <p className="break-all font-semibold" dir="ltr">{email}</p>
        </div>
      )}
      <div>
        <p className="text-sm text-muted" id="temp-password-label">অস্থায়ী পাসওয়ার্ড</p>
        {/* One line, never split: the password may be read out or typed by hand. */}
        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
          <output
            aria-labelledby="temp-password-label"
            data-testid="temp-password"
            dir="ltr"
            className="block min-w-0 select-all overflow-x-auto whitespace-nowrap rounded-xl border border-gold-400 bg-gold-50 px-4 py-2.5 font-mono text-lg font-semibold tracking-wide text-brand-950 sm:flex-1"
          >
            {password}
          </output>
          <CopyButton value={password} label="পাসওয়ার্ড কপি" />
        </div>
      </div>
      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
        <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div className="space-y-1 text-sm">
          <p className="font-semibold">পাসওয়ার্ডটি শুধু এখনই একবার দেখানো হচ্ছে।</p>
          <p>
            এটি কপি করে নিরাপদ উপায়ে (সরাসরি বা ব্যক্তিগত বার্তায়) ব্যবহারকারীকে জানান। প্রথমবার লগইনের পর “আমার অ্যাকাউন্ট” পাতা থেকে
            নিজের পছন্দের নতুন পাসওয়ার্ড দিতে বলুন।
          </p>
        </div>
      </div>
    </div>
  );
}
