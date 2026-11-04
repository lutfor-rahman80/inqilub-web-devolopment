import type { ComponentProps } from "react";

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)] ${className}`} {...props} />;
}

export function SectionHeading({ eyebrow, title, intro, align = "center" }: { eyebrow?: string; title: string; intro?: string; align?: "center" | "start" }) {
  return (
    <div className={`mb-10 max-w-3xl ${align === "center" ? "mx-auto text-center" : ""}`}>
      {eyebrow && (
        <p className={`divider-star mb-2 text-sm font-semibold tracking-wide ${align === "center" ? "justify-center" : ""}`}>
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl font-bold sm:text-4xl">{title}</h2>
      {intro && <p className="mt-3 text-lg text-muted">{intro}</p>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-white/60 px-6 py-12 text-center">
      <p className="font-serif text-xl font-semibold text-brand-900">{title}</p>
      {children && <div className="mt-2 text-muted">{children}</div>}
    </div>
  );
}

/** Standard page width + gutters (16px on phones). */
export const container = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8";
