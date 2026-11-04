import { requirePagePermission } from "@/lib/auth";

/**
 * Permission gate for the whole section, checked in the layout — outside the
 * section's loading boundary — so a user without the permission gets a real
 * HTTP redirect instead of a skeleton that is then redirected client-side.
 * Each page checks again itself (getStaff is cached per request).
 */
export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  await requirePagePermission("messages.view");
  return children;
}
