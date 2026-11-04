import "server-only";
import { assertPermission, getStaff, type Permission, type Staff } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export const DENIED = "এই কাজের অনুমতি আপনার নেই।";

/**
 * First gate of every admin-module server action: the signed-in, active staff
 * member when they hold any of the permissions, otherwise null. The database
 * checks the same permission again (RLS / function checks).
 */
export async function staffWith(...anyOf: Permission[]): Promise<Staff | null> {
  try {
    return await assertPermission(...anyOf);
  } catch {
    return null;
  }
}

/** Any signed-in, active staff member (own-account actions). */
export async function anyStaff(): Promise<Staff | null> {
  return getStaff();
}

/** Server-side rate limiter for admin actions */
export async function checkActionRateLimit(
  action: string,
  maxAttempts: number = 10,
  windowSeconds: number = 60
): Promise<boolean> {
  return rateLimit(`admin:${action}`, maxAttempts, windowSeconds);
}

