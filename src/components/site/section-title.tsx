import type { ReactNode } from "react";

/**
 * Section heading for public pages (design v2): gold-star eyebrow in
 * gold-800 (AA on cream, white and sage), forest-800 serif h2, optional
 * intro. Takes an id so sections can use aria-labelledby.
 */
export function SectionTitle({
  id,
  eyebrow,
  title,
  intro,
  align = "center",
  className = "mb-10",
}: {
  id: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  align?: "center" | "start";
  className?: string;
}) {
  const centered = align === "center";
  return (
    <div className={`max-w-3xl ${centered ? "mx-auto text-center" : ""} ${className}`}>
      {eyebrow && (
        <p className={`divider-star mb-2 text-sm font-semibold tracking-wide text-gold-800 ${centered ? "justify-center" : ""}`}>
          {eyebrow}
        </p>
      )}
      <h2 id={id} className="text-3xl font-bold text-forest-800 wrap-anywhere sm:text-4xl">
        {title}
      </h2>
      {intro && <p className="mt-3 text-lg text-muted">{intro}</p>}
    </div>
  );
}
