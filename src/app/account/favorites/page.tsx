import Link from "next/link";
import { MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SportBadge } from "@/components/sport/sport-badge";
import { FavoriteButton } from "@/components/favorite-button";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { parseJSON, formatGEL } from "@/lib/utils";

export default async function FavoritesPage() {
  const user = await requireUser("/account/favorites");
  const t = await getTranslations("accountBookings");

  const ACCOUNT_NAV = [
    { href: "/account/bookings", label: t("title") },
    { href: "/account/favorites", label: "Favorites" },
    { href: "/account/profile", label: t("profile") },
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

  return (
    <DashboardShell title="Favorites" nav={ACCOUNT_NAV} current="/account/favorites">
      {favorites.length === 0 ? (
        <Card>
          <CardContent className="text-center text-sm text-muted">
            No favorites yet. Tap the heart on any venue to save it here.
            <div className="mt-3">
              <Link href="/venues" className="text-brand-600 hover:underline">
                Browse venues →
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((fav) => {
            const venue = fav.venue;
            const photos = parseJSON<string[]>(venue.photos, []);
            const minPrice = venue.facilities.length
              ? Math.min(...venue.facilities.map((f) => f.pricePerHourGEL))
              : null;
            const sportTags = Array.from(
              new Map(venue.facilities.map((f) => [f.sport.id, f.sport])).values(),
            );
            return (
              <div key={fav.id} className="relative">
                <Link href={`/venues/${venue.slug}`}>
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
                      {sportTags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {sportTags.slice(0, 3).map((s) => (
                            <SportBadge key={s.id} name={s.name} />
                          ))}
                        </div>
                      )}
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
                <div className="absolute right-3 top-3">
                  <FavoriteButton
                    venueId={venue.id}
                    initialFavorited
                    redirectTo="/account/favorites"
                    size="sm"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
