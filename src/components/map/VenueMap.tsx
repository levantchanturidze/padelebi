"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import maplibregl, { type Map as MapLibreMap, type LngLatBoundsLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { useMapSync } from "./sync-context";
import { usePosition } from "./use-position";
import type { MapVenue } from "./types";
import { GEORGIA_CENTER, GEORGIA_DEFAULT_ZOOM } from "@/lib/city-map";
import { formatGEL } from "@/lib/utils";

/**
 * MapLibre map of filtered venues. Renders pins with sport-aware coloring,
 * popups on click, fits to bounds on initial load, and syncs hover state
 * with the venue list via `useMapSync`.
 *
 * Tiles: OpenStreetMap raster. Free, no token; if rate limits become an
 * issue we swap to MapTiler with `NEXT_PUBLIC_MAPTILER_KEY` env var.
 */
export function VenueMap({
  venues,
  initialCenter,
  initialZoom,
}: {
  venues: MapVenue[];
  initialCenter?: [number, number];
  initialZoom?: number;
}) {
  const t = useTranslations("map");
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const { activeId, setActiveId } = useMapSync();
  const { position } = usePosition();

  // ── Initial map mount (once) ────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: initialCenter ?? GEORGIA_CENTER,
      zoom: initialZoom ?? GEORGIA_DEFAULT_ZOOM,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync markers whenever the venues list changes ──────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Wait for the map style to be ready before adding markers.
    const ready = () => {
      // Remove markers that are no longer in the venue set.
      const nextIds = new Set(venues.map((v) => v.id));
      for (const [id, marker] of markersRef.current.entries()) {
        if (!nextIds.has(id)) {
          marker.remove();
          markersRef.current.delete(id);
        }
      }

      // Add/update markers for current venues.
      for (const v of venues) {
        if (markersRef.current.has(v.id)) continue;

        const el = document.createElement("button");
        el.type = "button";
        el.className = "playtora-pin";
        el.dataset.venueId = v.id;
        el.setAttribute("aria-label", v.name);
        el.innerHTML = `<span class="playtora-pin__dot"></span>`;
        el.addEventListener("mouseenter", () => setActiveId(v.id));
        el.addEventListener("mouseleave", () => setActiveId(null));

        const popupHtml = `
          <div class="playtora-popup">
            <p class="playtora-popup__name">${escapeHtml(v.name)}</p>
            <p class="playtora-popup__city">${escapeHtml(v.city)}</p>
            ${v.minPriceGEL !== null
              ? `<p class="playtora-popup__price">from <strong>${escapeHtml(formatGEL(v.minPriceGEL))}</strong></p>`
              : ""}
            <a class="playtora-popup__link" href="/venues/${encodeURIComponent(v.slug)}">View venue →</a>
          </div>`;

        const popup = new maplibregl.Popup({
          offset: 18,
          closeButton: false,
          maxWidth: "240px",
        }).setHTML(popupHtml);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([v.lng, v.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.set(v.id, marker);
      }

      // Fit to bounds on first render if we have multiple venues and no
      // explicit initial center was given.
      if (!initialCenter && venues.length > 1) {
        const bounds = new maplibregl.LngLatBounds();
        for (const v of venues) bounds.extend([v.lng, v.lat]);
        map.fitBounds(bounds as LngLatBoundsLike, { padding: 60, maxZoom: 13, duration: 0 });
      } else if (venues.length === 1) {
        map.jumpTo({ center: [venues[0].lng, venues[0].lat], zoom: 13 });
      }
    };

    if (map.loaded()) ready();
    else map.once("load", ready);
  }, [venues, initialCenter, setActiveId]);

  // ── User-position pin ──────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!position) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }

    if (!userMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "playtora-user-pin";
      el.innerHTML = `<span class="playtora-user-pin__halo"></span><span class="playtora-user-pin__dot"></span>`;
      userMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([position.lng, position.lat])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([position.lng, position.lat]);
    }

    // Pan to user once if no explicit center was given and we don't have venues to fit.
    if (!initialCenter && venues.length === 0) {
      map.flyTo({ center: [position.lng, position.lat], zoom: 13, duration: 600 });
    }
  }, [position, initialCenter, venues.length]);

  // ── Highlight the active marker when card hover changes ─────────────────
  useEffect(() => {
    for (const [id, marker] of markersRef.current.entries()) {
      const el = marker.getElement();
      el.classList.toggle("playtora-pin--active", id === activeId);
    }
    // Also open the popup of the active marker (only on hover from the list)
    if (activeId) {
      const marker = markersRef.current.get(activeId);
      if (marker && !marker.getPopup()?.isOpen()) marker.togglePopup();
    } else {
      // Close any open popup on hover-out
      for (const marker of markersRef.current.values()) {
        if (marker.getPopup()?.isOpen()) marker.togglePopup();
      }
    }
  }, [activeId]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0" />
      {venues.length === 0 && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <p className="rounded-[var(--radius-md)] border border-border bg-surface px-4 py-2 text-sm text-muted shadow-card">
            {t("noVenuesWithCoords")}
          </p>
        </div>
      )}
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
