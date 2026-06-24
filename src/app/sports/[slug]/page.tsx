import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SportBadge } from "@/components/sport/sport-badge";
import { prisma } from "@/lib/prisma";
import { parseJSON, formatGEL } from "@/lib/utils";
import { tSportName } from "@/lib/sports";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sport = await prisma.sport.findUnique({ where: { slug } });
  if (!sport) return { title: "Sport not found" };
  return {
    title: `${sport.name} — Playtora`,
    description: `Book ${sport.name.toLowerCase()} venues instantly on Playtora.`,
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
  const t = await getTranslations();

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

  const sportName = tSportName(t, sport.slug);
  const venueCountLabel =
    venues.length === 0
      ? t("sportsPage.emptyVenues")
      : venues.length === 1
        ? t("sportsPage.venuesOne")
        : t("sportsPage.venuesMany", { count: venues.length });

  return (
    <Container className="py-8 sm:py-12">
      <Link
        href="/sports"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("sportsPage.allSports")}
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{sportName}</h1>
          <p className="mt-1 text-muted">{venueCountLabel}</p>
        </div>
        <Link
          href={`/venues?sport=${sport.slug}`}
          className="text-sm font-medium text-brand-600 hover:underline"
        >
          {t("sportsPage.advancedSearch")} →
        </Link>
      </div>

      {venues.length === 0 ? (
        <Card className="mt-10">
          <CardContent className="text-center text-sm text-muted">
            {t.rich("sportsPage.noVenuesForSport", {
              sport: sportName,
            })}{" "}
            <Link href="/register" className="text-brand-600 hover:underline">
              {t("sportsPage.listYours")}
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue) => {
            const photos = parseJSON<string[]>(venue.photos, []);
            const minPrice = venue.facilities.length
              ? Math.min(...venue.facilities.map((c) => c.pricePerHourGEL))
              : null;
            const facilityCountLabel =
              venue.facilities.length === 1
                ? t("sportsPage.facilitiesOne")
                : t("sportsPage.facilitiesMany", { count: venue.facilities.length });
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
                      <SportBadge name={sportName} />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <Badge tone="brand">{facilityCountLabel}</Badge>
                      {minPrice !== null && (
                        <span className="text-sm font-medium">
                          {t("favorites.fromPrice", { price: formatGEL(minPrice) })}
                        </span>
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
