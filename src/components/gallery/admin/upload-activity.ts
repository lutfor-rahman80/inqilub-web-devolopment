"use client";

import { useSyncExternalStore } from "react";

/**
 * Tiny shared flag: is a browser upload running on this page? The folder
 * sync button is disabled meanwhile (sync also skips reserved upload names,
 * so this is only to avoid confusion).
 */
let busy = false;
const listeners = new Set<() => void>();

export function setUploadBusy(value: boolean) {
  if (busy === value) return;
  busy = value;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUploadBusy(): boolean {
  return useSyncExternalStore(subscribe, () => busy, () => false);
}
