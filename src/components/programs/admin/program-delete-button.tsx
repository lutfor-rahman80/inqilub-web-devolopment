"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteProgram } from "@/app/admin/(panel)/programs/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

/** "Delete" for one program, with confirmation. */
export function ProgramDeleteButton({ id, title, label = "মুছুন" }: { id: string; title: string; label?: string }) {
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
        <Trash2 className="size-4" aria-hidden="true" /> {label}
      </Button>
      {open && (
        <ConfirmDialog
          title="কর্মসূচিটি মুছে ফেলবেন?"
          confirmLabel="হ্যাঁ, মুছে ফেলুন"
          onCancel={() => setOpen(false)}
          onConfirm={async () => {
            const r = await deleteProgram(id);
            if (!r.ok) return r.error;
            setOpen(false);
            router.replace("/admin/programs?deleted=1");
            router.refresh();
            return null;
          }}
        >
          <p>
            “<span className="font-semibold">{title}</span>” স্থায়ীভাবে মুছে যাবে এবং ওয়েবসাইট থেকেও সরে যাবে। এটি আর ফিরিয়ে আনা যাবে না।
          </p>
          <p className="text-muted">
            এর ছবিগুলো গ্যালারিতে থেকে যাবে (শুধু কর্মসূচির সাথে সংযোগ মুছে যাবে)। শুধু লুকাতে চাইলে মুছে না ফেলে “ওয়েবসাইটে প্রকাশ করুন” থেকে টিক তুলে দিন।
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
