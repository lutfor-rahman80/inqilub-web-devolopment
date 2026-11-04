import type { ComponentProps, ReactNode } from "react";

export const inputClass =
  "block w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-base text-ink placeholder:text-stone-400 " +
  "focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/25 disabled:bg-stone-50 " +
  "aria-[invalid=true]:border-red-600 aria-[invalid=true]:ring-red-600/20";

type FieldProps = {
  id: string;
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  /**
   * Marker after the label of a field that is not required, in the page's
   * language (default "(ঐচ্ছিক)"; English forms pass "(optional)"; null hides it).
   */
  optionalLabel?: ReactNode;
  children: ReactNode;
};

/** Label + control + hint + error, wired for screen readers (aria-describedby on the control is the caller's job: use `${id}-hint` / `${id}-error`). */
export function Field({ id, label, required, hint, error, optionalLabel = "(ঐচ্ছিক)", children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block font-medium text-ink">
        {label}
        {required ? (
          <span className="ms-1 text-red-700" aria-hidden="true">*</span>
        ) : optionalLabel ? (
          <span className="ms-2 text-sm font-normal text-muted">{optionalLabel}</span>
        ) : null}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm text-muted">{hint}</p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-red-700">{error}</p>
      )}
    </div>
  );
}

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}
export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea rows={3} {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}
export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={`${inputClass} pe-8 ${props.className ?? ""}`} />;
}

export function Alert({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: ReactNode }) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-brand-200 bg-brand-50 text-brand-800",
    info: "border-sky-200 bg-sky-50 text-sky-900",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 ${styles}`}>
      {children}
    </div>
  );
}
