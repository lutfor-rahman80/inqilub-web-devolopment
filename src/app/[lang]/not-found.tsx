import "server-only";
import { notFound } from "next/navigation";
import { lang as getLang } from "next/root-params";
import { isLocale, DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { SiteChrome } from "@/components/site/site-chrome";

export default async function NotFound({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const locale = ((await params).lang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale}>
      <body>
        <SiteChrome lang={locale}>
          <main className="max-w-2xl mx-auto py-20 px-6 text-center">
            <h1 className="text-3xl font-bold text-night-900">পাতা পাওয়া যায়নি</h1>
            <p className="mt-4 text-ink-600">আপনি খুঁজছেন এই পাতাটি এখানে নেই। URL যাচাই করে আবার চেষ্টা করুন।</p>
            <a
              href="/"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-night-900 px-6 py-3 font-semibold text-white transition-colors hover:bg-night-800"
            >
              হোম পেজে ফিরে যান
            </a>
          </main>
        </SiteChrome>
      </body>
    </html>
  );
}