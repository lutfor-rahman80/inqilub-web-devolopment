"use client";

import { useState, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/field";
import { AdminModal } from "./modal";

/**
 * "Are you sure?" dialog. `onConfirm` returns an error message to show (the
 * dialog stays open) or null on success (the caller closes it). The safe
 * choice (cancel) has the initial focus.
 */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  tone = "danger",
  onConfirm,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
  onConfirm: () => Promise<string | null>;
  onCancel: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <AdminModal title={title} onClose={onCancel} busy={pending} size="sm">
      <div className="space-y-3">{children}</div>
      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={pending} data-autofocus className="border border-line">
          বাতিল
        </Button>
        <Button
          variant={tone}
          disabled={pending}
          aria-busy={pending}
          onClick={async () => {
            setPending(true);
            setError(null);
            try {
              const message = await onConfirm();
              if (message) setError(message);
            } catch {
              setError("একটি সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
            } finally {
              setPending(false);
            }
          }}
        >
          {pending && <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
          {confirmLabel}
        </Button>
      </div>
    </AdminModal>
  );
}
