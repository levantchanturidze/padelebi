"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { List, Map as MapIcon } from "lucide-react";
import { MapSyncProvider, useMapSync } from "./sync-context";
import type { MapVenue } from "./types";

// Map is client-only and lazy-loaded (~200KB gzip)
const VenueMap = dynamic(() => import("./VenueMap").then((m) => m.VenueMap), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse bg-background" />
  ),
});

/**
 * Layout for /venues:
 *   - Desktop (lg+): list on the left, sticky map on the right
 *   - Mobile: tab toggle (List | Map), one full-screen at a time
 *
 * Wraps both surfaces in the MapSyncProvider so card hover ↔ pin highlight
 * works across the two panels.
 */
export function VenuesView({
  list,
  venues,
  initialCenter,
  initialZoom,
}: {
  list: React.ReactNode;
  venues: MapVenue[];
  initialCenter?: [number, number];
  initialZoom?: number;
}) {
  const t = useTranslations("map");
  const [mobileView, setMobileView] = useState<"list" | "map">("list");

  return (
    <MapSyncProvider>
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

      {/* Layout */}
      <div className="lg:grid lg:grid-cols-[1.4fr_1fr] lg:gap-6">
        {/* List — hidden on mobile when map is active */}
        <div className={mobileView === "map" ? "hidden lg:block" : ""}>
          {list}
        </div>

        {/* Map — desktop sticky, mobile fixed below toggle */}
        <div
          className={[
            mobileView === "list" ? "hidden lg:block" : "block",
            "lg:sticky lg:top-20 lg:self-start",
            "h-[60vh] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface lg:h-[calc(100vh-7rem)]",
          ].join(" ")}
        >
          <VenueMap
            venues={venues}
            initialCenter={initialCenter}
            initialZoom={initialZoom}
          />
        </div>
      </div>
    </MapSyncProvider>
  );
}

/**
 * Wrapper for a venue card that broadcasts hover state to the map.
 * Used inside the list passed to <VenuesView />.
 */
export function VenueCardSync({
  venueId,
  children,
}: {
  venueId: string;
  children: React.ReactNode;
}) {
  const { activeId, setActiveId } = useMapSync();
  return (
    <div
      onMouseEnter={() => setActiveId(venueId)}
      onMouseLeave={() => setActiveId(null)}
      className={[
        "transition-shadow",
        activeId === venueId ? "shadow-card-md" : "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
