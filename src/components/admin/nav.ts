import type { Permission } from "@/lib/auth";

/** Admin sidebar. A link is shown when the user has ANY of the listed permissions. */
export const ADMIN_NAV: { href: string; label: string; icon: string; anyOf: Permission[] | "all" }[] = [
  { href: "/admin", label: "ড্যাশবোর্ড", icon: "layout-dashboard", anyOf: "all" },
  { href: "/admin/applications", label: "সদস্য আবেদন", icon: "file-text", anyOf: ["applications.view"] },
  { href: "/admin/members", label: "সদস্য", icon: "users", anyOf: ["members.view", "members.manage"] },
  { href: "/admin/gallery", label: "গ্যালারি", icon: "images", anyOf: ["gallery.manage"] },
  { href: "/admin/categories", label: "কার্যক্রম / ক্যাটাগরি", icon: "layers", anyOf: ["content.manage"] },
  { href: "/admin/programs", label: "কর্মসূচি", icon: "calendar-days", anyOf: ["content.manage"] },
  { href: "/admin/notice", label: "Notice", icon: "newspaper", anyOf: ["content.manage"] },
  { href: "/admin/announcements", label: "ঘোষণা", icon: "megaphone", anyOf: ["content.manage"] },
  { href: "/admin/content", label: "ওয়েবসাইট কনটেন্ট", icon: "file-pen", anyOf: ["content.manage"] },
  { href: "/admin/quiz", label: "সীরাত কুইজ", icon: "award", anyOf: ["quiz.manage", "content.manage"] },
  { href: "/admin/faq", label: "প্রশ্নোত্তর", icon: "circle-help", anyOf: ["content.manage"] },
  { href: "/admin/messages", label: "বার্তা", icon: "mail", anyOf: ["messages.view"] },
  { href: "/admin/users", label: "ব্যবহারকারী", icon: "user-cog", anyOf: ["users.manage"] },
  { href: "/admin/roles", label: "ভূমিকা ও অনুমতি", icon: "shield-check", anyOf: ["users.manage"] },
  { href: "/admin/audit", label: "অডিট লগ", icon: "history", anyOf: ["audit.view"] },
  { href: "/admin/account", label: "আমার অ্যাকাউন্ট", icon: "key-round", anyOf: "all" },
];
