import Link from "next/link";
import { MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SportBadge } from "@/components/sport/sport-badge";
import { VenuesView, VenueCardSync } from "@/components/map/VenuesView";
import type { MapVenue } from "@/components/map/types";
import { prisma } from "@/lib/prisma";
import { parseJSON, formatGEL } from "@/lib/utils";
import { normalizeCity, cityCentroid } from "@/lib/city-map";
import { AMENITIES } from "@/lib/enums";
import { tSportName } from "@/lib/sports";

const TIME_OPTIONS = Array.from({ length: 18 }, (_, i) => {
  const h = i + 6;
  return `${String(h).padStart(2, "0")}:00`;
});

function dateAtMinutes(base: Date, minutes: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0);
  d.setMinutes(minutes);
  return d;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export default async function VenuesPage({
  searchParams,
}: {
  searchParams: Promise<{
    city?: string;
    sport?: string;
    indoor?: string;
    maxPrice?: string;
    amenities?: string | string[];
    date?: string;
    time?: string;
  }>;
}) {
  const { city, sport, indoor, maxPrice, amenities, date, time } = await searchParams;
  const t = await getTranslations("clubs");
  const tRoot = await getTranslations();

  const cityQuery = city ? normalizeCity(city) : undefined;
  const selectedAmenities = !amenities
    ? []
    : Array.isArray(amenities)
      ? amenities.filter(Boolean)
      : amenities.split(",").filter(Boolean);
  const maxPriceNum = maxPrice ? parseInt(maxPrice, 10) : undefined;

  const dateQuery = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
  const timeQuery = time && /^\d{2}:\d{2}$/.test(time) ? time : undefined;

  let dayStart: Date | undefined;
  let dayEnd: Date | undefined;
  let weekday: number | undefined;
  let timeMinutes: number | undefined;

  if (dateQuery) {
    const [y, m, d] = dateQuery.split("-").map(Number);
    dayStart = new Date(y, m - 1, d, 0, 0, 0, 0);
    dayEnd = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
    weekday = dayStart.getDay();
  }
  if (timeQuery) {
    const [h, m] = timeQuery.split(":").map(Number);
    timeMinutes = h * 60 + m;
  }

  const needsAvailability = weekday !== undefined && timeMinutes !== undefined && dayStart && dayEnd;

  const sportFilter = sport && sport !== "all" ? sport : undefined;
  const sportRow = sportFilter
    ? await prisma.sport.findUnique({ where: { slug: sportFilter } })
    : null;

  const [venues, sports] = await Promise.all([
    prisma.venue.findMany({
      where: {
        status: "APPROVED",
        ...(cityQuery ? { city: { contains: cityQuery, mode: "insensitive" } } : {}),
        ...(sportRow ? { facilities: { some: { sportId: sportRow.id, isActive: true } } } : {}),
      },
      include: {
        facilities: {
          where: { isActive: true, ...(sportRow ? { sportId: sportRow.id } : {}) },
          include: {
            sport: true,
            schedules: true,
            bookings: needsAvailability
              ? { where: { status: { not: "CANCELLED" }, startTime: { gte: dayStart }, endTime: { lte: dayEnd! } } }
              : { take: 0 },
            blackouts: needsAvailability
              ? { where: { startTime: { lt: dayEnd! }, endTime: { gt: dayStart! } } }
              : { take: 0 },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.sport.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  const filtered = venues.filter((venue) => {
    if (indoor === "indoor" && !venue.facilities.some((c) => c.isIndoor)) return false;
    if (indoor === "outdoor" && !venue.facilities.some((c) => !c.isIndoor)) return false;

    if (maxPriceNum !== undefined) {
      const minPrice = venue.facilities.length ? Math.min(...venue.facilities.map((c) => c.pricePerHourGEL)) : Infinity;
      if (minPrice > maxPriceNum) return false;
    }

    if (selectedAmenities.length > 0) {
      const venueAmenities = parseJSON<string[]>(venue.amenities, []);
      if (!selectedAmenities.every((a) => venueAmenities.includes(a))) return false;
    }

    if (weekday !== undefined) {
      if (needsAvailability && dayStart) {
        const hasSlot = venue.facilities.some((facility) => {
          const schedule = facility.schedules.find((s) => s.dayOfWeek === weekday);
          if (!schedule) return false;
          if (timeMinutes! < schedule.openMinutes) return false;
          if (timeMinutes! + schedule.slotMinutes > schedule.closeMinutes) return false;

          const slotStart = dateAtMinutes(dayStart!, timeMinutes!);
          const slotEnd = new Date(slotStart.getTime() + schedule.slotMinutes * 60_000);

          if (facility.bookings.some((b) => overlaps(slotStart, slotEnd, b.startTime, b.endTime))) return false;
          if (facility.blackouts.some((bl) => overlaps(slotStart, slotEnd, bl.startTime, bl.endTime))) return false;
          return true;
        });
        if (!hasSlot) return false;
      } else {
        if (!venue.facilities.some((c) => c.schedules.some((s) => s.dayOfWeek === weekday))) return false;
      }
    }

    return true;
  });

  const today = new Date();
  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  const hasFilters = city || sport || indoor || maxPrice || amenities || date || time;

  return (
    <Container className="py-6 sm:py-10">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
      <p className="mt-1 text-muted">{t("clubsAvailable", { count: filtered.length })}</p>

      <form className="mt-6 space-y-4" action="/venues">
        {/* Row 1: city, sport, court type, max price, submit */}
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
          <div className="sm:w-44">
            <label className="mb-1.5 block text-sm font-medium">{t("city")}</label>
            <Input name="city" placeholder={t("cityPlaceholder")} defaultValue={city ?? ""} />
          </div>
          <div className="sm:w-44">
            <label className="mb-1.5 block text-sm font-medium">{tRoot("venuesFilter.sport")}</label>
            <Select name="sport" defaultValue={sport ?? "all"}>
              <option value="all">{tRoot("venuesFilter.allSports")}</option>
              {sports.map((s) => (
                <option key={s.id} value={s.slug}>{tSportName(tRoot, s.slug)}</option>
              ))}
            </Select>
          </div>
          <div className="sm:w-44">
            <label className="mb-1.5 block text-sm font-medium">{t("courtType")}</label>
            <Select name="indoor" defaultValue={indoor ?? ""}>
              <option value="">{t("any")}</option>
              <option value="indoor">{t("indoor")}</option>
              <option value="outdoor">{t("outdoor")}</option>
            </Select>
          </div>
          <div className="sm:w-36">
            <label className="mb-1.5 block text-sm font-medium">{t("maxPrice")}</label>
            <Input name="maxPrice" type="number" min={0} placeholder={t("maxPricePlaceholder")} defaultValue={maxPrice ?? ""} />
          </div>
          <div className="col-span-2 flex items-center gap-2 sm:col-span-1 sm:pb-0.5">
            <Button type="submit">{t("apply")}</Button>
            {hasFilters && (
              <Link href="/venues" className="text-sm text-muted hover:text-foreground">{t("clear")}</Link>
            )}
          </div>
        </div>

        {/* Row 2: date + time */}
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
          <div className="sm:w-44">
            <label className="mb-1.5 block text-sm font-medium">{t("date")}</label>
            <Input name="date" type="date" min={todayStr} defaultValue={dateQuery ?? ""} />
          </div>
          <div className="sm:w-44">
            <label className="mb-1.5 block text-sm font-medium">{t("time")}</label>
            <Select name="time" defaultValue={timeQuery ?? ""}>
              <option value="">{t("anyTime")}</option>
              {TIME_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </Select>
          </div>
        </div>

        {/* Row 3: amenities */}
        <div>
          <p className="mb-2 text-sm font-medium">{t("amenities")}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {AMENITIES.map((a) => (
              <label key={a} className="flex cursor-pointer items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  name="amenities"
                  value={a}
                  defaultChecked={selectedAmenities.includes(a)}
                  className="h-4 w-4 accent-[var(--color-brand-500)]"
                />
                {t(`amenityLabels.${a}` as never)}
              </label>
            ))}
          </div>
        </div>
      </form>

      {filtered.length === 0 ? (
        <p className="mt-16 text-center text-muted">{t("noResults")}</p>
      ) : (() => {
        // Map-ready view (only venues with coordinates).
        const mapVenues: MapVenue[] = filtered
          .filter((v): v is typeof v & { lat: number; lng: number } =>
            typeof v.lat === "number" && typeof v.lng === "number",
          )
          .map((v) => {
            const sportTags = Array.from(
              new Map(v.facilities.map((f) => [f.sport.id, f.sport])).values(),
            );
            const minPrice = v.facilities.length
              ? Math.min(...v.facilities.map((c) => c.pricePerHourGEL))
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

        const centroid = cityCentroid(city);

        const listGrid = (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((venue) => {
              const photos = parseJSON<string[]>(venue.photos, []);
              const minPrice = venue.facilities.length
                ? Math.min(...venue.facilities.map((c) => c.pricePerHourGEL))
                : null;
              const sportTags = Array.from(
                new Map(venue.facilities.map((f) => [f.sport.id, f.sport])).values(),
              );
              return (
                <VenueCardSync key={venue.id} venueId={venue.id}>
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
                            {sportTags.slice(0, 4).map((s) => (
                              <SportBadge key={s.id} name={tSportName(tRoot, s.slug)} slug={s.slug} />
                            ))}
                            {sportTags.length > 4 && (
                              <span className="text-[11px] text-muted">+{sportTags.length - 4}</span>
                            )}
                          </div>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          <Badge tone="brand">{t("courts", { count: venue.facilities.length })}</Badge>
                          {minPrice !== null && (
                            <span className="text-sm font-medium">{t("fromPrice", { price: formatGEL(minPrice) })}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </VenueCardSync>
              );
            })}
          </div>
        );

        return (
          <div className="mt-8">
            <VenuesView
              list={listGrid}
              venues={mapVenues}
              initialCenter={centroid ?? undefined}
              initialZoom={centroid ? 12 : undefined}
            />
          </div>
        );
      })()}
    </Container>
  );
}
