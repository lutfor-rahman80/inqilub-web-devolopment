"use client";

import { usePathname } from "next/navigation";
import type { MouseEvent, FocusEvent, PointerEvent } from "react";
import { LANG_COOKIE, LANG_COOKIE_MAX_AGE, LANGUAGE_NAME, LANGUAGE_SHORT, LOCALES, type Locale } from "@/i18n/config";
import { switchLocalePath } from "@/i18n/paths";

type Size = "sm" | "lg";

/** Language memory (functional cookie, 1 year): the proxy reads it only for a later visit to the bare "/". */
function rememberLanguage(target: Locale) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LANG_COOKIE}=${target}; Max-Age=${LANG_COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
}

/**
 * BN | EN segmented control. Each option links to the same page in that
 * language; the current query string (filters, page numbers) is appended at
 * the moment the link is used, so static pages need no useSearchParams.
 * Using it remembers the choice in the ijs_lang cookie, which the proxy reads
 * only for a later visit to the bare "/" (plan §5.4).
 * Accessible name = the visible "BN"/"EN" + the language name (WCAG 2.5.3).
 */
export function LanguageSwitch({ lang, label, size = "sm", className = "" }: { lang: Locale; label: string; size?: Size; className?: string }) {
  const pathname = usePathname() ?? "/";

  // Keep the visible page state: add ?query and #hash just before the browser follows the link
  // (also covers middle-click / open in new tab, which read the href on pointerdown / focus).
  const withQuery = (e: MouseEvent<HTMLAnchorElement> | FocusEvent<HTMLAnchorElement> | PointerEvent<HTMLAnchorElement>) => {
    const a = e.currentTarget;
    const base = a.dataset.base ?? a.getAttribute("href") ?? "/";
    a.setAttribute("href", `${base}${window.location.search}${window.location.hash}`);
  };

  const seg =
    size === "lg"
      ? "min-h-11 min-w-16 px-4 text-base"
      : "min-h-9 min-w-10 px-2.5 text-sm";

  return (
    <div role="group" aria-label={label} className={className}>
      <ul className="inline-flex items-center rounded-xl border border-line bg-white p-0.5">
        {LOCALES.map((target) => {
          const href = switchLocalePath(pathname, target);
          const active = target === lang;
          return (
            <li key={target}>
              <a
                href={href}
                data-base={href}
                hrefLang={target}
                lang={target}
                aria-current={active ? "true" : undefined}
                title={LANGUAGE_NAME[target]}
                onPointerDown={withQuery}
                onFocus={withQuery}
                onClick={(e) => {
                  withQuery(e);
                  rememberLanguage(target);
                }}
                className={`press inline-flex items-center justify-center rounded-[0.6rem] font-semibold tracking-wide transition-colors ${seg} ${
                  active ? "bg-forest-700 text-white" : "text-forest-800 hover:bg-sage-100"
                }`}
              >
                {LANGUAGE_SHORT[target]}
                <span className="sr-only"> – {LANGUAGE_NAME[target]}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
