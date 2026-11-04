import { ArrowLeft, SearchX } from "lucide-react";
import { LinkButton } from "@/components/ui/button";

/**
 * notFound() inside the admin panel: rendered within the panel layout, so the
 * sidebar stays and the way back leads to the relevant admin list (not to the
 * public website). Used for missing ids, stale links and Back after a delete.
 */
export function AdminPanelNotFound({
  title = "পৃষ্ঠাটি খুঁজে পাওয়া যায়নি",
  body = "যে তথ্য বা পৃষ্ঠাটি খুঁজছেন সেটি হয়তো মুছে ফেলা হয়েছে, অথবা লিংকটি সঠিক নয়।",
  backHref = "/admin",
  backLabel = "ড্যাশবোর্ডে ফিরে যান",
}: {
  title?: string;
  body?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <section
      aria-labelledby="panel-not-found-title"
      className="mx-auto mt-4 max-w-xl rounded-[var(--radius-card)] border border-line bg-white p-6 text-center shadow-[var(--shadow-card)] sm:mt-8 sm:p-8"
      data-testid="admin-not-found"
    >
      <SearchX className="mx-auto size-10 text-gold-700" aria-hidden="true" />
      <h1 id="panel-not-found-title" className="mt-3 text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-muted">{body}</p>
      <LinkButton href={backHref} className="mt-5">
        <ArrowLeft className="size-5" aria-hidden="true" />
        {backLabel}
      </LinkButton>
    </section>
  );
}
