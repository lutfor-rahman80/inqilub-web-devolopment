import type { Metadata, Viewport } from "next";
import "@fontsource/hind-siliguri/400.css";
import "@fontsource/hind-siliguri/500.css";
import "@fontsource/hind-siliguri/600.css";
import "@fontsource/hind-siliguri/700.css";
import "@fontsource/noto-serif-bengali/600.css";
import "@fontsource/noto-serif-bengali/700.css";
import "../globals.css";
import { SITE_URL } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "অ্যাডমিন প্যানেল", template: "%s | অ্যাডমিন" },
  icons: { icon: [{ url: "/brand/logo-32.png", sizes: "32x32" }] },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#24473a" };

/** Root layout of the admin panel (Bengali only). */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" data-scroll-behavior="smooth">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
