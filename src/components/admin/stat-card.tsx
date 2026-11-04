import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { bn } from "@/lib/format";

type Tone = "green" | "amber" | "blue" | "gold" | "gray";

const TONES: Record<Tone, string> = {
  green: "bg-brand-100 text-brand-800",
  amber: "bg-amber-100 text-amber-800",
  blue: "bg-sky-100 text-sky-800",
  gold: "bg-gold-100 text-gold-700",
  gray: "bg-stone-100 text-stone-700",
};

/** Dashboard number tile; the whole tile links to the related page. */
export function StatCard({
  label,
  value,
  href,
  icon: Icon,
  tone = "green",
  note,
  testId,
}: {
  label: string;
  value: number | null;
  href: string;
  icon: LucideIcon;
  tone?: Tone;
  note?: string;
  testId?: string;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className="group flex flex-col items-start gap-2 rounded-[var(--radius-card)] border border-line bg-white p-3.5 shadow-[var(--shadow-card)] transition-colors hover:border-brand-200 hover:bg-brand-50/40 sm:min-h-28 sm:flex-row sm:gap-3 sm:p-4"
    >
      <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl sm:size-11 ${TONES[tone]}`}>
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-muted">{label}</span>
        <span className="block font-serif text-3xl font-bold leading-tight text-brand-900" data-testid={testId ? `${testId}-value` : undefined}>
          {value === null ? "—" : bn(value)}
        </span>
        {note && <span className="block text-sm text-muted">{note}</span>}
      </span>
    </Link>
  );
}
