import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/seo";

// Always generate at request time so we never query Prisma during the build
// (the DB URL differs between local SQLite and production Postgres).
export const dynamic = "force-dynamic";
export const revalidate = 3600;

/**
 * Dynamic sitemap. Includes static landing pages plus one URL per approved
 * venue and per active sport. Vercel revalidates on every request to /sitemap.xml
 * so additions are picked up immediately without a redeploy.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const [venues, sports] = await Promise.all([
    prisma.venue.findMany({
      where: { status: "APPROVED" },
      select: { slug: true, createdAt: true },
    }),
    prisma.sport.findMany({
      where: { isActive: true },
      select: { slug: true },
    }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: absoluteUrl("/venues"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/sports"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/register"), lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: absoluteUrl("/login"), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: absoluteUrl("/terms"), lastModified: now, changeFrequency: "monthly", priority: 0.2 },
    { url: absoluteUrl("/privacy"), lastModified: now, changeFrequency: "monthly", priority: 0.2 },
  ];

  const sportRoutes: MetadataRoute.Sitemap = sports.map((s) => ({
    url: absoluteUrl(`/sports/${s.slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const venueRoutes: MetadataRoute.Sitemap = venues.map((v) => ({
    url: absoluteUrl(`/venues/${v.slug}`),
    lastModified: v.createdAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...sportRoutes, ...venueRoutes];
}
