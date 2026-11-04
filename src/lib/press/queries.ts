import "server-only";
import { createPublicClient } from "@/lib/supabase/server";
import { PRESS_PAGE_SIZE, type PressKind } from "./schemas";

/**
 * Public press reads (anonymous client: Row-Level Security returns only
 * published items, and the embedded program only when it is published).
 */

export const PRESS_COLUMNS =
  "id, kind, title_bn, title_en, outlet_bn, outlet_en, url, published_on, summary_bn, summary_en, program:programs(slug, title_bn, title_en)" as const;

function published(count = false) {
  return createPublicClient()
    .from("press_items")
    .select(PRESS_COLUMNS, count ? { count: "exact" } : undefined)
    .eq("is_published", true);
}

export async function getPressPage({ kind, page }: { kind: PressKind | null; page: number }) {
  const filtered = () => (kind ? published(true).eq("kind", kind) : published(true));
  const from = (Math.max(1, page) - 1) * PRESS_PAGE_SIZE;
  const { data, error, count } = await filtered()
    .order("published_on", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(from, from + PRESS_PAGE_SIZE - 1);
  // Out-of-range page: PostgREST answers 416 (PGRST103) without a count.
  if (error && error.code === "PGRST103") {
    const { count: total } = await filtered().limit(1);
    return { items: [], total: total ?? 0 };
  }
  if (error) {
    console.error("[press] list:", error.message);
    throw new Error("Failed to load press items");
  }
  return { items: data ?? [], total: count ?? 0 };
}
export type PressRow = Awaited<ReturnType<typeof getPressPage>>["items"][number];

/** Published press items about one program (newest first). */
export async function getPressForProgram(programId: string, limit = 20): Promise<PressRow[]> {
  const { data, error } = await published()
    .eq("program_id", programId)
    .order("published_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[press] program:", error.message);
    throw new Error("Failed to load press items");
  }
  return data ?? [];
}

/** Item counts per kind (for the filter tabs). */
export async function getPressCounts(): Promise<Record<PressKind | "all", number>> {
  const { data, error } = await createPublicClient().from("press_items").select("kind").eq("is_published", true).limit(10000);
  if (error) {
    console.error("[press] counts:", error.message);
    throw new Error("Failed to load press items");
  }
  const out = { all: 0, news: 0, interview: 0, video_report: 0 };
  for (const r of data ?? []) {
    out.all++;
    if (r.kind === "news" || r.kind === "interview" || r.kind === "video_report") out[r.kind]++;
  }
  return out;
}
