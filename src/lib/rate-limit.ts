import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/server-env";

/**
 * Header that carries the real client IP and CANNOT be set by the visitor.
 * On Vercel the platform overwrites x-vercel-forwarded-for / x-real-ip, so
 * they are trustworthy there. Elsewhere set TRUSTED_IP_HEADER to the header
 * your reverse proxy overwrites. Client-controlled values such as the first
 * entry of X-Forwarded-For are never used.
 */
function trustedIpHeader(): string | null {
  if (process.env.TRUSTED_IP_HEADER) return process.env.TRUSTED_IP_HEADER.toLowerCase();
  if (process.env.VERCEL) return "x-vercel-forwarded-for";
  return null;
}

/** Salted hash of the visitor's IP. Raw IPs are never stored. */
export async function visitorKey(): Promise<string> {
  const header = trustedIpHeader();
  let ip = "unknown"; // no trusted header (local dev): one shared bucket
  if (header) {
    const value = (await headers()).get(header);
    // A proxy appends to forwarded lists; the right-most entry is the one it added.
    const last = value?.split(",").pop()?.trim();
    if (last) ip = last;
  }
  return createHash("sha256").update(`${serverEnv.rateLimitSalt}:${ip}`).digest("hex").slice(0, 32);
}

/**
 * Fixed-window rate limit stored in Postgres. Returns true when the request
 * is allowed. Fails open (allows) if the database call itself errors, so a
 * transient problem never blocks legitimate applicants; the other abuse
 * protections (honeypot, timing, idempotency, DB constraints) still apply.
 */
export async function rateLimit(bucket: string, max: number, windowSeconds: number): Promise<boolean> {
  const key = await visitorKey();
  // Local development/testing only: many automated logins share one IP.
  const multiplier = process.env.NODE_ENV === "production" ? 1 : Number(process.env.RATE_LIMIT_DEV_MULTIPLIER ?? 1) || 1;
  const { data, error } = await createAdminClient().rpc("check_rate_limit", {
    p_bucket: bucket,
    p_key: key,
    p_max: max * multiplier,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("rate limit check failed", error.message);
    return true;
  }
  return data === true;
}
