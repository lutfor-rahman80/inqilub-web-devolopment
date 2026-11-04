import { AdminPanelNotFound } from "@/components/admin/panel-not-found";

/** A deleted or mistyped program: stay in the panel, back to the list. */
export default function ProgramNotFound() {
  return (
    <AdminPanelNotFound
      title="কর্মসূচিটি খুঁজে পাওয়া যায়নি"
      body="কর্মসূচিটি হয়তো মুছে ফেলা হয়েছে, অথবা লিংকটি সঠিক নয়। কর্মসূচির তালিকা থেকে আবার খুঁজে দেখুন।"
      backHref="/admin/programs"
      backLabel="সব কর্মসূচি"
    />
  );
}
