import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sortRoles } from "@/lib/admin/roles";
import { RolesManager, type PermissionInfo, type RoleInfo } from "@/components/admin/roles-manager";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Alert } from "@/components/ui/field";

export const metadata: Metadata = { title: "ভূমিকা ও অনুমতি" };

export default async function RolesPage() {
  const me = await requirePagePermission("users.manage");
  const db = await createClient();
  const [rolesRes, permsRes, grantsRes, staffRes] = await Promise.all([
    db.from("roles").select("id, key, name_bn, description, is_system"),
    db.from("permissions").select("key, name_bn, description, sort_order").order("sort_order"),
    db.from("role_permissions").select("role_id, permission"),
    db.from("staff_profiles").select("role_id, is_active"),
  ]);

  if (rolesRes.error || permsRes.error || grantsRes.error || staffRes.error) {
    return (
      <>
        <AdminPageHeader title="ভূমিকা ও অনুমতি" />
        <Alert>ভূমিকার তথ্য লোড করা যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।</Alert>
      </>
    );
  }

  const permissions: PermissionInfo[] = permsRes.data.map((p) => ({ key: p.key, name: p.name_bn, description: p.description ?? "" }));
  const roles: RoleInfo[] = sortRoles(rolesRes.data).map((r) => ({
    id: r.id,
    key: r.key,
    name: r.name_bn,
    description: r.description ?? "",
    isSystem: r.is_system,
    isSuper: r.key === "super_admin",
    permissions:
      r.key === "super_admin"
        ? permissions.map((p) => p.key)
        : grantsRes.data.filter((g) => g.role_id === r.id).map((g) => g.permission),
    userCount: staffRes.data.filter((s) => s.role_id === r.id).length,
    activeUserCount: staffRes.data.filter((s) => s.role_id === r.id && s.is_active).length,
  }));

  return <RolesManager roles={roles} permissions={permissions} myRoleKey={me.roleKey} />;
}
