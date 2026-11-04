"use client";

import { AdminCoreError } from "@/components/admin/route-states";

export default function PressAdminError({ error, retry, reset }: { error: unknown; retry?: () => void; reset?: () => void }) {
  return <AdminCoreError error={error} retry={retry ?? reset} />;
}
