import Link from "next/link";
import { MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SportBadge } from "@/components/sport/sport-badge";
import { FavoriteButton } from "@/components/favorite-button";
import { VenuesView, VenueCardSync } from "@/components/map/VenuesView";
import type { MapVenue } from "@/components/map/types";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { parseJSON, formatGEL } from "@/lib/utils";
import { tSportName } from "@/lib/sports";

export default async function FavoritesPage() {
  const user = await requireUser("/account/favorites");
  const [t, tBookings] = await Promise.all([
    getTranslations(),
    getTranslations("accountBookings"),
  ]);

  const ACCOUNT_NAV = [
    { href: "/account/bookings", label: tBookings("title") },
    { href: "/account/favorites", label: t("favorites.title") },
    { href: "/account/profile", label: tBookings("profile") },
  ];

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      venue: {
        include: {
          facilities: {
            where: { isActive: true },
            include: { sport: true },
          },
        },
      },
    },
  });

  const mapVenues: MapVenue[] = favorites
    .filter((f): f is typeof f & { venue: typeof f.venue & { lat: number; lng: number } } =>
      typeof f.venue.lat === "number" && typeof f.venue.lng === "number",
    )
    .map((f) => {
      const v = f.venue;
      const sportTags = Array.from(
        new Map(v.facilities.map((fac) => [fac.sport.id, fac.sport])).values(),
      );
      const minPrice = v.facilities.length
        ? Math.min(...v.facilities.map((fac) => fac.pricePerHourGEL))
        : null;
      return {
        id: v.id,
        slug: v.slug,
        name: v.name,
        city: v.city,
        lat: v.lat,
        lng: v.lng,
        minPriceGEL: minPrice,
        sports: sportTags.map((s) => ({ slug: s.slug, name: s.name })),
        primarySportSlug: sportTags[0]?.slug ?? "default",
      };
    });

  const venueDetails = new Map(
    favorites.map((f) => {
      const v = f.venue;
      const sportTags = Array.from(
        new Map(v.facilities.map((fac) => [fac.sport.id, fac.sport])).values(),
      );
      return [
        v.id,
        {
          photos: parseJSON<string[]>(v.photos, []),
          minPrice: v.facilities.length
            ? Math.min(...v.facilities.map((fac) => fac.pricePerHourGEL))
            : null,
          facilityCount: v.facilities.length,
          sportTags,
        },
      ];
    }),
  );

  const renderList = (vs: (typeof mapVenues[number] & { distanceKm?: number })[]) => (
    <div className="grid gap-4 sm:grid-cols-2">
      {vs.map((v) => {
        const det = venueDetails.get(v.id);
        if (!det) return null;
        const facilityCountLabel =
          det.facilityCount === 1
            ? t("favorites.facilitiesOne")
            : t("favorites.facilitiesMany", { count: det.facilityCount });
        return (
          <div key={v.id} className="relative">
            <VenueCardSync venueId={v.id} distanceKm={v.distanceKm}>
              <Link href={`/venues/${v.slug}`}>
                <Card className="overflow-hidden transition-shadow hover:shadow-md">
                  <div
                    className="h-40 bg-brand-100 bg-cover bg-center"
                    style={det.photos[0] ? { backgroundImage: `url(${det.photos[0]})` } : undefined}
                  />
                  <CardContent>
                    <h3 className="font-semibold">{v.name}</h3>
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                      <MapPin className="h-3.5 w-3.5" /> {v.city}
                    </p>
                    {det.sportTags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {det.sportTags.slice(0, 3).map((s) => (
                          <SportBadge key={s.id} name={tSportName(t, s.slug)} slug={s.slug} />
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <Badge tone="brand">{facilityCountLabel}</Badge>
                      {det.minPrice !== null && (
                        <span className="text-sm font-medium">
                          {t("favorites.fromPrice", { price: formatGEL(det.minPrice) })}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </VenueCardSync>
            <div className="absolute right-3 top-3 z-10">
              <FavoriteButton
                venueId={v.id}
                initialFavorited
                redirectTo="/account/favorites"
                size="sm"
              />
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <DashboardShell title={t("favorites.title")} nav={ACCOUNT_NAV} current="/account/favorites">
      {favorites.length === 0 ? (
        <Card>
          <CardContent className="text-center text-sm text-muted">
            {t("favorites.empty")}
            <div className="mt-3">
              <Link href="/venues" className="text-cobalt-600 hover:underline">
                {t("favorites.browseVenues")} →
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <VenuesView renderList={renderList} venues={mapVenues} />
      )}
    </DashboardShell>
  );
}
