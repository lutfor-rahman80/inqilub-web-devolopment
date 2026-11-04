import type { Metadata } from "next";
import { Check } from "lucide-react";
import { getStaffSession, requireStaff, type Permission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate, formatDateTime } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin/page-header";
import { PasswordForm } from "@/components/admin/password-form";
import { Card } from "@/components/ui/card";
import { MfaSection } from "./mfa-section";
import { MfaResetCard } from "./mfa-reset";

export const metadata: Metadata = { title: "আমার অ্যাকাউন্ট" };

/** Super admins only (checked by the caller): other staff members who have authenticator apps. */
async function staffWithFactors(selfId: string) {
  const admin = createAdminClient();
  const { data: staffRows } = await admin
    .from("staff_profiles")
    .select("id, full_name")
    .neq("id", selfId)
    .order("full_name");
  const people: { id: string; name: string; email: string; factors: number }[] = [];
  await Promise.all(
    (staffRows ?? []).map(async (s) => {
      const [{ data: factors }, { data: user }] = await Promise.all([
        admin.auth.admin.mfa.listFactors({ userId: s.id }),
        admin.auth.admin.getUserById(s.id),
      ]);
      const count = (factors?.factors ?? []).filter((f) => f.status === "verified").length;
      if (count > 0) people.push({ id: s.id, name: s.full_name, email: user.user?.email ?? "", factors: count });
    }),
  );
  return people.sort((a, b) => a.name.localeCompare(b.name, "bn"));
}

export default async function AccountPage() {
  const staff = await requireStaff();
  const session = (await getStaffSession())!;
  const isSuper = staff.roleKey === "super_admin";
  const resettable = isSuper ? await staffWithFactors(staff.id) : [];
  const db = await createClient();
  const [{ data: userData }, { data: perms }] = await Promise.all([
    db.auth.getUser(),
    db.from("permissions").select("key, name_bn").order("sort_order"),
  ]);
  const lastSignIn = userData.user?.last_sign_in_at ?? null;
  const mine = (perms ?? []).filter((p) => staff.permissions.has(p.key as Permission));

  return (
    <>
      <AdminPageHeader title="আমার অ্যাকাউন্ট" description="আপনার অ্যাকাউন্টের তথ্য, পাসওয়ার্ড ও দুই ধাপের লগইন।" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4 sm:p-6">
          <h2 className="text-xl font-bold">অ্যাকাউন্টের তথ্য</h2>
          <dl className="mt-4 space-y-3">
            <div>
              <dt className="text-sm text-muted">নাম</dt>
              <dd className="font-semibold" data-testid="account-name">{staff.fullName}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">ইমেইল (লগইন আইডি)</dt>
              <dd className="break-all font-semibold" dir="ltr" data-testid="account-email">{staff.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">ভূমিকা</dt>
              <dd className="font-semibold" data-testid="account-role">{staff.roleName}</dd>
            </div>
            {lastSignIn && (
              <div>
                <dt className="text-sm text-muted">সর্বশেষ লগইন</dt>
                <dd>{formatDateTime(lastSignIn)}</dd>
              </div>
            )}
          </dl>
          <h3 className="mt-6 text-lg font-bold">আপনার অনুমতি</h3>
          {mine.length ? (
            <ul className="mt-2 space-y-1.5">
              {mine.map((p) => (
                <li key={p.key} className="flex items-start gap-2">
                  <Check className="mt-1 size-4 shrink-0 text-brand-700" aria-hidden="true" /> {p.name_bn}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-muted">আপনার ভূমিকায় এখনো কোনো অনুমতি দেওয়া হয়নি।</p>
          )}
          <p className="mt-4 text-sm text-muted" data-testid="account-change-help">
            {staff.permissions.has("users.manage")
              ? "নিজের নাম “ব্যবহারকারী” পাতা থেকে বদলাতে পারেন; নিজের ভূমিকা বদলাতে অন্য একজন ব্যবহারকারী ব্যবস্থাপকের সাহায্য লাগবে।"
              : "নাম বা ভূমিকা বদলাতে ব্যবহারকারী ব্যবস্থাপকের (যেমন সুপার অ্যাডমিন) সাথে যোগাযোগ করুন।"}{" "}
            লগইন ইমেইল অ্যাডমিন প্যানেল থেকে বদলানো যায় না; প্রয়োজনে ওয়েবসাইটের ডেভেলপারের সাহায্য নিন।
          </p>
        </Card>
        <Card className="p-4 sm:p-6">
          <h2 className="text-xl font-bold">পাসওয়ার্ড পরিবর্তন</h2>
          <p className="mb-4 mt-1 text-muted">অন্য কাউকে পাসওয়ার্ড দিয়ে থাকলে বা প্রথমবার অস্থায়ী পাসওয়ার্ড দিয়ে ঢুকলে এখনই বদলে নিন।</p>
          <PasswordForm email={staff.email ?? ""} />
        </Card>
        <Card className="p-4 sm:p-6" aria-labelledby="mfa-title">
          <h2 id="mfa-title" className="text-xl font-bold">দুই ধাপের লগইন</h2>
          <p className="mb-4 mt-1 text-muted">
            পাসওয়ার্ডের পরে মোবাইলের অথেনটিকেটর অ্যাপের ৬ অঙ্কের কোড — পাসওয়ার্ড অন্য কেউ জেনে গেলেও আপনার ফোন ছাড়া অ্যাকাউন্টে প্রবেশ করা যাবে না।
          </p>
          <MfaSection
            isSuper={isSuper}
            factors={session.mfa.factors.map((f) => ({ id: f.id, added: formatDate(f.createdAt) }))}
          />
        </Card>
        {isSuper && (
          <Card className="p-4 sm:p-6" aria-labelledby="mfa-reset-title">
            <h2 id="mfa-reset-title" className="text-xl font-bold">অন্য কর্মীর দুই ধাপের লগইন রিসেট</h2>
            <p className="mb-4 mt-1 text-muted">
              কেউ ফোন হারালে বা অ্যাপ মুছে গেলে তার অথেনটিকেটর অ্যাপ এখান থেকে মুছে দিন; তিনি পাসওয়ার্ড দিয়ে প্রবেশ করে নতুন ফোনে আবার চালু করবেন।
            </p>
            <MfaResetCard people={resettable} />
          </Card>
        )}
      </div>
    </>
  );
}
