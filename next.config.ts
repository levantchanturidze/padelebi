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
    // Phase 1 rename: preserve old URLs from when the app was Padelebi (padel-only).
    // Query strings are preserved automatically by Next.
    return [
      // Public listing: /clubs → /venues
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
