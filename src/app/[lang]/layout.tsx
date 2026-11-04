import "server-only";
import { notFound } from "next/navigation";
import { lang as getLang } from "next/root-params";
import { isLocale, DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { SiteChrome } from "@/components/site/site-chrome";

export default async function LangLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await getLang()) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale}>
      <body>
        <SiteChrome lang={locale}>{children}</SiteChrome>
      </body>
    </html>
  );
}