import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.vercel-storage.com" },
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
    ],
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
