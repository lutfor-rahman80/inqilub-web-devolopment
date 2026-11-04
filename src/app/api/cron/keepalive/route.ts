import { createHash, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/server-env";
import { createPublicClient } from "@/lib/supabase/server";

/**
 * Daily keep-alive for the Supabase free tier (projects pause after a week
 * without database activity). Called by Vercel Cron (see vercel.json), which
 * sends "Authorization: Bearer <CRON_SECRET>".
 */
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/** Constant-time comparison (hashing first makes the lengths equal). */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function GET(request: Request) {
  const secret = serverEnv.cronSecret;
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  // A tiny read through the public (anon) client is enough to count as activity.
  const { count, error } = await createPublicClient()
    .from("activity_categories")
    .select("id", { count: "exact", head: true });
  if (error) {
    console.error("keepalive query failed", error.message);
    return Response.json({ ok: false, error: "database unavailable" }, { status: 503, headers: NO_STORE });
  }

  return Response.json({ ok: true, categories: count ?? 0, at: new Date().toISOString() }, { headers: NO_STORE });
}
