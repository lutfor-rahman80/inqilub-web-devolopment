import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayInDhaka } from "@/lib/membership/normalize";
import { AdminPageHeader } from "@/components/admin/page-header";
import { MemberForm } from "@/components/membership/admin/member-form";

export const metadata: Metadata = { title: "নতুন সদস্য যোগ" };

export default async function NewMemberPage() {
  await requirePagePermission("members.manage");
  const supabase = await createClient();
  const { data: designations } = await supabase
    .from("designations")
    .select("id, name_bn, is_active")
    .eq("is_active", true)
    .order("rank_order");
  const general = designations?.find((d) => d.name_bn === "সদস্য")?.id ?? null;

  return (
    <>
      <Link href="/admin/members" className="mb-3 inline-flex min-h-11 items-center gap-1.5 font-medium text-brand-700 hover:underline">
        <ArrowLeft className="size-5" aria-hidden="true" />
        সব সদস্য
      </Link>
      <AdminPageHeader
        title="নতুন সদস্য যোগ করুন"
        description="যারা আগে কাগজের ফরমে সদস্য হয়েছেন, তাদের রেকর্ড এখানে যোগ করুন। অনলাইন আবেদনকারীদের রেকর্ড অনুমোদনের সময় স্বয়ংক্রিয়ভাবে তৈরি হয়।"
      />
      <div className="max-w-3xl">
        <MemberForm
          mode="create"
          maxDate={todayInDhaka()}
          designations={designations ?? []}
          initial={{
            member_no: "",
            full_name: "",
            designation_id: general,
            status: "active",
            mobile: "",
            email: "",
            blood_group: "",
            joined_on: todayInDhaka(),
            date_of_birth: "",
            sort_order: 0,
            notes: "",
            directory_consent: false,
            show_in_directory: false,
            public_phone_consent: false,
            public_phone: "",
            guardian_consent: false,
          }}
        />
      </div>
    </>
  );
}
