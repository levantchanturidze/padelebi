"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

/**
 * Two-way card ↔ pin sync. The currently-hovered or focused venue ID is
 * shared between the venue list and the map; both surfaces highlight it.
 */
type SyncState = {
  activeId: string | null;
  setActiveId: (id: string | null) => void;
};

const SyncContext = createContext<SyncState | null>(null);

export function MapSyncProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const value = useMemo(() => ({ activeId, setActiveId }), [activeId]);
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useMapSync(): SyncState {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    // Defensive: outside the provider, a noop sync is harmless.
    return { activeId: null, setActiveId: () => undefined };
  }
  return ctx;
}
