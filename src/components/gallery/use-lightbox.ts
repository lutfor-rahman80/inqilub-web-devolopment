"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Lightbox open/close state that returns keyboard focus to the element that
 * opened it once the closing animation has finished.
 */
export function useLightbox() {
  const [index, setIndex] = useState(-1);
  const [mounted, setMounted] = useState(false);
  const opener = useRef<HTMLElement | null>(null);

  const open = useCallback((i: number, from?: HTMLElement | null) => {
    opener.current = from ?? (document.activeElement as HTMLElement | null);
    setMounted(true);
    setIndex(i);
  }, []);
  const close = useCallback(() => setIndex(-1), []);
  const exited = useCallback(() => {
    const el = opener.current;
    if (el && el.isConnected) el.focus({ preventScroll: true });
  }, []);

  return { index, isOpen: index >= 0, mounted, open, close, exited };
}

/** Warm up the lightbox chunk (e.g. on hover/focus) so the first open is instant. */
export function preloadLightbox() {
  void import("./photo-lightbox");
}
