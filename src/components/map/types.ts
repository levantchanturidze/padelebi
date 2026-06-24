/**
 * Lightweight, server-safe view of a venue for the map layer. Pages serialize
 * their venue rows into this shape before passing to the (client-only) map.
 */
export type MapVenue = {
  id: string;
  slug: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  minPriceGEL: number | null;
  sports: { slug: string; name: string }[];
  /** Primary sport slug for the pin icon. */
  primarySportSlug: string;
};
