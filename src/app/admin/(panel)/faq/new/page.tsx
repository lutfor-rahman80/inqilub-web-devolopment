import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/page-header";
import { FaqForm } from "../faq-form";

export const metadata: Metadata = { title: "নতুন প্রশ্ন" };

export default async function NewFaqPage() {
  await requirePagePermission("content.manage");
  return (
    <>
      <AdminPageHeader
        title="নতুন প্রশ্ন"
        description="বাংলায় প্রশ্ন ও উত্তর লিখুন (ইংরেজি ঐচ্ছিক)। প্রকাশ না করা পর্যন্ত এটি খসড়া হিসেবে থাকবে এবং তালিকার শেষে যুক্ত হবে।"
      />
      <div className="max-w-3xl">
        <FaqForm initial={{ question_bn: "", answer_bn: "", question_en: "", answer_en: "", is_published: false }} />
      </div>
    </>
  );
}
