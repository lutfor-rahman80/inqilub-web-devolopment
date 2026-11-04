import type { Locale } from "@/i18n/config";
import { common } from "@/i18n/messages/common";
import { localePath, stripLocale } from "@/i18n/paths";
import type { SocialPlatform } from "@/lib/site/urls";

/** Public navigation (footer quick links): language-neutral paths + message keys. */
export const PUBLIC_NAV = [
  { href: "/", key: "home" },
  { href: "/about", key: "about" },
  { href: "/activities", key: "activities" },
  { href: "/programs", key: "programs" },
  { href: "/gallery", key: "gallery" },
  { href: "/members", key: "members", requiresDirectory: true },
  { href: "/announcements", key: "announcements" },
  { href: "/faq", key: "faq" },
  { href: "/contact", key: "contact" },
  { href: "/notice", key: "press" },
] as const;

export type FooterLink = { href: string; label: string; external?: boolean };

/**
 * PUBLIC_NAV filtered by site settings, with localized labels and URLs. The
 * quiz link (external, only when configured) goes just before Notice, which is
 * always the last item (organization decision).
 */
export function publicNavLinks(
  directoryEnabled: boolean,
  lang: Locale = "bn",
  quiz: { url: string; label: string } | null = null,
): FooterLink[] {
  const t = common[lang].nav;
  const links: FooterLink[] = PUBLIC_NAV.filter((l) => !("requiresDirectory" in l) || directoryEnabled).map((l) => ({
    href: localePath(lang, l.href),
    label: t[l.key],
  }));
  if (quiz) links.splice(links.length - 1, 0, { href: quiz.url, label: quiz.label, external: quiz.url.startsWith("http") });
  return links;
}

/** mobileOnly: shown in the mobile drawer but not in the desktop bar (which must fit on one line from 1024px). */
export type HeaderLink = { href: string; label: string; external?: boolean; mobileOnly?: boolean };
export type HeaderItem =
  | ({ type: "link" } & HeaderLink)
  | { type: "group"; id: string; label: string; items: HeaderLink[] };

/**
 * Header menu: Home · About · Activities ▾ · Gallery · Members · Announcements ·
 * FAQ (mobile drawer only) · Contact · quiz (external, only when a quiz URL is configured) · Notice (always last).
 */
export function headerNav(
  { directoryEnabled, quizUrl, quizLabel }: { directoryEnabled: boolean; quizUrl: string | null; quizLabel: string },
  lang: Locale,
): HeaderItem[] {
  const t = common[lang].nav;
  const link = (path: string, label: string): HeaderItem => ({ type: "link", href: localePath(lang, path), label });
  const items: HeaderItem[] = [
    link("/", t.home),
    link("/about", t.aboutShort),
    {
      type: "group",
      id: "activities",
      label: t.activitiesMenu,
      items: [
        { href: localePath(lang, "/activities"), label: t.activityAreas },
        { href: localePath(lang, "/programs"), label: t.programs },
      ],
    },
    link("/gallery", t.gallery),
  ];
  if (directoryEnabled) items.push(link("/members", t.members));
  items.push(
    link("/announcements", t.announcements),
    { type: "link", href: localePath(lang, "/faq"), label: t.faq, mobileOnly: true },
    link("/contact", t.contact),
  );
  if (quizUrl) items.push({ type: "link", href: quizUrl, label: quizLabel, external: true });
  // Organization decision: Notice is always the last menu item.
  items.push(link("/notice", t.press));
  return items;
}

export type SocialItem = { platform: SocialPlatform; url: string; label: string };

/** Facebook (contact settings) first, then the other saved platforms — URLs are already validated. */
export function socialItems(
  facebookUrl: string | null,
  links: { platform: SocialPlatform; url: string }[],
  lang: Locale,
): SocialItem[] {
  const names = common[lang].social.platforms;
  const out: SocialItem[] = [];
  if (facebookUrl) out.push({ platform: "facebook", url: facebookUrl, label: names.facebook });
  for (const l of links) {
    if (l.platform === "facebook" && facebookUrl) continue;
    if (out.some((o) => o.platform === l.platform)) continue;
    out.push({ platform: l.platform, url: l.url, label: names[l.platform] });
  }
  return out;
}

/**
 * Whole-segment match ignoring the language prefix: "/members" is active on
 * /members and /en/members/…, but not on /membership.
 */
export function isActivePath(pathname: string, href: string): boolean {
  const path = stripLocale(pathname);
  const target = stripLocale(href);
  if (target === "/") return path === "/";
  return path === target || path.startsWith(`${target}/`);
}
