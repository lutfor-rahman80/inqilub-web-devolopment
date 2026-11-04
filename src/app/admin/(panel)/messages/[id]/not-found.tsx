import { AdminPanelNotFound } from "@/components/admin/panel-not-found";

/** A deleted or mistyped message: stay in the panel, back to the inbox. */
export default function MessageNotFound() {
  return (
    <AdminPanelNotFound
      title="বার্তাটি খুঁজে পাওয়া যায়নি"
      body="বার্তাটি হয়তো মুছে ফেলা হয়েছে, অথবা লিংকটি সঠিক নয়। বার্তার তালিকা থেকে আবার খুঁজে দেখুন।"
      backHref="/admin/messages"
      backLabel="সব বার্তা"
    />
  );
}
