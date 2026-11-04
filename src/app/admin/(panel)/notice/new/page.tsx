import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/page-header";
import { PressForm } from "@/components/press/admin/press-form";
import { programChoices } from "../programs";

export const metadata: Metadata = { title: "Notice — নতুন আইটেম" };

export default async function NewPressPage() {
  await requirePagePermission("content.manage");
  const programs = await programChoices();
  return (
    <>
      <AdminPageHeader
        title="Notice — নতুন আইটেম"
        description="সংবাদমাধ্যমে প্রকাশিত খবর বা চ্যানেলকে দেওয়া সাক্ষাৎকারের লিংক যুক্ত করুন।"
      />
      <div className="max-w-4xl">
        <PressForm
          programs={programs}
          initial={{
            kind: "news",
            title_bn: "",
            title_en: "",
            outlet_bn: "",
            outlet_en: "",
            url: "",
            published_on: "",
            summary_bn: "",
            summary_en: "",
            program_id: "",
            is_published: true,
          }}
        />
      </div>
    </>
  );
}
