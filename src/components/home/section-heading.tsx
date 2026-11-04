import type { ReactNode } from "react";

/**
 * Homepage section heading (design v2): gold-star eyebrow in gold-800 (AA on
 * cream, white and sage), forest-800 serif h2, optional intro. `action`
 * (e.g. a "see all" link) sits beside a start-aligned heading on wider screens.
 */
export function HomeHeading({
  id,
  eyebrow,
  title,
  intro,
  align = "center",
  action,
  className = "mb-10",
}: {
  id: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  align?: "center" | "start";
  action?: ReactNode;
  className?: string;
}) {
  const centered = align === "center" && !action;
  const heading = (
    <div className={`min-w-0 max-w-3xl ${centered ? "mx-auto text-center" : ""}`}>
      {eyebrow && (
        <p className={`divider-star mb-2 text-sm font-semibold tracking-wide text-gold-800 ${centered ? "justify-center" : ""}`}>{eyebrow}</p>
      )}
      <h2 id={id} className="text-3xl font-bold text-forest-800 wrap-anywhere sm:text-4xl">{title}</h2>
      {intro && <p className="mt-3 text-lg text-muted">{intro}</p>}
    </div>
  );
  if (!action) return <div className={className}>{heading}</div>;
  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      {heading}
      <div className="shrink-0">{action}</div>
    </div>
  );
}

/** Text of the first sentence (ends in “।”, “.”, “!” or “?”), or the whole text. */
export function firstSentenceOf(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const match = flat.match(/^.+?[।.!?](?=\s|$)/u);
  return match ? match[0] : flat;
}
