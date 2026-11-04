"use client";

import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "./modal";

export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const [pending, setPending] = useState(false);
  return (
    <Modal title={title} onClose={onCancel} busy={pending} size="sm" labelledBy="confirm-dialog-title">
      <p>{children}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={pending} data-autofocus>
          বাতিল
        </Button>
        <Button
          variant="danger"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            try {
              await onConfirm();
            } finally {
              setPending(false);
            }
          }}
        >
          {pending && <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
