"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Accessible modal on the native <dialog> element: focus is trapped while
 * open, Esc closes it (unless busy), focus returns to the opener on close.
 *
 * Initial focus: the element marked `data-autofocus` (a safe "বাতিল" button or
 * the field to fill in). React's autoFocus cannot be used here: it fires on
 * mount, before showModal() moves focus to the first focusable element.
 */
export function Modal({
  title,
  onClose,
  busy = false,
  children,
  size = "md",
}: {
  title: string;
  onClose: () => void;
  busy?: boolean;
  children: ReactNode;
  size?: "sm" | "md";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const busyRef = useRef(busy);
  const titleId = useId();
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement as HTMLElement | null;
    if (dialog && !dialog.open) {
      dialog.showModal();
      const target = dialog.querySelector<HTMLElement>("[data-autofocus]");
      if (target && !target.hasAttribute("disabled")) target.focus();
    }
    return () => {
      if (dialog?.open) dialog.close();
      if (opener && opener.isConnected) opener.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (!busyRef.current) onClose();
      }}
      className={`m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] overflow-y-auto rounded-2xl bg-white p-0 text-ink shadow-[var(--shadow-lift)] backdrop:bg-black/55 ${
        size === "sm" ? "max-w-md" : "max-w-xl"
      }`}
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
      <div className="px-5 py-4">{children}</div>
    </dialog>
  );
}
