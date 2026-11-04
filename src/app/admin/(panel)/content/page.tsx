import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, ImageIcon, Info } from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { CONTENT_SECTIONS, type ContentSection } from "@/lib/admin/schemas";
import { SETTINGS_SECTIONS } from "@/lib/admin/audit";
import { firstParam } from "@/lib/admin/text";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ContentSectionForm } from "./content-form";
import { Alert } from "@/components/ui/field";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "ওয়েবসাইট কনটেন্ট" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const SECTION_INFO: Record<ContentSection, { label: string; where: string; href: string; help: string }> = {
  organization: {
    label: "সংগঠন",
    where: "হেডার, হোম পেজ, ফুটার ও বিভিন্ন পৃষ্ঠার লেখা",
    href: "/",
    help: "সংগঠনের নাম, পরিচিতি বাক্য, স্লোগান ও অবস্থান — বাংলা ও (ঐচ্ছিক) ইংরেজি। ব্রাউজার ট্যাবের শিরোনাম ও সার্চ ইঞ্জিনের বিবরণে থাকা নামটি এখান থেকে বদলায় না (সেটি কোডে লেখা)।",
  },
  about: {
    label: "আমাদের সম্পর্কে",
    where: "“আমাদের সম্পর্কে” পৃষ্ঠা ও হোম পেজ",
    href: "/about",
    help: "পরিচিতি, লক্ষ্য, উদ্দেশ্য ও “কেন এই সংগঠন” — বাংলা ও (ঐচ্ছিক) ইংরেজি। হোম পেজে লক্ষ্যের প্রথম বাক্য এবং অন্য লেখাগুলোর সংক্ষিপ্ত অংশ দেখানো হয়।",
  },
  contact: {
    label: "যোগাযোগ",
    where: "“যোগাযোগ” পৃষ্ঠা ও ফুটার",
    href: "/contact",
    help: "ঠিকানা, ফোন, ইমেইল, ফেসবুক পেজ, গুগল ম্যাপ ও অফিস সময়। শুধু নিশ্চিত তথ্য দিন; অজানা তথ্যের ঘর ফাঁকা রাখুন।",
  },
  membership: {
    label: "সদস্য পদ",
    where: "“সদস্য হোন” পৃষ্ঠা ও অঙ্গীকারনামা",
    href: "/membership",
    help: "অনলাইনে আবেদন গ্রহণ চালু/বন্ধ, আবেদন ফর্মের অঙ্গীকারনামা (বাংলা, বাধ্যতামূলক) এবং ইংরেজি সাইটের জন্য তার অনুবাদ (ঐচ্ছিক)।",
  },
  directory: {
    label: "সদস্য তালিকা",
    where: "“সদস্যবৃন্দ” পৃষ্ঠা",
    href: "/members",
    help: "ওয়েবসাইটে সদস্যদের তালিকা দেখানো হবে কি না, এবং কমিটির মেয়াদ (যেমন ২০২৬–২৭)।",
  },
  social: {
    label: "সামাজিক মাধ্যম",
    where: "হেডারের “সামাজিক মাধ্যম” মেনু, মোবাইল মেনু ও ফুটার",
    href: "/",
    help: "ইউটিউব, ইনস্টাগ্রাম ইত্যাদির লিংক। শুধু যে মাধ্যমের লিংক দেওয়া আছে সেটিই দেখানো হয়; ফেসবুক পেজের লিংক “যোগাযোগ” অংশে থাকে।",
  },
};

