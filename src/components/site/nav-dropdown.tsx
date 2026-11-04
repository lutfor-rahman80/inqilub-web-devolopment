"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { isActivePath, type HeaderLink } from "./nav";

/**
 * Disclosure dropdown (WAI-ARIA "disclosure navigation menu"): a button with
 * aria-expanded/aria-controls that shows a list of links. Click or
 * Enter/Space toggles; ↓/↑ open it and move through the links; Home/End jump
 * to the first/last link; Escape closes it and returns focus to the button;
 * clicking outside or tabbing away closes it.
 */
export function useDisclosureMenu(resetKey: string) {
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === resetKey; // a navigation (new resetKey) closes it
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const focusOnOpen = useRef<"first" | "last" | null>(null);

  const items = useCallback(
    () => Array.from(panelRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []),
    [],
  );
  const setOpen = useCallback((value: boolean) => setOpenFor(value ? resetKey : null), [resetKey]);
  const close = useCallback(
    (returnFocus: boolean) => {
      setOpenFor(null);
      if (returnFocus) buttonRef.current?.focus();
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    const target = focusOnOpen.current;
    focusOnOpen.current = null;
    if (target) {
      const list = items();
      (target === "first" ? list[0] : list[list.length - 1])?.focus();
    }
    const onPointerDown = (e: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpenFor(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, items]);

  const onButtonKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (open) {
        const list = items();
        (e.key === "ArrowDown" ? list[0] : list[list.length - 1])?.focus();
      } else {
        focusOnOpen.current = e.key === "ArrowDown" ? "first" : "last";
        setOpen(true);
      }
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      close(false);
    }
  };

  const onPanelKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    let next: HTMLElement | undefined;
    if (e.key === "ArrowDown") next = list[(index + 1) % list.length];
    else if (e.key === "ArrowUp") next = list[(index - 1 + list.length) % list.length];
    else if (e.key === "Home") next = list[0];
    else if (e.key === "End") next = list[list.length - 1];
    else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close(true);
      return;
    }
    if (next) {
      e.preventDefault();
      next.focus();
    }
  };

  const onWrapperBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    // Focus moved outside (Tab / Shift+Tab): close without stealing focus back.
    if (open && e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) setOpenFor(null);
  };

  return { open, setOpen, close, wrapperRef, buttonRef, panelRef, onButtonKeyDown, onPanelKeyDown, onWrapperBlur };
}

/** A header dropdown whose items are site links (e.g. Activities ▾, Media ▾). */
export function NavDropdown({
  id,
  label,
  items,
  pathname,
  sizeClass = "px-2 xl:px-2.5",
}: {
  id: string;
  label: string;
  items: HeaderLink[];
  pathname: string;
  /** Padding / font size of the button, matching the header's other menu items. */
  sizeClass?: string;
}) {
  const { open, setOpen, wrapperRef, buttonRef, panelRef, onButtonKeyDown, onPanelKeyDown, onWrapperBlur } = useDisclosureMenu(pathname);
  const uid = useId();
  const panelId = `nav-${id}-${uid.replace(/:/g, "")}`;
  const active = items.some((i) => !i.external && isActivePath(pathname, i.href));

  return (
    <div ref={wrapperRef} className="relative" onBlur={onWrapperBlur}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        onKeyDown={onButtonKeyDown}
        data-active={active || undefined}
        className={`press inline-flex min-h-11 items-center gap-1 whitespace-nowrap rounded-lg font-medium transition-colors hover:bg-sage-100 hover:text-forest-800 ${sizeClass} ${
          active ? "text-forest-800 underline decoration-gold-500 decoration-2 underline-offset-8" : "text-ink"
        } ${open ? "bg-sage-100" : ""}`}
      >
        {label}
        <ChevronDown className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          onKeyDown={onPanelKeyDown}
          className="animate-menu absolute start-0 top-full z-50 mt-2 min-w-56 rounded-xl border border-line bg-white p-1.5 shadow-[var(--shadow-lift)]"
        >
          <ul>
            {items.map((item) => (
              <li key={item.href}>
                <MenuLink item={item} pathname={pathname} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function MenuLink({ item, pathname, children }: { item: HeaderLink; pathname: string; children?: ReactNode }) {
  const current = !item.external && isActivePath(pathname, item.href);
  return (
    <Link
      href={item.href}
      aria-current={current ? "page" : undefined}
      className={`flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-base transition-colors hover:bg-sage-100 hover:text-forest-800 ${
        current ? "bg-sage-100 font-semibold text-forest-800" : "text-ink"
      }`}
    >
      {children ?? item.label}
    </Link>
  );
}
