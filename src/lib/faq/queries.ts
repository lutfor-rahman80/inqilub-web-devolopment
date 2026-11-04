import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/server";

/**
 * Public FAQ reads through the cookie-less anonymous client: Row-Level
 * Security returns only published entries, and the page stays cacheable.
 */

export type PublicFaq = {
  id: string;
  question_bn: string;
  answer_bn: string;
  question_en: string | null;
  answer_en: string | null;
  updated_at: string;
};

/** Published entries in display order (sort order, then oldest first). Throws on a failed read. */
export const getPublishedFaqs = cache(async (): Promise<PublicFaq[]> => {
  const { data, error } = await createPublicClient()
    .from("faqs")
    .select("id, question_bn, answer_bn, question_en, answer_en, updated_at")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(500);
  if (error) {
    console.error("[faq] published entries:", error.message);
    throw new Error("Failed to load FAQ entries");
  }
  return data;
});

/** Newest change among published entries (sitemap lastModified), or null. */
export async function getFaqLastModified(): Promise<string | null> {
  const { data, error } = await createPublicClient()
    .from("faqs")
    .select("updated_at")
    .eq("is_published", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[faq] last modified:", error.message);
    return null;
  }
  return data?.updated_at ?? null;
}
