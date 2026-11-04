"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { errorMessage } from "@/lib/errors";
import { DENIED, staffWith } from "@/lib/admin/guard";
import { FORM_ERROR, parseNewRole, parseRole, type FieldErrors } from "@/lib/admin/schemas";
import { isUuid } from "@/lib/admin/text";
import { bn } from "@/lib/format";

type Fail = { ok: false; error: string; fieldErrors?: FieldErrors };
export type RoleResult = { ok: true; id: string } | Fail;

const NOT_FOUND = "ভূমিকাটি খুঁজে পাওয়া যায়নি।";
const SUPER_LOCKED = "সুপার অ্যাডমিন ভূমিকার সকল অনুমতি স্থায়ী; এটি পরিবর্তন করা যায় না।";
const OWN_USERS_MANAGE = "নিজের ভূমিকা থেকে “ব্যবহারকারী ও ভূমিকা ব্যবস্থাপনা” অনুমতি সরানো যায় না — তাহলে আপনি নিজেই এই পাতায় আর ঢুকতে পারবেন না।";

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function permissionList(v: unknown): string[] | null {
  if (!Array.isArray(v) || v.length > 50) return null;
  const list = v.filter((p): p is string => typeof p === "string" && /^[a-z_]+\.[a-z_]+$/.test(p));
  return list.length === v.length ? [...new Set(list)] : null;
}

/**
 * New custom role with its permissions. Writes run as the signed-in user:
 * Row-Level Security (users.manage) and set_role_permissions' own check apply.
 */
export async function createRole(raw: unknown): Promise<RoleResult> {
  if (!(await staffWith("users.manage"))) return { ok: false, error: DENIED };
  const parsed = parseNewRole(asRecord(raw));
  if (!parsed.ok) return { ok: false, error: FORM_ERROR, fieldErrors: parsed.fieldErrors };
  const { key, name_bn, description, permissions } = parsed.data;

  const db = await createClient();
  const { data: role, error } = await db
    .from("roles")
    .insert({ key, name_bn, description: description || null, is_system: false })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: FORM_ERROR, fieldErrors: { key: "এই সংক্ষিপ্ত নামে আরেকটি ভূমিকা আছে; অন্য নাম দিন।" } };
    }
    return { ok: false, error: errorMessage(error) };
  }

  const { error: permError } = await db.rpc("set_role_permissions", { p_role_id: role.id, p_permissions: permissions });
  if (permError) {
    // Do not leave a half-created role behind.
    await db.from("roles").delete().eq("id", role.id);
    return { ok: false, error: errorMessage(permError) };
  }
  revalidatePath("/admin", "layout");
  return { ok: true, id: role.id };
}

/** Rename / describe a role and replace its permission set (not super_admin). */
export async function updateRole(id: unknown, raw: unknown): Promise<RoleResult> {
  const staff = await staffWith("users.manage");
  if (!staff) return { ok: false, error: DENIED };
  if (!isUuid(id)) return { ok: false, error: NOT_FOUND };
  const input = asRecord(raw);
  const parsed = parseRole(input);
  const permissions = permissionList(input.permissions);
  if (!parsed.ok || !permissions) {
    return { ok: false, error: FORM_ERROR, fieldErrors: parsed.ok ? { permissions: "অনুমতির তালিকা সঠিক নয়।" } : parsed.fieldErrors };
  }

  const db = await createClient();
  const { data: role, error: readError } = await db.from("roles").select("id, key").eq("id", id).maybeSingle();
  if (readError) return { ok: false, error: errorMessage(readError) };
  if (!role) return { ok: false, error: NOT_FOUND };
  if (role.key === "super_admin") return { ok: false, error: SUPER_LOCKED };
  if (role.key === staff.roleKey && !permissions.includes("users.manage")) return { ok: false, error: OWN_USERS_MANAGE };

  const { error: permError } = await db.rpc("set_role_permissions", { p_role_id: id, p_permissions: permissions });
  if (permError) return { ok: false, error: errorMessage(permError) };

  const { data, error } = await db
    .from("roles")
    .update({ name_bn: parsed.data.name_bn, description: parsed.data.description || null })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: errorMessage(error) };
  if (!data || data.length === 0) return { ok: false, error: DENIED };

  revalidatePath("/admin", "layout");
  return { ok: true, id };
}

/** Delete a custom role that no staff account uses. */
export async function deleteRole(id: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await staffWith("users.manage"))) return { ok: false, error: DENIED };
  if (!isUuid(id)) return { ok: false, error: NOT_FOUND };

  const db = await createClient();
  const { data: role, error: readError } = await db.from("roles").select("id, is_system").eq("id", id).maybeSingle();
  if (readError) return { ok: false, error: errorMessage(readError) };
  if (!role) return { ok: false, error: NOT_FOUND };
  if (role.is_system) return { ok: false, error: "সিস্টেম ভূমিকা মুছে ফেলা যায় না।" };

  const { count, error: countError } = await db
    .from("staff_profiles")
    .select("id", { count: "exact", head: true })
    .eq("role_id", id);
  if (countError) return { ok: false, error: errorMessage(countError) };
  const inUse = (n: number) =>
    `এই ভূমিকায় ${bn(n)} জন ব্যবহারকারী আছেন (নিষ্ক্রিয়সহ)। আগে তাঁদের অন্য ভূমিকা দিন, তারপর মুছে ফেলুন।`;
  if ((count ?? 0) > 0) return { ok: false, error: inUse(count ?? 0) };

  const { data, error } = await db.from("roles").delete().eq("id", id).select("id");
  if (error) {
    // A staff account got this role in the meantime (foreign key).
    if (error.code === "23503") return { ok: false, error: inUse(1).replace(`${bn(1)} জন`, "অন্তত একজন") };
    return { ok: false, error: errorMessage(error) };
  }
  if (!data || data.length === 0) return { ok: false, error: DENIED };
  revalidatePath("/admin", "layout");
  return { ok: true };
}
