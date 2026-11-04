import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { AuditLookups } from "./audit";
import { isUuid } from "./text";

type Db = Awaited<ReturnType<typeof createClient>>;

const none = Promise.resolve({ data: [] as never[] });

/**
 * Names used to make audit entries readable (roles, categories, designations,
 * permissions, and the current name/title of the rows the given entries are
 * about). Read with the signed-in user's client, so Row-Level Security still
 * decides what is visible: e.g. a tracking number is only filled in for a
 * viewer who may see applications.
 */
export async function loadAuditLookups(
  db: Db,
  rows: readonly { entity_type: string; entity_id: string | null }[] = [],
): Promise<AuditLookups> {
  const ids = (type: string) => [
    ...new Set(rows.filter((r) => r.entity_type === type && isUuid(r.entity_id)).map((r) => r.entity_id as string)),
  ];
  const ann = ids("announcements");
  const mem = ids("members");
  const app = ids("membership_applications");
  const img = ids("gallery_images");

  const [roles, cats, desigs, perms, staff, anns, mems, apps, imgs] = await Promise.all([
    db.from("roles").select("id, name_bn"),
    db.from("activity_categories").select("id, name_bn"),
    db.from("designations").select("id, name_bn"),
    db.from("permissions").select("key, name_bn"),
    db.from("staff_profiles").select("id, full_name"),
    ann.length ? db.from("announcements").select("id, title").in("id", ann) : none,
    mem.length ? db.from("members").select("id, member_no").in("id", mem) : none,
    app.length ? db.from("membership_applications").select("id, application_no").in("id", app) : none,
    img.length ? db.from("gallery_images").select("id, caption").in("id", img) : none,
  ]);
  return {
    roles: new Map((roles.data ?? []).map((r) => [r.id, r.name_bn])),
    categories: new Map((cats.data ?? []).map((c) => [c.id, c.name_bn])),
    designations: new Map((desigs.data ?? []).map((d) => [String(d.id), d.name_bn])),
    permissions: new Map((perms.data ?? []).map((p) => [p.key, p.name_bn])),
    staff: new Map((staff.data ?? []).map((p) => [p.id, p.full_name])),
    announcements: new Map((anns.data ?? []).map((a) => [a.id, a.title])),
    members: new Map((mems.data ?? []).map((m) => [m.id, m.member_no])),
    applications: new Map((apps.data ?? []).map((a) => [a.id, a.application_no])),
    images: new Map((imgs.data ?? []).filter((i) => i.caption).map((i) => [i.id, i.caption])),
  };
}

export const AUDIT_COLUMNS = "id, actor_id, actor_name, action, entity_type, entity_id, details, created_at";
