import { ArrowLeft, SearchX } from "lucide-react";
import { LinkButton } from "@/components/ui/button";

/**
 * Shown inside the admin panel (sidebar kept) when an application or member
 * record does not exist any more — a stale link, or Back after deleting it.
 */
export function AdminRecordNotFound({
  title,
  body,
  backHref,
  backLabel,
}: {
  title: string;
  body: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <section
      aria-labelledby="record-not-found-title"
      className="mx-auto mt-4 max-w-xl rounded-[var(--radius-card)] border border-line bg-white p-6 text-center shadow-[var(--shadow-card)] sm:mt-8 sm:p-8"
      data-testid="admin-record-not-found"
    >
      <SearchX className="mx-auto size-10 text-gold-700" aria-hidden="true" />
      <h1 id="record-not-found-title" className="mt-3 text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-muted">{body}</p>
      <LinkButton href={backHref} className="mt-5">
        <ArrowLeft className="size-5" aria-hidden="true" />
        {backLabel}
      </LinkButton>
    </section>
  );
}
