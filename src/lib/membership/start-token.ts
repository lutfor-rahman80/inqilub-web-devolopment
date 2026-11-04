import { createHmac, timingSafeEqual } from "node:crypto";
import { MIN_FILL_MS, START_TOKEN_MAX_AGE_MS, type StartToken } from "./timing";

/**
 * Server-signed "form opened" token for the public membership application.
 *
 * The server issues { issuedAt, sig } bound to the form's submission token
 * (a UUID that is also the idempotency key: one submission token can create at
 * most one application). On submit the server checks the signature and uses
 * ITS OWN clock: at least MIN_FILL_MS must have passed since the token was
 * issued. A script therefore has to fetch a fresh signed token for every new
 * application and wait, instead of simply claiming "startedAt: 0".
 *
 * Pure functions (the secret is passed in) so they can be unit tested.
 */

export { MIN_FILL_MS, START_TOKEN_MAX_AGE_MS, type StartToken };
export type StartCheck = "ok" | "too_fast" | "expired" | "invalid";

function mac(secret: string, submissionToken: string, issuedAt: number): string {
  return createHmac("sha256", secret)
    .update(`ijs-membership-start:v1:${submissionToken.toLowerCase()}:${issuedAt}`)
    .digest("base64url");
}

export function signStartToken(secret: string, submissionToken: string, now: number = Date.now()): StartToken {
  const issuedAt = Math.floor(now);
  return { issuedAt, sig: mac(secret, submissionToken, issuedAt) };
}

export function checkStartToken(
  secret: string,
  submissionToken: string,
  token: unknown,
  now: number = Date.now(),
): StartCheck {
  if (!token || typeof token !== "object") return "invalid";
  const { issuedAt, sig } = token as Partial<StartToken>;
  if (typeof issuedAt !== "number" || !Number.isSafeInteger(issuedAt) || typeof sig !== "string" || sig.length > 100) {
    return "invalid";
  }
  const expected = Buffer.from(mac(secret, submissionToken, issuedAt));
  const given = Buffer.from(sig);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return "invalid";
  const age = now - issuedAt;
  if (age < MIN_FILL_MS) return "too_fast";
  if (age > START_TOKEN_MAX_AGE_MS) return "expired";
  return "ok";
}
