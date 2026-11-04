import { AdminRecordNotFound } from "@/components/membership/admin/record-not-found";

/** notFound() from the application detail page: stay inside the admin panel. */
export default function ApplicationNotFound() {
  return (
    <AdminRecordNotFound
      title="আবেদনটি খুঁজে পাওয়া যায়নি"
      body="আবেদনটি হয়তো মুছে ফেলা হয়েছে, অথবা লিংকটি সঠিক নয়। আবেদনের তালিকা থেকে আবার খুঁজে দেখুন।"
      backHref="/admin/applications?status=all"
      backLabel="সব আবেদন"
    />
  );
}
