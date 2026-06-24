"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import dynamic from "next/dynamic";
import { List, Map as MapIcon } from "lucide-react";
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
 * Layout for venue-listing surfaces (/venues, /sports/[slug], /account/favorites).
 *
 * Renders the `list` prop (which the parent built server-side with cards) plus
 * the interactive map. Wraps both in PositionProvider + MapSyncProvider so
 * geolocation state and card↔pin hover sync work across the two panels.
 *
 * `renderList` is called with the (possibly distance-sorted + radius-filtered)
 * venues so the parent can re-render its cards accordingly. If the parent
 * doesn't care about distance, it can pass a `list` ReactNode instead.
 */
export function VenuesView({
  venues,
  initialCenter,
  initialZoom,
  renderList,
  list,
}: {
  venues: MapVenue[];
  initialCenter?: [number, number];
  initialZoom?: number;
  /** Re-renders when the venue list is re-sorted/filtered by distance. */
  renderList?: (venues: MapVenue[]) => React.ReactNode;
  /** Static list (used when distance sorting isn't needed). */
  list?: React.ReactNode;
}) {
  return (
    <PositionProvider>
      <MapSyncProvider>
        <VenuesViewInner
          venues={venues}
          initialCenter={initialCenter}
          initialZoom={initialZoom}
          renderList={renderList}
          list={list}
        />
      </MapSyncProvider>
    </PositionProvider>
  );
}

function VenuesViewInner({
  venues,
  initialCenter,
  initialZoom,
  renderList,
  list,
}: {
  venues: MapVenue[];
  initialCenter?: [number, number];
  initialZoom?: number;
  renderList?: (venues: MapVenue[]) => React.ReactNode;
  list?: React.ReactNode;
}) {
  const t = useTranslations("map");
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const { position } = usePosition();

  /**
   * Annotate each venue with distance (if position known), then sort and
   * radius-filter. Pure derived state — recomputes whenever position,
   * venues, or radius changes.
   */
  const displayVenues = useMemo(() => {
    if (!position) return venues;
    const annotated = venues
      .map((v) => ({ ...v, distanceKm: distanceKm(position, v) }))
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    if (radiusKm === null) return annotated;
    return annotated.filter((v) => (v.distanceKm ?? 0) <= radiusKm);
  }, [venues, position, radiusKm]);

  const listNode = renderList ? renderList(displayVenues) : list;

  return (
    <div>
      {/* Geo controls */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <NearMeButton />
        <RadiusFilter value={radiusKm} onChange={setRadiusKm} />
      </div>

      {/* Mobile toggle — only visible below lg */}
      <div className="mb-3 flex lg:hidden">
        <div className="inline-flex rounded-full border border-border bg-surface p-0.5">
          <button
            type="button"
            onClick={() => setMobileView("list")}
            className={[
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold transition-colors",
              mobileView === "list"
                ? "bg-foreground text-white"
                : "text-muted hover:text-foreground",
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
              mobileView === "map"
                ? "bg-foreground text-white"
                : "text-muted hover:text-foreground",
            ].join(" ")}
          >
            <MapIcon className="h-3.5 w-3.5" />
            {t("map")}
          </button>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[1.4fr_1fr] lg:gap-6">
        <div className={mobileView === "map" ? "hidden lg:block" : ""}>
          {listNode}
        </div>

        <div
          className={[
            mobileView === "list" ? "hidden lg:block" : "block",
            "lg:sticky lg:top-20 lg:self-start",
            "h-[60vh] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface lg:h-[calc(100vh-7rem)]",
          ].join(" ")}
        >
          <VenueMap
            venues={displayVenues}
            initialCenter={initialCenter}
            initialZoom={initialZoom}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Wraps a venue card to broadcast hover into the shared sync context and to
 * render a distance badge if the parent passed one.
 */
export function VenueCardSync({
  venueId,
  distanceKm: distance,
  children,
}: {
  venueId: string;
  distanceKm?: number;
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const t = useTranslations("geo");
  const { activeId, setActiveId } = useMapSync();
  return (
    <div
      onMouseEnter={() => setActiveId(venueId)}
      onMouseLeave={() => setActiveId(null)}
      className={[
        "relative transition-shadow",
        activeId === venueId ? "shadow-card-md" : "",
      ].join(" ")}
    >
      {distance !== undefined && (
        <span
          className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-foreground/80 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm"
          aria-label={t("distanceLabel")}
        >
          {formatDistance(distance, locale === "ka" ? "ka" : "en")}
        </span>
      )}
      {children}
    </div>
  );
}
