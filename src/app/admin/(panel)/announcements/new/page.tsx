import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AnnouncementForm } from "../announcement-form";

export const metadata: Metadata = { title: "নতুন ঘোষণা" };

export default async function NewAnnouncementPage() {
  await requirePagePermission("content.manage");
  return (
    <>
      <AdminPageHeader title="নতুন ঘোষণা" description="শিরোনাম ও বিস্তারিত লিখুন (ইংরেজি ঐচ্ছিক)। প্রকাশ না করা পর্যন্ত এটি খসড়া হিসেবে থাকবে।" />
      <div className="max-w-3xl">
        <AnnouncementForm initial={{ title: "", body: "", title_en: "", body_en: "", is_published: false, is_pinned: false }} />
      </div>
    </>
  );
}
