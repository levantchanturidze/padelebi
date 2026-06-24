"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  loadStoredPosition,
  saveStoredPosition,
  clearStoredPosition,
  type Position,
} from "@/lib/geo";

/**
 * State machine for the user's geolocation. The provider hydrates from
 * localStorage (Phase 6 stores a 30-minute-stale fix) and exposes a
 * one-shot request that calls browser geolocation.
 */
export type PositionState =
  | { status: "idle"; position: null; error: null }
  | { status: "loading"; position: null; error: null }
  | { status: "granted"; position: Position; error: null }
  | { status: "denied"; position: null; error: string };

type PositionApi = PositionState & {
  request(): void;
  clear(): void;
};

const PositionContext = createContext<PositionApi | null>(null);

export function PositionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PositionState>({ status: "idle", position: null, error: null });

  // Hydrate from localStorage on mount.
  useEffect(() => {
    const cached = loadStoredPosition();
    if (cached) {
      setState({ status: "granted", position: cached, error: null });
    }
  }, []);

  const request = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setState({ status: "denied", position: null, error: "unavailable" });
      return;
    }
    setState({ status: "loading", position: null, error: null });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next: Position = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          acquiredAt: Date.now(),
        };
        saveStoredPosition(next);
        setState({ status: "granted", position: next, error: null });
      },
      (err) => {
        const reason =
          err.code === err.PERMISSION_DENIED
            ? "denied"
            : err.code === err.POSITION_UNAVAILABLE
              ? "unavailable"
              : "timeout";
        setState({ status: "denied", position: null, error: reason });
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }, []);

  const clear = useCallback(() => {
    clearStoredPosition();
    setState({ status: "idle", position: null, error: null });
  }, []);

  const value = useMemo<PositionApi>(() => ({ ...state, request, clear }), [state, request, clear]);
  return <PositionContext.Provider value={value}>{children}</PositionContext.Provider>;
}

export function usePosition(): PositionApi {
  const ctx = useContext(PositionContext);
  if (!ctx) {
    // Defensive: outside a provider, behave as if geolocation is idle.
    return {
      status: "idle",
      position: null,
      error: null,
      request: () => undefined,
      clear: () => undefined,
    };
  }
  return ctx;
}
