/**
 * Geo helpers — Haversine distance, distance formatting, and a simple
 * localStorage-backed cache for the user's latest known position.
 *
 * Browser-only: the localStorage helpers no-op on the server. The math
 * helpers are pure and work anywhere.
 */

const EARTH_R_KM = 6371;

const STORAGE_KEY = "playtora.pos.v1";
const POSITION_TTL_MS = 30 * 60_000; // 30 minutes

export type Position = {
  /** Latitude in decimal degrees. */
  lat: number;
  /** Longitude in decimal degrees. */
  lng: number;
  /** Epoch ms when this fix was acquired. */
  acquiredAt: number;
};

/** Haversine distance in kilometres. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R_KM * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Format a distance for venue cards. Sub-1km shows metres, otherwise km
 * with one decimal. Caps at 999 km so cross-continent results don't read
 * as a precise number.
 */
export function formatDistance(km: number, locale: "en" | "ka" = "en"): string {
  if (km > 999) return locale === "ka" ? "შორს" : "Far";
  if (km < 1) {
    const m = Math.round(km * 1000);
    return locale === "ka" ? `${m} მ` : `${m} m`;
  }
  const fmt = km < 10 ? km.toFixed(1) : km.toFixed(0);
  return locale === "ka" ? `${fmt} კმ` : `${fmt} km`;
}

// ────────────────────────────────────────────────────────────────────────
// localStorage cache — survives reloads, expires after POSITION_TTL_MS.
// All helpers are SSR-safe (return null when window is undefined).
// ────────────────────────────────────────────────────────────────────────

export function loadStoredPosition(): Position | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Position;
    if (
      typeof parsed.lat !== "number" ||
      typeof parsed.lng !== "number" ||
      typeof parsed.acquiredAt !== "number"
    ) return null;
    if (Date.now() - parsed.acquiredAt > POSITION_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredPosition(p: Position): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // Quota / private-mode — silently ignore.
  }
}

export function clearStoredPosition(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export const POSITION_STALENESS_MS = POSITION_TTL_MS;
