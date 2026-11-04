import "server-only";
import { createPublicClient } from "@/lib/supabase/server";
import { ilikePattern } from "./normalize";

/**
 * Public member directory. Reads ONLY the public_members view (active,
 * consented, published members; members under 18 only with a recorded
 * guardian consent; safe columns only) with the anonymous, cookie-less client.
 */

export const DIRECTORY_PAGE_SIZE = 24;
export const GENERAL_DESIGNATION = "সদস্য";

const COLUMNS =
  "id, member_no, full_name, photo_path, designation, designation_en, designation_id, designation_rank, public_phone";

export type DirectoryMember = {
  id: string;
  member_no: string;
  full_name: string;
  photo_path: string | null;
  designation: string;
  /** English designation (null → the Bengali one is shown, marked lang="bn"). */
  designation_en: string | null;
  designation_id: number;
  designation_rank: number;
  public_phone: string | null;
};

export type DirectoryDesignation = { id: number; name_bn: string; name_en: string | null };

export async function getDirectoryDesignations(): Promise<DirectoryDesignation[]> {
  const { data } = await createPublicClient()
    .from("designations")
    .select("id, name_bn, name_en")
    .eq("is_active", true)
    .order("rank_order")
    .order("name_bn");
  return data ?? [];
}

/** Office bearers (every designation except the general "সদস্য"), in rank order. */
export async function getLeadership(): Promise<DirectoryMember[]> {
  const { data, error } = await createPublicClient()
    .from("public_members")
    .select(COLUMNS)
    .neq("designation", GENERAL_DESIGNATION)
    .order("designation_rank")
    .order("sort_order")
    .order("member_no")
    .limit(200);
  if (error) throw new Error(`directory leadership: ${error.message}`);
  return (data ?? []) as DirectoryMember[];
}

/**
 * One page of members. Without filters only general members are listed (the
 * leadership is shown separately); with a search or designation filter every
 * matching member is listed.
 */
export async function getDirectoryPage({
  page,
  q,
  designationId,
}: {
  page: number;
  q: string | null;
  designationId: number | null;
}): Promise<{ items: DirectoryMember[]; total: number }> {
  const from = (page - 1) * DIRECTORY_PAGE_SIZE;
  let query = createPublicClient().from("public_members").select(COLUMNS, { count: "exact" });
  const pattern = ilikePattern(q);
  const filtered = Boolean(pattern) || designationId !== null;
  if (pattern) query = query.ilike("full_name", pattern);
  if (designationId !== null) query = query.eq("designation_id", designationId);
  if (!filtered) query = query.eq("designation", GENERAL_DESIGNATION);
  const { data, count, error } = await query
    .order("designation_rank")
    .order("sort_order")
    .order("member_no")
    .range(from, from + DIRECTORY_PAGE_SIZE - 1);
  if (error) {
    // Out-of-range page requests return 416 from PostgREST; treat as empty.
    if (error.code === "PGRST103") return { items: [], total: count ?? 0 };
    throw new Error(`directory page: ${error.message}`);
  }
  return { items: (data ?? []) as DirectoryMember[], total: count ?? 0 };
}
