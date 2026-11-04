import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/page-header";
import { CategoryForm } from "@/components/gallery/admin/category-form";
import { createCategory } from "../actions";

export const metadata: Metadata = { title: "নতুন ক্যাটাগরি" };

export default async function NewCategoryPage() {
  await requirePagePermission("content.manage");
  return (
    <div className="max-w-4xl">
      <AdminPageHeader
        title="নতুন ক্যাটাগরি"
        description="নতুন কার্যক্রম যুক্ত করুন। এর জন্য গ্যালারিতে একটি নতুন ফোল্ডার ব্যবহার হবে।"
      />
      <CategoryForm
        mode="create"
        action={createCategory}
        initial={{
          slug: "",
          name_bn: "",
          summary: "",
          description: "",
          icon: "heart-handshake",
          sort_order: 200,
          is_active: true,
          cover_image_id: null,
          name_en: "",
          summary_en: "",
          description_en: "",
        }}
      />
    </div>
  );
}
