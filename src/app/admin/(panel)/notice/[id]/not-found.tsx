import { AdminPanelNotFound } from "@/components/admin/panel-not-found";

/** A deleted or mistyped Notice item: stay in the panel, back to the list. */
export default function PressNotFound() {
  return (
    <AdminPanelNotFound
      title="প্রতিবেদনটি খুঁজে পাওয়া যায়নি"
      body="প্রতিবেদনটি হয়তো মুছে ফেলা হয়েছে, অথবা লিংকটি সঠিক নয়। Notice তালিকা থেকে আবার খুঁজে দেখুন।"
      backHref="/admin/notice"
      backLabel="Notice তালিকা"
    />
  );
}
