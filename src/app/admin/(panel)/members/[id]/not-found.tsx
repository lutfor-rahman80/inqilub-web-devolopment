import { AdminRecordNotFound } from "@/components/membership/admin/record-not-found";

/** notFound() from the member detail page: stay inside the admin panel. */
export default function MemberNotFound() {
  return (
    <AdminRecordNotFound
      title="সদস্যের রেকর্ডটি খুঁজে পাওয়া যায়নি"
      body="রেকর্ডটি হয়তো আর নেই, অথবা লিংকটি সঠিক নয়। সদস্য তালিকা থেকে আবার খুঁজে দেখুন।"
      backHref="/admin/members"
      backLabel="সব সদস্য"
    />
  );
}
