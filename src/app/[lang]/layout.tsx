import "server-only";
import type { Metadata } from "next";
import "@fontsource/hind-siliguri/400.css";
import "@fontsource/hind-siliguri/500.css";
import "@fontsource/hind-siliguri/600.css";
import "@fontsource/hind-siliguri/700.css";
import "@fontsource/noto-serif-bengali/600.css";
import "@fontsource/noto-serif-bengali/700.css";
import "../globals.css";
import { notFound } from "next/navigation";
import { lang as getLang } from "next/root-params";
import { isLocale, DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { SITE_URL } from "@/lib/env";
import { SiteChrome } from "@/components/site/site-chrome";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  icons: { icon: [{ url: "/brand/logo-32.png", sizes: "32x32" }] },
};

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