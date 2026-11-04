"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ExternalLink, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { buttonClass } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { LanguageSwitch } from "./language-switch";
import { SocialIcon } from "./social-menu-icons";
import { isActivePath, type HeaderItem, type HeaderLink, type SocialItem } from "./nav";

export type DrawerLabels = {
  title: string;
  navLabel: string;
  close: string;
  orgName: string;
  join: string;
  languageLabel: string;
  socialLabel: string;
  opensInNewTab: string;
};

/**
 * Mobile menu (below lg) as a modal side panel on the native <dialog>: the
 * page behind is inert (focus stays inside), the page does not scroll,
 * Escape / the close button / a tap outside closes it, and focus returns to
 * the menu button. Every item is shown expanded; language and social links
 * follow the menu. Below the fixed top bar the whole panel scrolls as one
 * (nothing is pinned over the list, so on short phones the last items —
 * FAQ, Contact, Notice — are never hidden behind a footer), and a soft edge
 * shadow shows when there is more to scroll. 44-px targets throughout.
 */
export function MobileDrawer({
  id,
  open,
  onClose,
  items,
  social,
  lang,
  homeHref,
  joinHref,
  showJoin,
  labels,
  pathname,
}: {
  id: string;
  open: boolean;
  onClose: () => void;
  items: HeaderItem[];
  social: SocialItem[];
  lang: Locale;
  homeHref: string;
  joinHref: string | null;
  showJoin: boolean;
  labels: DrawerLabels;
  pathname: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
      const root = document.documentElement;
      const previous = root.style.overflow;
      root.style.overflow = "hidden";
      return () => {
        root.style.overflow = previous;
        if (dialog.open) dialog.close();
      };
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const linkClass = (current: boolean) =>
    `flex min-h-11 items-center gap-2 rounded-xl px-3 text-lg font-medium transition-colors ${
      current ? "bg-sage-100 text-forest-800" : "text-ink hover:bg-sage-50"
    }`;

  const renderLink = (l: HeaderLink) => {
    const current = !l.external && isActivePath(pathname, l.href);
    if (l.external) {
      return (
        <a href={l.href} target="_blank" rel="noopener noreferrer" className={linkClass(false)} onClick={onClose}>
          {l.label}
          <ExternalLink className="size-4 text-muted" aria-hidden="true" />
          <span className="sr-only"> {labels.opensInNewTab}</span>
        </a>
      );
    }
    return (
      <Link href={l.href} aria-current={current ? "page" : undefined} className={linkClass(current)} onClick={onClose}>
        {l.label}
      </Link>
    );
  };

  return (
    <dialog
      ref={ref}
      id={id}
      aria-label={labels.title}
      onCancel={(e) => {
        e.preventDefault();
        onCloseRef.current();
      }}
      onClick={(e) => {
        // A tap on the dimmed area (the dialog box itself, outside the panel) closes it.
        if (e.target === e.currentTarget) onCloseRef.current();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-black/50 lg:hidden"
    >
      <div className="ms-auto flex h-full w-[min(22rem,100%)] flex-col bg-cream shadow-[var(--shadow-lift)] motion-safe:animate-[ijs-fade-in_0.2s_ease-out]">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <Link href={homeHref} className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg" onClick={onClose}>
            <Logo size={36} alt="" className="shrink-0" />
            <span className="truncate font-serif text-base font-bold text-forest-800">{labels.orgName}</span>
          </Link>
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            aria-label={labels.close}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-forest-800 hover:bg-sage-100"
          >
            <X className="size-6" aria-hidden="true" />
          </button>
        </div>

        <div className="scroll-shadow-y min-h-0 flex-1 overflow-y-auto overscroll-contain" data-testid="drawer-scroll">
          <nav aria-label={labels.navLabel} className="px-3 py-3">
            <ul className="space-y-0.5">
              {items.map((item) =>
                item.type === "link" ? (
                  <li key={item.href}>{renderLink(item)}</li>
                ) : (
                  <li key={item.id} className="pt-1.5">
                    <p id={`${id}-${item.id}`} className="px-3 pb-0.5 text-sm font-semibold text-muted">
                      {item.label}
                    </p>
                    <ul aria-labelledby={`${id}-${item.id}`} className="space-y-0.5 border-s-2 border-sage-200 ps-2">
                      {item.items.map((sub) => (
                        <li key={sub.href}>{renderLink(sub)}</li>
                      ))}
                    </ul>
                  </li>
                ),
              )}
            </ul>
          </nav>
          {showJoin && joinHref && (
            <div className="px-3 pb-3">
              <Link href={joinHref} className={buttonClass("gold", "lg", "press w-full")} onClick={onClose}>
                {labels.join}
              </Link>
            </div>
          )}

          <div className="space-y-4 border-t border-line px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div>
              <p className="mb-2 text-sm font-semibold text-muted" aria-hidden="true">
                {labels.languageLabel}
              </p>
              <LanguageSwitch lang={lang} label={labels.languageLabel} size="lg" />
            </div>
            {social.length > 0 && (
              <div>
                <p id={`${id}-social`} className="mb-2 text-sm font-semibold text-muted">
                  {labels.socialLabel}
                </p>
                <ul aria-labelledby={`${id}-social`} className="flex flex-wrap gap-2">
                  {social.map((s) => (
                    <li key={s.platform}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-platform={s.platform}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-3 text-forest-800 hover:bg-sage-100"
                      >
                        <SocialIcon platform={s.platform} className="size-5" />
                        {s.label}
                        <span className="sr-only"> {labels.opensInNewTab}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
