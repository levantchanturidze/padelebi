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
import { tSportName } from "@/lib/sports";
import { userAreaNav } from "@/lib/user-nav";

/**
 * Favorites — server-rendered grid with a heart button per card. We don't
 * use VenuesView here because the heart action lives on top of each card,
 * which would require a per-card extra slot prop that VenuesView doesn't
 * currently expose. Map view for favorites can be added in a follow-up.
 */
export default async function FavoritesPage() {
  const user = await requireUser("/account/favorites");
  const [t, tNav] = await Promise.all([
    getTranslations(),
    getTranslations("nav"),
  ]);

  const ACCOUNT_NAV = userAreaNav(tNav, user.role);

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((fav) => {
            const v = fav.venue;
            const photos = parseJSON<string[]>(v.photos, []);
            const sportTags = Array.from(
              new Map(v.facilities.map((fac) => [fac.sport.id, fac.sport])).values(),
            );
            const minPrice = v.facilities.length
              ? Math.min(...v.facilities.map((fac) => fac.pricePerHourGEL))
              : null;
            const facilityCount = v.facilities.length;
            const facilityCountLabel =
              facilityCount === 1
                ? t("favorites.facilitiesOne")
                : t("favorites.facilitiesMany", { count: facilityCount });

            return (
              <div key={fav.id} className="relative">
                <Link href={`/venues/${v.slug}`}>
                  <Card className="overflow-hidden transition-shadow hover:shadow-md">
                    <div
                      className="h-40 bg-brand-100 bg-cover bg-center"
                      style={photos[0] ? { backgroundImage: `url(${photos[0]})` } : undefined}
                    />
                    <CardContent>
                      <h3 className="font-semibold">{v.name}</h3>
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                        <MapPin className="h-3.5 w-3.5" /> {v.city}
                      </p>
                      {sportTags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {sportTags.slice(0, 3).map((s) => (
                            <SportBadge key={s.id} name={tSportName(t, s.slug)} slug={s.slug} />
                          ))}
                        </div>
                      )}
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
      )}
    </DashboardShell>
  );
}
