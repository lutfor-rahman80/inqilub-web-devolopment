/**
 * Timing rules for the public application form, shared by the browser (which
 * waits instead of showing an error) and the server (which enforces them with
 * a signed token, see start-token.ts).
 */

/** Minimum time between opening the form (server-signed) and submitting it. */
export const MIN_FILL_MS = 4000;
/** A signed start token older than this is refused (the form asks for a new one). */
export const START_TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type StartToken = { issuedAt: number; sig: string };
