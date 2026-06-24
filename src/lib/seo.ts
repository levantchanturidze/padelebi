/**
 * Single source of truth for site URLs, canonical paths, and OG image paths.
 *
 * When the domain split lands in Phase 8 (playtora.app + playtora.ge) we only
 * need to change `SITE_URL` resolution here, not every page that builds a URL.
 */

/**
 * Production site URL. Configured via env so previews and prod can differ.
 * Phase 8 will derive this from request headers (geo / locale).
 */
export const SITE_URL: string =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://playtora.vercel.app";

export const SITE_NAME = "Playtora";
export const TWITTER_HANDLE = "@playtora";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

/** Absolute URL for a route. */
export function absoluteUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${p}`;
}

/** Canonical URL for a path. */
export function canonical(path: string): string {
  return absoluteUrl(path);
}

/** OG image URL for a venue's dynamic image. */
export function venueOgImage(slug: string): string {
  return absoluteUrl(`/api/og/venue/${encodeURIComponent(slug)}`);
}

/** OG image URL for a sport's dynamic image. */
export function sportOgImage(slug: string): string {
  return absoluteUrl(`/api/og/sport/${encodeURIComponent(slug)}`);
}

/**
 * Map a next-intl locale to an OG locale tag.
 */
export function ogLocale(locale: string | undefined): "en_US" | "ka_GE" {
  return locale === "ka" ? "ka_GE" : "en_US";
}
