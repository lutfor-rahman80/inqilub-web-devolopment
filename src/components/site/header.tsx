"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { ExternalLink, Menu } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { buttonClass } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { LanguageSwitch } from "./language-switch";
import { MobileDrawer } from "./mobile-drawer";
import { NavDropdown } from "./nav-dropdown";
import { SocialMenu } from "./social-menu";
import { isActivePath, type HeaderItem, type SocialItem } from "./nav";

export type HeaderLabels = {
  orgName: string;
  /** Language of the name/tagline text (Bengali when the English site falls back). */
  orgNameLang: Locale;
  tagline: string;
  taglineLang: Locale;
  navLabel: string;
  mobileLabel: string;
  menuTitle: string;
  join: string;
  joinShort: string;
  openMenu: string;
  closeMenu: string;
  languageLabel: string;
  socialLabel: string;
  socialMenuLabel: string;
  opensInNewTab: string;
};

/**
 * Site header: logo + name, the main menu (with the Activities ▾ dropdown),
 * social ▾, BN | EN and “become a member”. One line from 1024px; below that a
 * menu button opens the mobile drawer. The English name wraps onto two lines
 * on desktop so it stays readable next to the longer English menu.
 */
export function SiteHeader({
  items,
  social,
  membershipOpen,
  lang,
  labels,
  homeHref,
  joinHref,
}: {
  items: HeaderItem[];
  social: SocialItem[];
  membershipOpen: boolean;
  lang: Locale;
  labels: HeaderLabels;
  homeHref: string;
  joinHref: string;
}) {
  const pathname = usePathname() ?? "/";
  const showJoin = membershipOpen === true;
  const toggleRef = useRef<HTMLButtonElement>(null);
  // The drawer belongs to the page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const closeDrawer = () => {
    setOpenOn(null);
    // Back to the menu button (the drawer's content is gone).
    requestAnimationFrame(() => toggleRef.current?.focus());
  };

  // With the quiz link (the longest menu) the items are tighter at 1024–1279px,
  // so the name stays visible next to them in its two-line form.
  const crowded = items.some((i) => i.type === "link" && i.external);
  // English labels are longer: slightly tighter menu items so the name still fits next to them.
  const en = lang === "en";
  const itemSize = en
    ? crowded
      ? "px-1 text-[0.875rem] min-[72rem]:px-1.5 min-[72rem]:text-[0.9375rem] xl:px-2 xl:text-base"
      : "px-1.5 text-[0.9375rem] xl:px-2 xl:text-base"
    : crowded
      ? "px-1.5 xl:px-2.5"
      : "px-2 xl:px-2.5";

  const navItemClass = (active: boolean) =>
    `press inline-flex min-h-11 items-center gap-1 whitespace-nowrap rounded-lg font-medium transition-colors hover:bg-sage-100 hover:text-forest-800 ${itemSize} ${
      active ? "text-forest-800 underline decoration-gold-500 decoration-2 underline-offset-8" : "text-ink"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/85">
      <div className={`mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-2 sm:px-6 lg:px-5 xl:gap-3 xl:px-8 ${en || crowded ? "" : "lg:gap-3"}`}>
        <Link href={homeHref} className="flex min-w-0 shrink items-center gap-2.5 rounded-lg" data-testid="header-home">
          {/* The name next to it is the link text (two lines next to the desktop menu). */}
          <Logo size={44} alt="" className="shrink-0" />
          <span className="min-w-0 leading-tight" data-testid="header-brand">
            <span
              lang={labels.orgNameLang !== lang ? labels.orgNameLang : undefined}
              data-testid="header-name"
              className={`block truncate font-serif text-lg font-bold text-forest-800 ${
                en
                  ? // English name is longer: two lines (“Inqilab Jubo / Sangathan”) next to the desktop menu.
                    `lg:max-w-[7rem] lg:whitespace-normal lg:leading-[1.2] xl:text-base ${crowded ? "lg:text-sm" : "lg:text-[0.9375rem]"}`
                  : `lg:max-w-[9.5rem] lg:whitespace-normal lg:leading-snug ${
                      crowded
                        ? "lg:text-sm xl:text-[0.95rem] 2xl:max-w-none 2xl:whitespace-nowrap 2xl:text-lg"
                        : "lg:text-[0.95rem] xl:max-w-none xl:whitespace-nowrap xl:text-lg"
                    }`
              }`}
            >
              {labels.orgName}
            </span>
            {/* Tagline only where there is room for it (phones/tablets and, in Bengali, wide screens). */}
            <span
              lang={labels.taglineLang !== lang ? labels.taglineLang : undefined}
              className={`hidden truncate text-sm text-muted sm:block lg:hidden ${en ? "" : "2xl:block"}`}
            >
              {labels.tagline}
            </span>
          </span>
        </Link>

        <nav aria-label={labels.navLabel} className="hidden items-center lg:flex" data-testid="desktop-nav">
          <ul className="flex items-center">
            {items.filter((item) => item.type === "group" || !item.mobileOnly).map((item) => (
              <li key={item.type === "link" ? item.href : item.id}>
                {item.type === "group" ? (
                  <NavDropdown id={item.id} label={item.label} items={item.items} pathname={pathname} sizeClass={itemSize} />
                ) : item.external ? (
                  <a href={item.href} target="_blank" rel="noopener noreferrer" className={navItemClass(false)} data-testid="quiz-link">
                    {item.label}
                    {/* Icon from 1280px; at 1024–1279px its room goes to the name (the sr-only note stays). */}
                    <ExternalLink className="hidden size-3.5 text-muted xl:block" aria-hidden="true" />
                    <span className="sr-only"> {labels.opensInNewTab}</span>
                  </a>
                ) : (
                  <Link
                    href={item.href}
                    aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
                    className={navItemClass(isActivePath(pathname, item.href))}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 xl:gap-2">
          <div className="hidden items-center gap-1.5 lg:flex xl:gap-2" data-testid="desktop-tools">
            <SocialMenu
              items={social}
              pathname={pathname}
              labels={{ label: labels.socialLabel, menuLabel: labels.socialMenuLabel, opensInNewTab: labels.opensInNewTab }}
            />
            <LanguageSwitch lang={lang} label={labels.languageLabel} />
          </div>
          {showJoin && (
            <Link
              href={joinHref}
              aria-current={isActivePath(pathname, joinHref) ? "page" : undefined}
              className={buttonClass("gold", "md", "press hidden px-3.5 sm:inline-flex xl:px-5")}
            >
              {/* English with the quiz link: the short label leaves room for the name. */}
              <span className={en && crowded ? "" : "xl:hidden"}>{labels.joinShort}</span>
              {!(en && crowded) && <span className="hidden xl:inline">{labels.join}</span>}
            </Link>
          )}
          <button
            ref={toggleRef}
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-xl text-forest-800 hover:bg-sage-100 lg:hidden"
            onClick={() => setOpenOn(open ? null : pathname)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-haspopup="dialog"
            aria-label={open ? labels.closeMenu : labels.openMenu}
          >
            <Menu className="size-6" aria-hidden="true" />
          </button>
        </div>
      </div>

      <MobileDrawer
        id="mobile-menu"
        open={open}
        onClose={closeDrawer}
        items={items}
        social={social}
        lang={lang}
        homeHref={homeHref}
        joinHref={joinHref}
        showJoin={showJoin}
        pathname={pathname}
        labels={{
          title: labels.menuTitle,
          navLabel: labels.mobileLabel,
          close: labels.closeMenu,
          orgName: labels.orgName,
          join: labels.join,
          languageLabel: labels.languageLabel,
          socialLabel: labels.socialLabel,
          opensInNewTab: labels.opensInNewTab,
        }}
      />
    </header>
  );
}
