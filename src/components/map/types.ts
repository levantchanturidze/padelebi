/**
 * Lightweight, server-safe view of a venue for the map + list layer. Pages
 * serialize their venue rows into this shape before passing to the client.
 *
 * Everything here must be JSON-serializable — strings, numbers, primitives —
 * because it crosses the server → client boundary inside `VenuesView`.
 */
export type MapVenue = {
  id: string;
  slug: string;
  name: string;
  city: string;
  /** Null when the venue has no geocoded location — shown in the list but not on the map. */
  lat: number | null;
  lng: number | null;
  minPriceGEL: number | null;
  /** Translated sport names + slugs, pre-resolved server-side. */
  sports: { id: string; slug: string; name: string }[];
  /** Primary sport slug for the pin icon. */
  primarySportSlug: string;
  /** Cover photo URL, or null. */
  coverPhoto: string | null;
  /** Pre-rendered card metadata so VenuesView can paint cards client-side. */
  facilityCount: number;
  /** Pre-translated "{N} facilities" label. */
  facilityCountLabel: string;
  /** Pre-formatted price label, e.g. "from ₾60/hr". null if no facilities. */
  minPriceLabel: string | null;
};

/** A MapVenue guaranteed to carry coordinates — the shape the map layer needs. */
export type MapVenueWithCoords = MapVenue & { lat: number; lng: number };
