"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, MailOpen, Trash2 } from "lucide-react";
import { deleteMessage, setMessageRead } from "@/app/admin/(panel)/messages/actions";
import { Alert } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { PendingButton } from "@/components/admin/pending-button";

/**
 * Read/unread toggle and delete for one contact message. Opening an unread
 * message marks it read once (the toggle can mark it unread again).
 */
export function MessageActions({ id, isRead, subject }: { id: string; isRead: boolean; subject: string }) {
  const router = useRouter();
  const [read, setRead] = useState(isRead);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const autoMarked = useRef(false);

  useEffect(() => {
    if (isRead || autoMarked.current) return;
    autoMarked.current = true;
    setMessageRead(id, true).then(
      (r) => {
        if (r.ok) {
          setRead(true);
          router.refresh();
        }
      },
      () => undefined,
    );
  }, [id, isRead, router]);

  function toggle() {
    const next = !read;
    setError(null);
    startTransition(async () => {
      try {
        const r = await setMessageRead(id, next);
        if (!r.ok) {
          setError(r.error);
          return;
        }
        setRead(next);
        setNotice(next ? "বার্তাটি পঠিত হিসেবে চিহ্নিত হয়েছে।" : "বার্তাটি অপঠিত হিসেবে চিহ্নিত হয়েছে।");
        router.refresh();
      } catch {
        setError("পরিবর্তন করা যায়নি। আবার চেষ্টা করুন।");
      }
    });
  }

  return (
    <div className="space-y-3">
      {error && <Alert>{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        <PendingButton
          variant="outline"
          pending={pending}
          onClick={toggle}
          data-testid="toggle-read"
          icon={read ? <Mail className="size-5" aria-hidden="true" /> : <MailOpen className="size-5" aria-hidden="true" />}
        >
          {read ? "অপঠিত হিসেবে চিহ্নিত করুন" : "পঠিত হিসেবে চিহ্নিত করুন"}
        </PendingButton>
        <Button variant="ghost" className="border border-line bg-white text-red-700 hover:bg-red-50" onClick={() => setConfirmDelete(true)} disabled={pending}>
          <Trash2 className="size-5" aria-hidden="true" /> মুছে ফেলুন
        </Button>
      </div>
      <p className="sr-only" role="status" aria-live="polite">{notice}</p>

      {confirmDelete && (
        <ConfirmDialog
          title="বার্তাটি মুছে ফেলবেন?"
          confirmLabel="হ্যাঁ, মুছে ফেলুন"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            const r = await deleteMessage(id);
            if (!r.ok) return r.error;
            router.push("/admin/messages?deleted=1");
            return null;
          }}
        >
          <p>
            “<span className="font-semibold">{subject}</span>” বার্তাটি স্থায়ীভাবে মুছে যাবে। এটি আর ফিরিয়ে আনা যাবে না।
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}
