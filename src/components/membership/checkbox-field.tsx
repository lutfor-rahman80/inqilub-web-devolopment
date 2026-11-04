import type { ReactNode } from "react";

/** Large, touch-friendly checkbox with label, optional hint and error (wired for screen readers). */
export function CheckboxField({
  id,
  name,
  checked,
  onChange,
  label,
  hint,
  error,
  required,
  disabled,
  tone = "plain",
}: {
  id: string;
  name?: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  tone?: "plain" | "boxed";
}) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div
      className={
        tone === "boxed"
          ? `rounded-xl border p-4 ${error ? "border-red-300 bg-red-50/40" : "border-line bg-white"} ${disabled ? "opacity-70" : ""}`
          : ""
      }
    >
      <label htmlFor={id} className={`flex min-h-11 items-start gap-3 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          className="mt-1 size-5 shrink-0 cursor-[inherit] rounded border-line accent-brand-700"
        />
        <span className="font-medium text-ink">
          {label}
          {required && (
            <span className="ms-1 text-red-700" aria-hidden="true">*</span>
          )}
        </span>
      </label>
      {hint && (
        <p id={`${id}-hint`} className="ms-8 text-sm text-muted">{hint}</p>
      )}
      {error && (
        <p id={`${id}-error`} className="ms-8 mt-1 text-sm font-medium text-red-700">{error}</p>
      )}
    </div>
  );
}
