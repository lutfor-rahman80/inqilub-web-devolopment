"use client";

import { AdminRouteError } from "@/components/membership/admin/route-error";

export default function MembershipAdminError({ error, retry, reset }: { error: unknown; retry?: () => void; reset?: () => void }) {
  return <AdminRouteError error={error} retry={retry ?? reset} />;
}
