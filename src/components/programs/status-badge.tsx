import type { ProgramStatus } from "@/lib/programs/status";

/** Badge colours per computed status (all pairs pass WCAG AA). */
export const STATUS_STYLE: Record<ProgramStatus, string> = {
  ongoing: "bg-forest-600 text-white",
  upcoming: "bg-gold-100 text-gold-800",
  completed: "bg-sage-100 text-forest-800",
  postponed: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
  cancelled: "bg-stone-100 text-stone-700 ring-1 ring-inset ring-stone-300",
};

export function StatusBadge({ status, label, className = "" }: { status: ProgramStatus; label: string; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${STATUS_STYLE[status]} ${className}`}>
      {label}
    </span>
  );
}
