"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Horizontal chip list (phones) that keeps the current chip
 * (aria-current="page") in view, e.g. when /gallery?category=… is opened
 * from a link. Only the list scrolls, never the page.
 */
export function ChipScroller({ active, className, children }: { active: string | null; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const first = useRef(true);

  useEffect(() => {
    const list = ref.current;
    const current = list?.querySelector<HTMLElement>('[aria-current="page"]')?.closest("li");
    const initial = first.current;
    first.current = false;
    if (!list || !current || list.scrollWidth <= list.clientWidth) return;
    const left = current.offsetLeft;
    const right = left + current.offsetWidth;
    const visible = left >= list.scrollLeft && right <= list.scrollLeft + list.clientWidth;
    if (visible) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollTo({
      left: Math.max(0, left - (list.clientWidth - current.offsetWidth) / 2),
      behavior: initial || reduced ? "auto" : "smooth",
    });
  }, [active]);

  return (
    <ul ref={ref} className={`relative ${className ?? ""}`}>
      {children}
    </ul>
  );
}
