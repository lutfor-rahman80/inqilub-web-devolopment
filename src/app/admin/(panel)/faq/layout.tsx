import { requirePagePermission } from "@/lib/auth";

/**
 * Permission gate for the whole FAQ section, checked in the layout — outside
 * the section's loading boundary — so a user without the permission gets a
 * real redirect instead of a skeleton. Each page checks again (cached per request).
 */
export default async function FaqAdminLayout({ children }: { children: React.ReactNode }) {
  await requirePagePermission("content.manage");
  return children;
}