export default async function ContentPage({ searchParams }: Props) {
  await requirePagePermission("content.manage");
  const sp = await searchParams;
  const section = CONTENT_SECTIONS.find((s) => s === firstParam(sp.section)) ?? "organization";

  const db = await createClient();
  const { data: rows, error } = await db.from("site_settings").select("key, value, updated_at, updated_by");
  const row = rows?.find((r) => r.key === section) ?? null;

  let editor: string | null = null;
  if (row?.updated_by) {
    const { data } = await db.from("staff_profiles").select("full_name").eq("id", row.updated_by).maybeSingle();
    editor = data?.full_name ?? null;
  }

  const value = row?.value && typeof row.value === "object" && !Array.isArray(row.value) ? (row.value as Record<string, unknown>) : {};
  const info = SECTION_INFO[section];

  return (
    <>
      <AdminPageHeader
        title="ওয়েবসাইট কনটেন্ট"
        description="ওয়েবসাইটে দেখানো সংগঠনের তথ্য ও লেখা এখান থেকে পরিবর্তন করুন। সংরক্ষণের সাথে সাথে ওয়েবসাইট হালনাগাদ হয়।"
      />

      <nav aria-label="কনটেন্টের অংশ" className="mb-5">
        <ul className="flex flex-wrap gap-2">
          {CONTENT_SECTIONS.map((s) => {
            const active = s === section;
            return (
              <li key={s}>
                <Link
                  href={s === "organization" ? "/admin/content" : `/admin/content?section=${s}`}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-xl border px-4 font-semibold transition-colors ${
                    active ? "border-brand-700 bg-brand-700 text-white" : "border-line bg-white text-brand-800 hover:bg-brand-50"
                  }`}
                >
                  {SECTION_INFO[s].label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {error ? (
        <Alert>ওয়েবসাইটের তথ্য লোড করা যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।</Alert>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <section aria-labelledby="section-title" className="min-w-0">
              <h2 id="section-title" className="mb-1 text-xl font-bold">{SETTINGS_SECTIONS[section] ?? info.label}</h2>
              <p className="mb-4 text-sm text-muted" data-testid="content-last-updated">
                {row?.updated_at ? <>সর্বশেষ পরিবর্তন: {formatDateTime(row.updated_at)}{editor ? ` — ${editor}` : ""}</> : "এখনো সংরক্ষণ করা হয়নি।"}
              </p>
              {/* key: switching sections must not reuse another section's form state */}
              <ContentSectionForm key={section} section={section} initial={value} updatedAt={row?.updated_at ?? null} />
            </section>

            <aside className="space-y-4" aria-label="সহায়তা">
              <Card className="p-4">
                <p className="flex items-center gap-2 font-semibold text-brand-900">
                  <Info className="size-5 text-gold-600" aria-hidden="true" /> কোথায় দেখা যায়
                </p>
                <p className="mt-2 text-muted">{info.help}</p>
                <p className="mt-2 text-sm text-muted">দেখা যায়: {info.where}</p>
                <Link
                  href={info.href}
                  target="_blank"
                  className="mt-3 inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand-700 underline-offset-4 hover:underline"
                >
                  ওয়েবসাইটে দেখুন <ExternalLink className="size-4" aria-hidden="true" />
                  <span className="sr-only">(নতুন ট্যাবে খুলবে)</span>
                </Link>
              </Card>
              <Card className="p-4" data-testid="logo-note">
                <p className="flex items-center gap-2 font-semibold text-brand-900">
                  <ImageIcon className="size-5 text-gold-600" aria-hidden="true" /> লোগো পরিবর্তন
                </p>
                <p className="mt-2 text-muted">
                  লোগো এখান থেকে বদলানো যায় না। লোগোর ফাইলগুলো ওয়েবসাইটের কোডে{" "}
                  <code dir="ltr" className="rounded bg-cream px-1.5 py-0.5 text-sm text-brand-800">public/brand/</code> ফোল্ডারে থাকে:{" "}
                  <code dir="ltr" className="text-sm">logo.png</code> (মূল লোগো),{" "}
                  <code dir="ltr" className="text-sm">logo-192.png</code> ও <code dir="ltr" className="text-sm">logo-32.png</code> (ছোট লোগো ও
                  ব্রাউজার ট্যাবের আইকন) এবং <code dir="ltr" className="text-sm">og-default.png</code> (ফেসবুকে লিংক শেয়ার করলে দেখানো ১২০০×৬৩০
                  ছবি)। নতুন লোগোর মূল ফাইল (বর্গাকার PNG, কমপক্ষে ৫১২×৫১২, বা SVG) ডেভেলপারকে দিলে তিনি সবগুলো আকার তৈরি করে নতুন করে ডিপ্লয় করবেন.
                </p>
              </Card>
            </aside>
          </div>
        </div>
      )}
    </>
  );
}