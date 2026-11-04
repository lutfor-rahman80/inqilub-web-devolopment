"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deletePress } from "@/app/admin/(panel)/notice/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

/** "Delete" for one press item, with confirmation. */
export function PressDeleteButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="min-h-11 text-red-700 hover:bg-red-50"
        onClick={() => setOpen(true)}
        aria-label={`“${title}” মুছে ফেলুন`}
      >
        <Trash2 className="size-4" aria-hidden="true" /> মুছুন
      </Button>
      {open && (
        <ConfirmDialog
          title="প্রতিবেদনটি মুছে ফেলবেন?"
          confirmLabel="হ্যাঁ, মুছে ফেলুন"
          onCancel={() => setOpen(false)}
          onConfirm={async () => {
            const r = await deletePress(id);
            if (!r.ok) return r.error;
            setOpen(false);
            router.replace("/admin/notice?deleted=1");
            router.refresh();
            return null;
          }}
        >
          <p>
            “<span className="font-semibold">{title}</span>” এই ওয়েবসাইটের তালিকা থেকে স্থায়ীভাবে মুছে যাবে (মূল সংবাদমাধ্যমের পাতায় কোনো পরিবর্তন হবে না)।
          </p>
          <p className="text-muted">শুধু লুকাতে চাইলে মুছে না ফেলে “ওয়েবসাইটে প্রকাশ করুন” থেকে টিক তুলে দিন।</p>
        </ConfirmDialog>
      )}
    </>
  );
}
