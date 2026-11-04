import "server-only";
import { assertPermission, type Permission, type Staff } from "@/lib/auth";

export const DENIED = "এই কাজের অনুমতি আপনার নেই।";

/**
 * For server actions: the signed-in staff member when they hold any of the
 * permissions, otherwise null. The database checks the same permission again
 * (RLS / function checks), so this is the first of two independent gates.
 */
export async function staffWith(...anyOf: Permission[]): Promise<Staff | null> {
  try {
    return await assertPermission(...anyOf);
  } catch {
    return null;
  }
}
