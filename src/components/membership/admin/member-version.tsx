"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * The member record's last known `updated_at`, shared by the edit form and the
 * photo manager on the member page. The form sends it for optimistic locking;
 * every successful save (form or photo) reports the new value here, so the
 * user's own changes never look like someone else's concurrent edit, even
 * before the refreshed page arrives from the server.
 *
 * `photoBusy` is true while a photo upload/removal is on its way: the form
 * waits for it, because saving in between would send the version from before
 * the photo change and be refused as a conflict.
 */
type Version = { value: string; set: (next: string) => void; photoBusy: boolean; setPhotoBusy: (busy: boolean) => void };

const MemberVersionContext = createContext<Version | null>(null);

export function MemberVersionProvider({ value, children }: { value: string; children: ReactNode }) {
  const [state, setState] = useState({ fromServer: value, current: value });
  const [photoBusy, setPhotoBusy] = useState(false);
  // A newer server render (refresh / revalidation) wins over what we knew.
  let current = state.current;
  if (state.fromServer !== value) {
    current = value > state.current ? value : state.current;
    setState({ fromServer: value, current });
  }
  return (
    <MemberVersionContext.Provider
      value={{
        value: current,
        set: (next) => setState((s) => ({ ...s, current: next > s.current ? next : s.current })),
        photoBusy,
        setPhotoBusy,
      }}
    >
      {children}
    </MemberVersionContext.Provider>
  );
}

export function useMemberVersion(): Version | null {
  return useContext(MemberVersionContext);
}
