"use client";

import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Error-boundary body for the admin-core pages (no technical details shown). */
export function AdminCoreError({ error, retry }: { error: unknown; retry?: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="mx-auto max-w-xl rounded-[var(--radius-card)] border border-line bg-white p-6 text-center shadow-[var(--shadow-card)]">
      <TriangleAlert className="mx-auto size-10 text-gold-600" aria-hidden="true" />
      <h1 className="mt-3 text-2xl font-bold">পৃষ্ঠাটি লোড করা যায়নি</h1>
      <p className="mt-2 text-muted">একটি সাময়িক সমস্যা হয়েছে। আবার চেষ্টা করুন; সমস্যা থেকে গেলে কিছুক্ষণ পর আবার আসুন।</p>
      {retry && (
        <Button className="mt-5" onClick={retry}>
          <RefreshCw className="size-5" aria-hidden="true" />
          আবার চেষ্টা করুন
        </Button>
      )}
    </div>
  );
}
