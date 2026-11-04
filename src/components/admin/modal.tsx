"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Accessible modal on the native <dialog> element: the rest of the page is
 * inert while it is open, Esc closes it (unless `busy`), and focus returns to
 * the element that opened it.
 */
export function AdminModal({
  title,
  onClose,
  busy = false,
  children,
  size = "md",
  description,
}: {
  title: string;
  onClose: () => void;
  busy?: boolean;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  description?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const busyRef = useRef(busy);
  const onCloseRef = useRef(onClose);
  const uid = useId();
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;

  useEffect(() => {
    busyRef.current = busy;
    onCloseRef.current = onClose;
  }, [busy, onClose]);

  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement as HTMLElement | null;
    if (dialog && !dialog.open) dialog.showModal();
    // React's autoFocus runs before showModal(), which then moves focus to the
    // first focusable element (the close button); honour data-autofocus instead.
    dialog?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => {
      if (dialog?.open) dialog.close();
      if (opener && opener.isConnected) opener.focus();
    };
  }, []);

  const width = size === "sm" ? "max-w-md" : size === "lg" ? "max-w-3xl" : "max-w-xl";
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        if (!busyRef.current) onCloseRef.current();
      }}
      className={`m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] overflow-y-auto rounded-2xl bg-white p-0 text-ink shadow-[var(--shadow-lift)] backdrop:bg-black/55 ${width}`}
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line bg-white px-5 py-3">
        <h2 id={titleId} className="pt-1.5 text-xl font-bold">{title}</h2>
        <button
          type="button"
          onClick={() => !busy && onClose()}
          disabled={busy}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-brand-900 hover:bg-brand-50 disabled:opacity-50"
          aria-label="বন্ধ করুন"
        >
          <X className="size-6" aria-hidden="true" />
        </button>
      </div>
      <div className="px-5 py-4">
        {description && <div id={descId} className="mb-4 text-muted">{description}</div>}
        {children}
      </div>
    </dialog>
  );
}
