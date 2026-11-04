type Tone = "green" | "amber" | "blue" | "red" | "gray" | "gold";

const TONES: Record<Tone, string> = {
  green: "bg-brand-100 text-brand-800 ring-brand-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  blue: "bg-sky-50 text-sky-800 ring-sky-200",
  red: "bg-red-50 text-red-800 ring-red-200",
  gray: "bg-stone-100 text-stone-700 ring-stone-200",
  gold: "bg-gold-100 text-gold-800 ring-gold-400/40",
};

export function Badge({ tone = "gray", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium ring-1 ring-inset ${TONES[tone]}`}>
      {children}
    </span>
  );
}
