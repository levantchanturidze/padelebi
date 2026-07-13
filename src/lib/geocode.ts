/**
 * Address → coordinates via OpenStreetMap's Nominatim service. Free, no API
 * key, and consistent with the OSM tiles the map layer already uses.
 *
 * Nominatim's usage policy requires a descriptive User-Agent and low request
 * volume — venue create/edit is a rare, human-initiated action, so this stays
 * well within limits. Failures are swallowed (returns null): geocoding is a
 * best-effort enrichment and must never block a save.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export type GeocodeInput = {
  address: string;
  city: string;
  district?: string | null;
};

export async function geocodeVenue(
  input: GeocodeInput,
): Promise<{ lat: number; lng: number } | null> {
  const query = [input.address, input.district, input.city]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(", ");
  if (!query) return null;

  const url = `${NOMINATIM_URL}?${new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
    countrycodes: "ge", // platform is Georgia-only; prevents e.g. US "Georgia" hits
  })}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Playtora/1.0 (https://playtora.ge)",
        "Accept-Language": "en",
      },
      // Never let a slow geocoder hang the form submission.
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    const hit = data[0];
    if (!hit) return null;

    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}
