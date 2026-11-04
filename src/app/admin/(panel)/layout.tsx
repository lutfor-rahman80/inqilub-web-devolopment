import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { ADMIN_NAV } from "@/components/admin/nav";
import { AdminSidebar } from "@/components/admin/sidebar";
import { signOut } from "../actions";

export const metadata: Metadata = {
  title: { default: "অ্যাডমিন প্যানেল", template: "%s | অ্যাডমিন" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const links = ADMIN_NAV.filter((l) => l.anyOf === "all" || l.anyOf.some((p) => staff.permissions.has(p))).map(
    ({ href, label, icon }) => ({ href, label, icon }),
  );

  return (
    <div className="min-h-dvh bg-stone-50 lg:flex">
      <AdminSidebar
        links={links}
        staffName={staff.fullName}
        roleName={staff.roleName}
        signOutSlot={
          <div className="flex flex-wrap gap-2">
            <Link href="/" className="rounded-lg px-2 py-1 text-brand-100 underline-offset-4 hover:underline">ওয়েবসাইট দেখুন</Link>
            <form action={signOut}>
              <button type="submit" className="rounded-lg bg-white/10 px-3 py-1 font-medium text-white hover:bg-white/20">লগআউট</button>
            </form>
          </div>
        }
      />
      <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
    </div>
  );
}
