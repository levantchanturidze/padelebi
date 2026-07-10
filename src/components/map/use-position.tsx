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
 * localStorage (Phase 6 stores a 30-minute-stale fix); if nothing is cached
 * but the signed-in user has a saved "home base", we fall back to it. A
 * live browser fix (via request()) always wins.
 *
 * `source` disambiguates where the current position came from so the UI can
 * badge it — e.g. "Using home base" until the user grants live location.
 */
export type PositionSource = "live" | "cached" | "home";

export type PositionState =
  | { status: "idle"; position: null; error: null; source: null }
  | { status: "loading"; position: null; error: null; source: null }
  | { status: "granted"; position: Position; error: null; source: PositionSource }
  | { status: "denied"; position: null; error: string; source: null };

type PositionApi = PositionState & {
  request(): void;
  clear(): void;
};

const PositionContext = createContext<PositionApi | null>(null);

export function PositionProvider({
  children,
  initialHome,
}: {
  children: ReactNode;
  /** Signed-in user's saved home base, if any. Used only as fallback. */
  initialHome?: { lat: number; lng: number } | null;
}) {
  const [state, setState] = useState<PositionState>({
    status: "idle",
    position: null,
    error: null,
    source: null,
  });

  // Hydrate on mount. Cached fix wins, otherwise fall back to home base.
  useEffect(() => {
    const cached = loadStoredPosition();
    if (cached) {
      setState({ status: "granted", position: cached, error: null, source: "cached" });
      return;
    }
    if (initialHome) {
      setState({
        status: "granted",
        position: { lat: initialHome.lat, lng: initialHome.lng, acquiredAt: Date.now() },
        error: null,
        source: "home",
      });
    }
    // If neither, stay idle — the "Enable location" button remains visible.
  }, [initialHome]);

  const request = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setState({ status: "denied", position: null, error: "unavailable", source: null });
      return;
    }
    setState({ status: "loading", position: null, error: null, source: null });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next: Position = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          acquiredAt: Date.now(),
        };
        saveStoredPosition(next);
        setState({ status: "granted", position: next, error: null, source: "live" });
      },
      (err) => {
        const reason =
          err.code === err.PERMISSION_DENIED
            ? "denied"
            : err.code === err.POSITION_UNAVAILABLE
              ? "unavailable"
              : "timeout";
        setState({ status: "denied", position: null, error: reason, source: null });
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }, []);

  const clear = useCallback(() => {
    clearStoredPosition();
    // Clearing the live/cached fix falls back to home if one is available.
    if (initialHome) {
      setState({
        status: "granted",
        position: { lat: initialHome.lat, lng: initialHome.lng, acquiredAt: Date.now() },
        error: null,
        source: "home",
      });
    } else {
      setState({ status: "idle", position: null, error: null, source: null });
    }
  }, [initialHome]);

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
      source: null,
      request: () => undefined,
      clear: () => undefined,
    };
  }
  return ctx;
}
