"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteAnnouncement } from "@/app/admin/(panel)/announcements/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

/** "Delete" for one announcement in the admin list, with confirmation. */
export function AnnouncementDeleteButton({ id, title }: { id: string; title: string }) {
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
          title="ঘোষণাটি মুছে ফেলবেন?"
          confirmLabel="হ্যাঁ, মুছে ফেলুন"
          onCancel={() => setOpen(false)}
          onConfirm={async () => {
            const r = await deleteAnnouncement(id);
            if (!r.ok) return r.error;
            setOpen(false);
            router.replace("/admin/announcements?deleted=1");
            router.refresh();
            return null;
          }}
        >
          <p>
            “<span className="font-semibold">{title}</span>” স্থায়ীভাবে মুছে যাবে এবং ওয়েবসাইট থেকেও সরে যাবে। এটি আর ফিরিয়ে আনা যাবে না।
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
