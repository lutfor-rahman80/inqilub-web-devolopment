import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sortRoles } from "@/lib/admin/roles";
import { UsersManager, type RoleOption, type StaffRow } from "@/components/admin/users-manager";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Alert } from "@/components/ui/field";

export const metadata: Metadata = { title: "ব্যবহারকারী" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function UsersPage({ searchParams }: Props) {
  const me = await requirePagePermission("users.manage");
  const sp = await searchParams;
  const db = await createClient();

  const [profilesRes, rolesRes, reviewRes] = await Promise.all([
    db.from("staff_profiles").select("id, full_name, is_active, created_at, role_id").order("created_at", { ascending: true }),
    db.from("roles").select("id, key, name_bn, description, is_system"),
    db.from("role_permissions").select("role_id").eq("permission", "applications.review"),
  ]);

  if (profilesRes.error || rolesRes.error) {
    return (
      <>
        <AdminPageHeader title="ব্যবহারকারী" />
        <Alert>ব্যবহারকারীর তালিকা লোড করা যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।</Alert>
      </>
    );
  }

  // Email and last sign-in live in Auth. Read with the secret key, after the
  // users.manage check above, and only for accounts that are staff.
  const auth = new Map<string, { email: string | null; lastSignInAt: string | null }>();
  let authError = false;
  const { data: authList, error } = await createAdminClient().auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    authError = true;
    console.error("[admin/users] listUsers failed:", error.message);
  } else {
    for (const u of authList.users) auth.set(u.id, { email: u.email ?? null, lastSignInAt: u.last_sign_in_at ?? null });
  }

  const roles = sortRoles(rolesRes.data);
  const roleById = new Map(roles.map((r) => [r.id, r]));
  const rows: StaffRow[] = profilesRes.data.map((p) => {
    const role = roleById.get(p.role_id);
    return {
      id: p.id,
      fullName: p.full_name,
      email: auth.get(p.id)?.email ?? null,
      lastSignInAt: auth.get(p.id)?.lastSignInAt ?? null,
      createdAt: p.created_at,
      isActive: p.is_active,
      roleId: p.role_id,
      roleKey: role?.key ?? "",
      roleName: role?.name_bn ?? "অজানা ভূমিকা",
    };
  });
  const superRole = roles.find((r) => r.key === "super_admin");
  const activeSuperCount = rows.filter((r) => r.roleId === superRole?.id && r.isActive).length;
  const reviewerRoleIds = new Set((reviewRes.data ?? []).map((r) => r.role_id));
  const approverRoles = roles.filter((r) => r.key === "super_admin" || reviewerRoleIds.has(r.id)).map((r) => r.name_bn);

  const roleOptions: RoleOption[] = roles.map((r) => ({ id: r.id, key: r.key, name: r.name_bn, description: r.description ?? "" }));

  return (
    <UsersManager
      rows={rows}
      roles={roleOptions}
      meId={me.id}
      meIsSuper={me.roleKey === "super_admin"}
      activeSuperCount={activeSuperCount}
      approverRoles={approverRoles}
      openCreate={sp.new === "1"}
      authError={authError}
    />
  );
}
