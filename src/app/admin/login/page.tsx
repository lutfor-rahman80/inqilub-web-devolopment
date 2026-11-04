import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Card } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "অ্যাডমিন লগইন", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <main className="pattern-islamic flex min-h-dvh items-center justify-center bg-brand-900 px-4 py-12">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={72} />
          <h1 className="mt-3 text-2xl font-bold">অ্যাডমিন প্যানেল</h1>
          <p className="text-muted">ইনকিলাব যুব সংগঠন</p>
        </div>
        <LoginForm
          next={next}
          notice={error === "no-access" ? "অনুগ্রহ করে অনুমোদিত অ্যাডমিন অ্যাকাউন্ট দিয়ে প্রবেশ করুন।" : undefined}
        />
        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/" className="underline underline-offset-4 hover:text-brand-800">← ওয়েবসাইটে ফিরে যান</Link>
        </p>
      </Card>
    </main>
  );
}
