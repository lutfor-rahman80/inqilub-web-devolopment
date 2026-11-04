import "server-only";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import type { ProgramChoice } from "@/components/press/admin/press-form";

/** Programs for the "related program" select (newest first). */
export async function programChoices(): Promise<ProgramChoice[]> {
  const db = await createClient();
  const { data } = await db
    .from("programs")
    .select("id, title_bn, starts_on, is_published")
    .order("starts_on", { ascending: false })
    .limit(500);
  return (data ?? []).map((p) => ({
    id: p.id,
    label: `${p.title_bn} — ${formatDate(p.starts_on)}${p.is_published ? "" : " (খসড়া)"}`,
  }));
}
