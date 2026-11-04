import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePagePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { isUuid } from "@/lib/programs/schemas";
import { isPressKind } from "@/lib/press/schemas";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Alert } from "@/components/ui/field";
import { PressForm } from "@/components/press/admin/press-form";
import { programChoices } from "../programs";

export const metadata: Metadata = { title: "Notice — সম্পাদনা" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditPressPage({ params, searchParams }: Props) {
  await requirePagePermission("content.manage");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!isUuid(id)) notFound();
  const db = await createClient();
  const [{ data: item, error }, programs] = await Promise.all([
    db
      .from("press_items")
      .select("id, kind, title_bn, title_en, outlet_bn, outlet_en, url, published_on, summary_bn, summary_en, program_id, is_published, created_at, updated_at")
      .eq("id", id)
      .maybeSingle(),
    programChoices(),
  ]);
  if (error) {
    return (
      <>
        <AdminPageHeader title="Notice — সম্পাদনা" />
        <Alert>প্রতিবেদনটি লোড করা যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।</Alert>
      </>
    );
  }
  if (!item) notFound();

  return (
    <>
      <AdminPageHeader
        title="Notice — সম্পাদনা"
        description={`${item.title_bn} · যুক্ত হয়েছে: ${formatDateTime(item.created_at)}`}
      />
      <div className="max-w-4xl">
        <PressForm
          key={item.id}
          id={item.id}
          programs={programs}
          updatedAt={item.updated_at}
          justCreated={sp.created === "1"}
          initial={{
            kind: isPressKind(item.kind) ? item.kind : "news",
            title_bn: item.title_bn,
            title_en: item.title_en ?? "",
            outlet_bn: item.outlet_bn,
            outlet_en: item.outlet_en ?? "",
            url: item.url,
            published_on: item.published_on,
            summary_bn: item.summary_bn ?? "",
            summary_en: item.summary_en ?? "",
            program_id: item.program_id ?? "",
            is_published: item.is_published,
          }}
        />
      </div>
    </>
  );
}
