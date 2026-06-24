"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, List, Map as MapIcon } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SportBadge } from "@/components/sport/sport-badge";
import { MapSyncProvider, useMapSync } from "./sync-context";
import { PositionProvider, usePosition } from "./use-position";
import { NearMeButton } from "./NearMeButton";
import { RadiusFilter } from "./RadiusFilter";
import type { MapVenue } from "./types";
import { distanceKm, formatDistance } from "@/lib/geo";

const VenueMap = dynamic(() => import("./VenueMap").then((m) => m.VenueMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-background" />,
});

/**
 * Client wrapper for venue-listing surfaces (/venues, /sports/[slug],
 * /account/favorites). Receives a JSON-serializable MapVenue[] from the
 * server and renders both the list and the map. Re-sorts by distance and
 * filters by radius client-side once geolocation is granted.
 *
 * All card data lives inside MapVenue so we never pass functions across
 * the server → client boundary (which Next.js disallows).
 */
export function VenuesView({
  venues,
  initialCenter,
  initialZoom,
  emptyMessage,
}: {
  venues: MapVenue[];
  initialCenter?: [number, number];
  initialZoom?: number;
  emptyMessage?: string;
}) {
  return (
    <PositionProvider>
      <MapSyncProvider>
        <VenuesViewInner
          venues={venues}
          initialCenter={initialCenter}
          initialZoom={initialZoom}
          emptyMessage={emptyMessage}
        />
      </MapSyncProvider>
    </PositionProvider>
  );
}

function VenuesViewInner({
  venues,
  initialCenter,
  initialZoom,
  emptyMessage,
}: {
  venues: MapVenue[];
  initialCenter?: [number, number];
  initialZoom?: number;
  emptyMessage?: string;
}) {
  const t = useTranslations("map");
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const { position } = usePosition();

  const displayVenues = useMemo(() => {
    if (!position) return venues.map((v) => ({ ...v, distanceKm: undefined as number | undefined }));
    const annotated = venues
      .map((v) => ({ ...v, distanceKm: distanceKm(position, v) }))
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    if (radiusKm === null) return annotated;
    return annotated.filter((v) => (v.distanceKm ?? 0) <= radiusKm);
  }, [venues, position, radiusKm]);

  const mapVenuesForMap = useMemo(
    () => displayVenues.map(({ distanceKm: _d, ...rest }) => rest),
    [displayVenues],
  );

  return (
    <div>
      {/* Geo controls */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <NearMeButton />
        <RadiusFilter value={radiusKm} onChange={setRadiusKm} />
      </div>

      {/* Mobile toggle */}
      <div className="mb-3 flex lg:hidden">
        <div className="inline-flex rounded-full border border-border bg-surface p-0.5">
          <button
            type="button"
            onClick={() => setMobileView("list")}
            className={[
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold transition-colors",
              mobileView === "list" ? "bg-foreground text-white" : "text-muted hover:text-foreground",
            ].join(" ")}
          >
            <List className="h-3.5 w-3.5" />
            {t("list")}
          </button>
          <button
            type="button"
            onClick={() => setMobileView("map")}
            className={[
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold transition-colors",
              mobileView === "map" ? "bg-foreground text-white" : "text-muted hover:text-foreground",
            ].join(" ")}
          >
            <MapIcon className="h-3.5 w-3.5" />
            {t("map")}
          </button>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[1.4fr_1fr] lg:gap-6">
        <div className={mobileView === "map" ? "hidden lg:block" : ""}>
          {displayVenues.length === 0 ? (
            <p className="py-16 text-center text-muted">
              {emptyMessage ?? t("noVenuesWithCoords")}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {displayVenues.map((v) => (
                <VenueResultCard key={v.id} venue={v} distanceKm={v.distanceKm} />
              ))}
            </div>
          )}
        </div>

        <div
          className={[
            mobileView === "list" ? "hidden lg:block" : "block",
            "lg:sticky lg:top-20 lg:self-start",
            "h-[60vh] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface lg:h-[calc(100vh-7rem)]",
          ].join(" ")}
        >
          <VenueMap
            venues={mapVenuesForMap}
            initialCenter={initialCenter}
            initialZoom={initialZoom}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Self-contained venue card. All data comes from MapVenue (server-built),
 * the only client-side enrichment is the distance badge + hover sync.
 */
function VenueResultCard({
  venue,
  distanceKm,
}: {
  venue: MapVenue;
  distanceKm: number | undefined;
}) {
  const locale = useLocale();
  const t = useTranslations("geo");
  const { activeId, setActiveId } = useMapSync();
  const active = activeId === venue.id;

  return (
    <div
      onMouseEnter={() => setActiveId(venue.id)}
      onMouseLeave={() => setActiveId(null)}
      className={["relative transition-shadow", active ? "shadow-card-md" : ""].join(" ")}
    >
      {distanceKm !== undefined && (
        <span
          className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-foreground/80 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm"
          aria-label={t("distanceLabel")}
        >
          {formatDistance(distanceKm, locale === "ka" ? "ka" : "en")}
        </span>
      )}
      <Link href={`/venues/${venue.slug}`}>
        <Card className="overflow-hidden transition-shadow hover:shadow-md">
          <div
            className="h-40 bg-brand-100 bg-cover bg-center"
            style={venue.coverPhoto ? { backgroundImage: `url(${venue.coverPhoto})` } : undefined}
          />
          <CardContent>
            <h3 className="font-semibold">{venue.name}</h3>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted">
              <MapPin className="h-3.5 w-3.5" /> {venue.city}
            </p>
            {venue.sports.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {venue.sports.slice(0, 4).map((s) => (
                  <SportBadge key={s.id} name={s.name} slug={s.slug} />
                ))}
                {venue.sports.length > 4 && (
                  <span className="text-[11px] text-muted">+{venue.sports.length - 4}</span>
                )}
              </div>
            )}
            <div className="mt-3 flex items-center justify-between">
              <Badge tone="brand">{venue.facilityCountLabel}</Badge>
              {venue.minPriceLabel && (
                <span className="text-sm font-medium">{venue.minPriceLabel}</span>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
