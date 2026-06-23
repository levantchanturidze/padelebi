import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SportBadge } from "@/components/sport/sport-badge";
import { prisma } from "@/lib/prisma";
import { parseJSON, formatGEL } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sport = await prisma.sport.findUnique({ where: { slug } });
  if (!sport) return { title: "Sport not found" };
  return {
    title: `${sport.name} venues — Playtora`,
    description: `Book ${sport.name.toLowerCase()} venues instantly. Real-time availability, transparent pricing.`,
  };
}

export default async function SportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ city?: string }>;
}) {
  const { slug } = await params;
  const { city } = await searchParams;

  const sport = await prisma.sport.findUnique({ where: { slug } });
  if (!sport) notFound();

  const venues = await prisma.venue.findMany({
    where: {
      status: "APPROVED",
      ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
      facilities: { some: { sportId: sport.id, isActive: true } },
    },
    include: {
      facilities: {
        where: { sportId: sport.id, isActive: true },
        include: { sport: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <Container className="py-8 sm:py-12">
      <Link
        href="/sports"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All sports
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{sport.name}</h1>
          <p className="mt-1 text-muted">
            {venues.length === 0
              ? "No venues yet — be the first to list yours."
              : `${venues.length} ${venues.length === 1 ? "venue" : "venues"} accepting bookings`}
          </p>
        </div>
        <Link
          href={`/venues?sport=${sport.slug}`}
          className="text-sm font-medium text-brand-600 hover:underline"
        >
          Advanced search →
        </Link>
      </div>

      {venues.length === 0 ? (
        <Card className="mt-10">
          <CardContent className="text-center text-sm text-muted">
            We&apos;re onboarding {sport.name.toLowerCase()} venues now. Check back soon — or{" "}
            <Link href="/register" className="text-brand-600 hover:underline">list yours</Link>.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue) => {
            const photos = parseJSON<string[]>(venue.photos, []);
            const minPrice = venue.facilities.length
              ? Math.min(...venue.facilities.map((c) => c.pricePerHourGEL))
              : null;
            return (
              <Link key={venue.id} href={`/venues/${venue.slug}`}>
                <Card className="overflow-hidden transition-shadow hover:shadow-md">
                  <div
                    className="h-40 bg-brand-100 bg-cover bg-center"
                    style={photos[0] ? { backgroundImage: `url(${photos[0]})` } : undefined}
                  />
                  <CardContent>
                    <h3 className="font-semibold">{venue.name}</h3>
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                      <MapPin className="h-3.5 w-3.5" /> {venue.city}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <SportBadge name={sport.name} />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <Badge tone="brand">
                        {venue.facilities.length} {venue.facilities.length === 1 ? "facility" : "facilities"}
                      </Badge>
                      {minPrice !== null && (
                        <span className="text-sm font-medium">from {formatGEL(minPrice)}/hr</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </Container>
  );
}
