import { AdminPanelNotFound } from "@/components/admin/panel-not-found";

/** A deleted or mistyped announcement: stay in the panel, back to the list. */
export default function AnnouncementNotFound() {
  return (
    <AdminPanelNotFound
      title="ঘোষণাটি খুঁজে পাওয়া যায়নি"
      body="ঘোষণাটি হয়তো মুছে ফেলা হয়েছে, অথবা লিংকটি সঠিক নয়। ঘোষণার তালিকা থেকে আবার খুঁজে দেখুন।"
      backHref="/admin/announcements"
      backLabel="সব ঘোষণা"
    />
  );
}
