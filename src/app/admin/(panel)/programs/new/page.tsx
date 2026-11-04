import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Alert } from "@/components/ui/field";
import { ProgramForm } from "@/components/programs/admin/program-form";

export const metadata: Metadata = { title: "নতুন কর্মসূচি" };

export default async function NewProgramPage() {
  await requirePagePermission("content.manage");
  const db = await createClient();
  const { data: categories, error } = await db
    .from("activity_categories")
    .select("id, slug, name_bn, is_active")
    .order("sort_order")
    .order("name_bn");

  return (
    <>
      <AdminPageHeader
        title="নতুন কর্মসূচি"
        description="তারিখ, স্থান ও বিবরণ লিখুন। প্রকাশ না করা পর্যন্ত এটি খসড়া হিসেবে থাকবে। ছবি যুক্ত করা যাবে সংরক্ষণের পর।"
      />
      {error ? (
        <Alert>তথ্য লোড করা যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।</Alert>
      ) : (
        <div className="max-w-4xl">
          <ProgramForm
            categories={(categories ?? []).map((c) => ({ id: c.id, slug: c.slug, name: c.name_bn, isActive: c.is_active }))}
            initial={{
              category_id: "",
              slug: "",
              title_bn: "",
              title_en: "",
              summary_bn: "",
              summary_en: "",
              body_bn: "",
              body_en: "",
              location_bn: "",
              location_en: "",
              starts_on: "",
              ends_on: "",
              status_override: "",
              cover_image_id: "",
              is_published: false,
              sort_order: "০",
            }}
          />
        </div>
      )}
    </>
  );
}
