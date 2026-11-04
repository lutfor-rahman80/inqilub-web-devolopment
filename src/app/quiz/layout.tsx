import type { Metadata, Viewport } from "next";
import "./quiz.css";
import { SITE_URL } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "ইনকিলাব যুব সংগঠন – সীরাত কুইজ - ২০২৬ইং ফলাফল",
  description:
    "ইনকিলাব যুব সংগঠন কর্তৃক আয়োজিত সীরাত কুইজ - ২০২৬ইং এর ফলাফল। রোল নাম্বার ও শিক্ষাপ্রতিষ্ঠানের নাম দিয়ে আপনার রেজাল্ট দেখুন।",
  icons: {
    icon: [{ url: "/quiz/assets/logo.jpg", type: "image/jpeg" }],
    apple: [{ url: "/quiz/assets/logo.jpg" }],
  },
  openGraph: {
    type: "website",
    locale: "bn_BD",
    siteName: "ইনকিলাব যুব সংগঠন",
    title: "ইনকিলাব যুব সংগঠন – সীরাত কুইজ ২০২৬ইং ফলাফল",
    description: "রোল নাম্বার ও শিক্ষাপ্রতিষ্ঠানের নাম দিয়ে আপনার রেজাল্ট দেখুন।",
    images: [{ url: "/quiz/assets/og-share.jpg", width: 1200, height: 450 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ইনকিলাব যুব সংগঠন – সীরাত কুইজ ২০২৬ইং ফলাফল",
    description: "রোল নাম্বার ও শিক্ষাপ্রতিষ্ঠানের নাম দিয়ে আপনার রেজাল্ট দেখুন।",
    images: ["/quiz/assets/og-share.jpg"],
  },
};

export const viewport: Viewport = { themeColor: "#064e3b" };

/**
 * সীরাত কুইজ ফলাফল পেজের নিজস্ব রুট লেআউট (আগের static student.html এর
 * Next.js রূপ)। সাইটের মূল ডিজাইন সিস্টেম এখানে ব্যবহার হয় না — পেজটির
 * নিজস্ব quiz.css ও Google Fonts (Noto Sans Bengali + Hind Siliguri)
 * static পেজের মতোই রাখা হয়েছে।
 */
export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <body>
        {/* static পেজের মতোই Google Fonts লিংক; React এগুলো <head>-এ তুলে নেয় */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&family=Hind+Siliguri:wght@400;500;600;700&display=swap"
          rel="stylesheet"
          precedence="default"
        />
        {children}
      </body>
    </html>
  );
}
