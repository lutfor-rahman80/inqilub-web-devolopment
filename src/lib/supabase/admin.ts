import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";
import { serverEnv } from "@/lib/server-env";
import type { Database } from "./database.types";

/**
 * Privileged client (secret key) — bypasses Row-Level Security.
 *
 * Use ONLY for:
 *  - server-only RPCs (submit_membership_application, check_application_status,
 *    application_contact, check_rate_limit, log_account_event — the latter
 *    only after a users.manage / own-account check and a successful Auth call)
 *  - inserting contact messages / notification logs
 *  - Auth admin API (creating staff accounts) AFTER checking `users.manage`
 *  - storage maintenance (folder sync / move) AFTER checking `gallery.manage`
 *
 * Never import this from a Client Component. Never use it for reads that are
 * returned to a user without an explicit permission check first.
 */
export function createAdminClient() {
  return createClient<Database>(SUPABASE_URL, serverEnv.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
