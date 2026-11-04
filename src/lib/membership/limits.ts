import "server-only";
import { createHash, createHmac } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/server-env";

/**
 * Extra abuse limits for the public membership forms, on top of the per-visitor
 * limit in src/lib/rate-limit.ts (whose visitor key depends on proxy headers):
 * limits keyed on WHAT is being asked for (a mobile number, an email address)
 * or a site-wide ceiling, which a changing IP address cannot get around.
 * Values are stored only as salted hashes, like visitor IPs.
 */
async function check(bucket: string, value: string, max: number, windowSeconds: number): Promise<boolean> {
  const key = createHash("sha256").update(`${serverEnv.rateLimitSalt}:${bucket}:${value}`).digest("hex").slice(0, 32);
  // Local development/testing only (same switch as src/lib/rate-limit.ts).
  const multiplier = process.env.NODE_ENV === "production" ? 1 : Number(process.env.RATE_LIMIT_DEV_MULTIPLIER ?? 1) || 1;
  const { data, error } = await createAdminClient().rpc("check_rate_limit", {
    p_bucket: bucket,
    p_key: key,
    p_max: max * multiplier,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("rate limit check failed", bucket, error.message);
    return true; // fail open, like rateLimit(): the other protections still apply
  }
  return data === true;
}

/** Site-wide ceiling for new applications (a real day brings a handful). */
export const applyGlobalAllowed = () => check("apply-global", "all", 40, 3600);

/** Status look-ups per mobile number: stops trying every tracking number against one known mobile. */
export const statusLookupAllowed = (mobile: string) => check("status-mobile", mobile, 15, 24 * 3600);

/** "Application received" emails per recipient address (the address is not verified). */
export const receiptEmailAllowed = (email: string) => check("apply-email", email.toLowerCase(), 3, 24 * 3600);

/** Key for the signed "form opened" token, derived from the server secret. */
export function startTokenSecret(): string {
  return createHmac("sha256", serverEnv.supabaseSecretKey).update("ijs-membership-start-token-v1").digest("hex");
}
