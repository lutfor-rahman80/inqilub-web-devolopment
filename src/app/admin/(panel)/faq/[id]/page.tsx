import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePagePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { isUuid } from "@/lib/admin/text";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Alert } from "@/components/ui/field";
import { FaqForm } from "../faq-form";

export const metadata: Metadata = { title: "প্রশ্ন সম্পাদনা" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditFaqPage({ params, searchParams }: Props) {
  await requirePagePermission("content.manage");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!isUuid(id)) notFound();

  const db = await createClient();
  const { data: f, error } = await db
    .from("faqs")
    .select("id, question_bn, answer_bn, question_en, answer_en, is_published, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    return (
      <>
        <AdminPageHeader title="প্রশ্ন সম্পাদনা" />
        <Alert>প্রশ্নটি লোড করা যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।</Alert>
      </>
    );
  }
  if (!f) notFound();

  return (
    <>
      <AdminPageHeader
        title="প্রশ্ন সম্পাদনা"
        description={<>তৈরি: {formatDateTime(f.created_at)} · সর্বশেষ পরিবর্তন: {formatDateTime(f.updated_at)}</>}
      />
      <div className="max-w-3xl">
        <FaqForm
          key={f.id}
          id={f.id}
          initial={{
            question_bn: f.question_bn,
            answer_bn: f.answer_bn,
            question_en: f.question_en ?? "",
            answer_en: f.answer_en ?? "",
            is_published: f.is_published,
          }}
          updatedAt={f.updated_at}
          justCreated={sp.created === "1"}
        />
      </div>
    </>
  );
}
