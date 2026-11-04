import type { ComponentProps, ReactNode } from "react";

/** Large, touch-friendly checkbox with label and optional hint. */
export function CheckField({
  id,
  label,
  hint,
  error,
  className = "",
  ...input
}: Omit<ComponentProps<"input">, "type" | "id"> & {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
}) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-line bg-white px-3 py-2.5 hover:bg-brand-50/60 ${
          input.disabled ? "cursor-not-allowed opacity-70" : ""
        }`}
      >
        <input
          id={id}
          type="checkbox"
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className="mt-1 size-5 shrink-0 accent-brand-700"
          {...input}
        />
        <span>
          <span className="block font-medium text-ink">{label}</span>
          {hint && (
            <span id={`${id}-hint`} className="block text-sm text-muted">
              {hint}
            </span>
          )}
        </span>
      </label>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
