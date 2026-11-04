import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource/hind-siliguri/400.css";
import "@fontsource/hind-siliguri/600.css";
import "@fontsource/noto-serif-bengali/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "পৃষ্ঠা পাওয়া যায়নি | Page not found",
  robots: { index: false, follow: true },
};

/**
 * Fallback 404 for URLs that match no route at all (the app has two root
 * layouts: public [lang] and admin). Public URLs normally get the localized
 * 404 from app/[lang]/not-found.tsx instead.
 */
export default function GlobalNotFound() {
  return (
    <html lang="bn" data-scroll-behavior="smooth">
      <body className="min-h-dvh antialiased">
        <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-4 text-center">
          <p className="font-serif text-7xl font-bold text-gold-700" aria-hidden="true">৪০৪</p>
          <h1 className="mt-4 text-3xl font-bold">পৃষ্ঠাটি খুঁজে পাওয়া যায়নি</h1>
          <p className="mt-1 text-lg text-muted" lang="en">Page not found</p>
          <p className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/" className="rounded-xl bg-brand-700 px-5 py-3 font-semibold text-white hover:bg-brand-800">হোম পেজ</Link>
            <Link href="/en" lang="en" className="rounded-xl border border-brand-700 px-5 py-3 font-semibold text-brand-800 hover:bg-brand-50">English home</Link>
          </p>
        </main>
      </body>
    </html>
  );
}
