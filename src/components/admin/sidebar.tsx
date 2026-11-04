"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Award, CalendarDays, CircleHelp, Newspaper,
  FilePen, FileText, History, Images, KeyRound, Layers, LayoutDashboard, Mail, Megaphone,
  Menu, ShieldCheck, UserCog, Users, X, type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";

const ICONS: Record<string, LucideIcon> = {
  award: Award, "calendar-days": CalendarDays, "circle-help": CircleHelp, newspaper: Newspaper,
  "layout-dashboard": LayoutDashboard, "file-text": FileText, users: Users, images: Images,
  layers: Layers, megaphone: Megaphone, "file-pen": FilePen, mail: Mail, "user-cog": UserCog,
  "shield-check": ShieldCheck, history: History, "key-round": KeyRound,
};

export type SidebarLink = { href: string; label: string; icon: string };

export function AdminSidebar({ links, staffName, roleName, signOutSlot }: {
  links: SidebarLink[];
  staffName: string;
  roleName: string;
  signOutSlot: React.ReactNode;
}) {
  const pathname = usePathname();
  // The menu belongs to the page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (value: boolean) => setOpenOn(value ? pathname : null);

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const nav = (
    <nav aria-label="অ্যাডমিন মেনু" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {links.map((l) => {
        const Icon = ICONS[l.icon] ?? LayoutDashboard;
        const active = isActive(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-xl px-3 font-medium transition-colors ${
              active ? "bg-gold-500 text-brand-950" : "text-brand-50 hover:bg-white/10"
            }`}
          >
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-white/10 px-4 py-4 text-sm text-brand-100">
      <p className="font-semibold text-white">{staffName}</p>
      <p className="mb-3">{roleName}</p>
      {signOutSlot}
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-brand-900 px-4 py-2 text-white lg:hidden">
        <Link href="/admin" className="flex items-center gap-2 font-semibold">
          <Logo size={36} /> অ্যাডমিন প্যানেল
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex size-11 items-center justify-center rounded-xl hover:bg-white/10"
          aria-label="মেনু খুলুন"
          aria-expanded={open}
          aria-controls="admin-drawer"
        >
          <Menu className="size-6" aria-hidden="true" />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="অ্যাডমিন মেনু">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="মেনু বন্ধ করুন" onClick={() => setOpen(false)} />
          <div id="admin-drawer" className="pattern-islamic absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col bg-brand-900">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="font-semibold text-white">মেনু</span>
              <button type="button" onClick={() => setOpen(false)} className="inline-flex size-11 items-center justify-center rounded-xl text-white hover:bg-white/10" aria-label="মেনু বন্ধ করুন">
                <X className="size-6" aria-hidden="true" />
              </button>
            </div>
            {nav}
            {footer}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="pattern-islamic sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-brand-900 lg:flex">
        <Link href="/admin" className="flex items-center gap-3 px-4 py-4 text-white">
          <Logo size={44} />
          <span className="leading-tight">
            <span className="block font-serif font-bold">ইনকিলাব যুব সংগঠন</span>
            <span className="text-sm text-brand-100">অ্যাডমিন প্যানেল</span>
          </span>
        </Link>
        {nav}
        {footer}
      </aside>
    </>
  );
}
