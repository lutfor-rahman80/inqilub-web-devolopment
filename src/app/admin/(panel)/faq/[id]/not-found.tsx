import { AdminPanelNotFound } from "@/components/admin/panel-not-found";

/** A deleted or mistyped FAQ entry: stay in the panel, back to the list. */
export default function FaqNotFound() {
  return (
    <AdminPanelNotFound
      title="প্রশ্নটি খুঁজে পাওয়া যায়নি"
      body="প্রশ্নটি হয়তো মুছে ফেলা হয়েছে, অথবা লিংকটি সঠিক নয়। প্রশ্নোত্তরের তালিকা থেকে আবার খুঁজে দেখুন।"
      backHref="/admin/faq"
      backLabel="প্রশ্নোত্তরের তালিকা"
    />
  );
}
