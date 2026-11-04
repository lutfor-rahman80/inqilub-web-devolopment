import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { getStaffSession } from "@/lib/auth";
import { safeAdminNext } from "@/lib/admin/mfa";
import { formatDate } from "@/lib/format";
import { Logo } from "@/components/ui/logo";
import { Card } from "@/components/ui/card";
import { signOut } from "../../actions";
import { ChallengeForm } from "./challenge-form";
import { RequiredEnrolment } from "./required-enrolment";

export const metadata: Metadata = { title: "দুই ধাপের লগইন", robots: { index: false, follow: false } };

/**
 * Second step of the admin sign-in: the code from the authenticator app —
 * or, for a super admin without one yet, its one-time set-up. Signed-out
 * visitors are sent to the login page by the proxy; sessions that need no
 * second step go straight on.
 */
export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: nextParam } = await searchParams;
  const next = safeAdminNext(nextParam);
  const session = await getStaffSession();
  if (!session) redirect("/admin/login?error=no-access");
  if (session.mfa.satisfied) redirect(next);

  const mode = session.mfa.mustEnrol ? "enrol" : "challenge";
  const factors = session.mfa.factors.map((f) => ({ id: f.id, label: `যুক্ত হয়েছে ${formatDate(f.createdAt)}` }));

  return (
    <main id="main" className="pattern-islamic flex min-h-dvh items-center justify-center bg-brand-900 px-4 py-12">
      <Card className={`w-full p-6 sm:p-8 ${mode === "enrol" ? "max-w-xl" : "max-w-md"}`} data-mfa-mode={mode}>
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={64} />
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-800">
            <ShieldCheck className="size-4" aria-hidden="true" /> নিরাপদ লগইন
          </p>
          <h1 className="mt-3 text-2xl font-bold">{mode === "enrol" ? "দুই ধাপের লগইন চালু করুন" : "দুই ধাপের যাচাই"}</h1>
          <p className="mt-1 break-all text-sm text-muted" dir="ltr">{session.staff.email}</p>
        </div>

        {mode === "challenge" ? (
          <>
            <p className="mb-5 text-ink/90">
              আপনার মোবাইলের অথেনটিকেটর অ্যাপে (যেমন Google Authenticator বা Microsoft Authenticator){" "}
              <span dir="ltr" className="font-semibold">Inqilab Jubo Sangathan</span>-এর পাশে দেখানো ৬ অঙ্কের কোডটি লিখুন।
            </p>
            <ChallengeForm next={next} factors={factors} />
            <details className="mt-6 rounded-xl border border-line bg-cream/60 p-4 text-sm">
              <summary className="cursor-pointer font-semibold text-brand-800">ফোন হারিয়েছেন বা অ্যাপটি মুছে গেছে?</summary>
              <p className="mt-2 text-ink/90">
                অন্য একজন সুপার অ্যাডমিনকে জানান — তিনি “আমার অ্যাকাউন্ট” পাতা থেকে আপনার দুই ধাপের লগইন রিসেট করতে পারবেন। এরপর আবার লগইন
                করে নতুন ফোনে চালু করুন। কোনো সুপার অ্যাডমিন না থাকলে ওয়েবসাইটের ডেভেলপারের সাহায্য নিন।
              </p>
            </details>
          </>
        ) : (
          <>
            <p className="text-ink/90">
              সুপার অ্যাডমিন অ্যাকাউন্টে প্রবেশ করতে পাসওয়ার্ডের পাশাপাশি মোবাইলের একটি অথেনটিকেটর অ্যাপের কোড লাগে। এটি একবার চালু করলেই হবে;
              এরপর প্রতিবার লগইনের সময় অ্যাপ থেকে কোড দিতে হবে।
            </p>
            <ol className="my-5 list-decimal space-y-2 ps-6 text-ink/90">
              <li>
                মোবাইলে একটি অথেনটিকেটর অ্যাপ ইনস্টল করুন — যেমন Google Authenticator বা Microsoft Authenticator (Play Store / App Store-এ
                বিনামূল্যে পাওয়া যায়)।
              </li>
              <li>নিচের “শুরু করুন” চাপুন, তারপর অ্যাপে “+” বা “QR কোড স্ক্যান” বেছে নিয়ে QR কোডটি স্ক্যান করুন।</li>
              <li>অ্যাপে দেখানো ৬ অঙ্কের কোডটি লিখে “যাচাই করে চালু করুন” চাপুন।</li>
            </ol>
            <RequiredEnrolment next={next} />
          </>
        )}

        <form action={signOut} className="mt-6 border-t border-line pt-4 text-center">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 font-medium text-brand-800 underline-offset-4 hover:underline"
          >
            <LogOut className="size-4" aria-hidden="true" /> লগআউট করে অন্য অ্যাকাউন্টে প্রবেশ
          </button>
        </form>
      </Card>
    </main>
  );
}
