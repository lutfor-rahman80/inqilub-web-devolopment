"use client";

import { useId } from "react";
import { ChevronDown, Share2 } from "lucide-react";
import { useDisclosureMenu } from "./nav-dropdown";
import { SocialIcon } from "./social-menu-icons";
import type { SocialItem } from "./nav";

export type SocialLabels = { label: string; menuLabel: string; opensInNewTab: string };

/**
 * “Social media ▾”: lists only the platforms with a saved, validated link
 * (each opens in a new tab). Renders nothing when there are none.
 */
export function SocialMenu({ items, labels, pathname }: { items: SocialItem[]; labels: SocialLabels; pathname: string }) {
  const { open, setOpen, wrapperRef, buttonRef, panelRef, onButtonKeyDown, onPanelKeyDown, onWrapperBlur } = useDisclosureMenu(pathname);
  const uid = useId();
  const panelId = `social-menu-${uid.replace(/:/g, "")}`;
  if (items.length === 0) return null;

  return (
    <div ref={wrapperRef} className="relative" onBlur={onWrapperBlur}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={labels.label}
        title={labels.label}
        onClick={() => setOpen(!open)}
        onKeyDown={onButtonKeyDown}
        className={`press inline-flex min-h-10 items-center gap-0.5 rounded-xl border border-line bg-white px-2 text-forest-800 transition-colors hover:bg-sage-100 ${
          open ? "bg-sage-100" : ""
        }`}
      >
        <Share2 className="size-5" aria-hidden="true" />
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          onKeyDown={onPanelKeyDown}
          className="animate-menu absolute end-0 top-full z-50 mt-2 min-w-56 rounded-xl border border-line bg-white p-1.5 shadow-[var(--shadow-lift)]"
        >
          <p className="px-3 pb-1 pt-1.5 text-sm font-semibold text-muted">{labels.menuLabel}</p>
          <ul aria-label={labels.menuLabel}>
            {items.map((item) => (
              <li key={item.platform}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-platform={item.platform}
                  className="flex min-h-11 items-center gap-3 whitespace-nowrap rounded-lg px-3 text-ink transition-colors hover:bg-sage-100 hover:text-forest-800"
                >
                  <SocialIcon platform={item.platform} className="size-5 shrink-0 text-forest-700" />
                  {item.label}
                  <span className="sr-only"> {labels.opensInNewTab}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
