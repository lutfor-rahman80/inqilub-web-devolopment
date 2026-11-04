"use client";

import { useEffect } from "react";

export const UNSAVED_CHANGES_MESSAGE =
  "এই পাতায় সংরক্ষণ না করা পরিবর্তন আছে। এখন চলে গেলে পরিবর্তনগুলো হারিয়ে যাবে। তবুও চলে যাবেন?";

/** Same-tab link to another page of this site (what a client-side navigation would follow). */
function leavingLink(e: MouseEvent): boolean {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  const target = e.target instanceof Element ? e.target : null;
  const a = target?.closest("a[href]");
  if (!(a instanceof HTMLAnchorElement)) return false;
  if ((a.target && a.target !== "_self") || a.hasAttribute("download")) return false; // new tab: nothing is lost
  const url = new URL(a.href, window.location.href);
  if (url.origin !== window.location.origin) return false; // full page load: beforeunload asks
  return url.pathname !== window.location.pathname || url.search !== window.location.search;
}

/**
 * While `dirty`, asks before the user leaves a form with unsaved changes:
 * - reload, closing the tab or a link to another site: the browser's own
 *   "leave page?" prompt (beforeunload);
 * - links inside the panel (sidebar, section tabs, "back to list"): these are
 *   client-side navigations that never fire beforeunload, so the click is
 *   intercepted (capture phase, before next/link sees it) with a confirm.
 */
export function useUnsavedChangesGuard(dirty: boolean, message: string = UNSAVED_CHANGES_MESSAGE) {
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    const onClick = (e: MouseEvent) => {
      if (!leavingLink(e)) return;
      if (!window.confirm(message)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty, message]);
}
