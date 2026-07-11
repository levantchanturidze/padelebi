import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Content-Security-Policy. Inline scripts are still required (the pre-hydration
 * theme script and schema.org JSON-LD blocks), so 'unsafe-inline' stays on
 * script-src — but the actual JSON-LD XSS is fixed at the source via
 * serializeJsonLd(). maplibre needs blob: workers; OSM raster tiles + Vercel
 * Blob images load over https. reCAPTCHA needs google/gstatic + a frame.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "worker-src 'self' blob:",
  "frame-src https://www.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.vercel-storage.com" },
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  async redirects() {
    return [
      // ── Primary-domain enforcement ──────────────────────────────────
      // playtora.vercel.app and www.playtora.ge → playtora.ge (301).
      // Preserves SEO value from the old deployment URL and avoids
      // duplicate-content penalties from Google.
      {
        source: "/:path*",
        has: [{ type: "host", value: "playtora.vercel.app" }],
        destination: "https://playtora.ge/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.playtora.ge" }],
        destination: "https://playtora.ge/:path*",
        permanent: true,
      },

      // ── Phase 1 rename: legacy Padelebi URLs → new sport-neutral ones ─
      // Query strings are preserved automatically by Next.
      { source: "/clubs", destination: "/venues", permanent: true },
      { source: "/clubs/:slug", destination: "/venues/:slug", permanent: true },

      // Manager dashboard: /club* → /manager*
      { source: "/club", destination: "/manager", permanent: true },
      { source: "/club/bookings", destination: "/manager/bookings", permanent: true },
      { source: "/club/:venueId", destination: "/manager/:venueId", permanent: true },

      // Admin: /admin/clubs → /admin/venues
      { source: "/admin/clubs", destination: "/admin/venues", permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
