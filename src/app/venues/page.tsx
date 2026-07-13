import Link from "next/link";
import { MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VenuesView } from "@/components/map/VenuesView";
import type { MapVenue } from "@/components/map/types";
import { prisma } from "@/lib/prisma";
import { getCurrentUserHomeBase } from "@/lib/session";
import { parseJSON, formatGEL } from "@/lib/utils";
import { normalizeCity, cityCentroid } from "@/lib/city-map";
import { AMENITIES, SURFACE_CATEGORIES } from "@/lib/enums";
import { tSportName } from "@/lib/sports";
import { canonical, DEFAULT_OG_IMAGE } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find venues",
  description: "Discover and book sports venues across Georgia — by city, sport, time and price.",
  alternates: { canonical: canonical("/venues") },
  openGraph: {
    title: "Find sports venues",
    description: "Discover and book sports venues across Georgia.",
    url: canonical("/venues"),
    type: "website",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
  },
};

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
    district?: string;
    sport?: string;
    surface?: string;
    indoor?: string;
    maxPrice?: string;
    amenities?: string | string[];
    date?: string;
    time?: string;
  }>;
}) {
  const { city, district, sport, surface, indoor, maxPrice, amenities, date, time } = await searchParams;
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

  const districtQuery = district?.trim() || undefined;
  const surfaceQuery =
    surface && (SURFACE_CATEGORIES as readonly string[]).includes(surface) ? surface : undefined;

  const [venues, sports, knownDistricts, homeBase] = await Promise.all([
    prisma.venue.findMany({
      where: {
        status: "APPROVED",
        ...(cityQuery ? { city: { contains: cityQuery, mode: "insensitive" } } : {}),
        ...(districtQuery ? { district: { equals: districtQuery, mode: "insensitive" } } : {}),
        ...(sportRow ? { facilities: { some: { sportId: sportRow.id, isActive: true } } } : {}),
      },
      include: {
        facilities: {
          where: {
            isActive: true,
            ...(sportRow ? { sportId: sportRow.id } : {}),
            ...(surfaceQuery ? { surfaceCategory: surfaceQuery } : {}),
          },
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
    // Distinct district list — powers the autocomplete datalist.
    prisma.venue
      .findMany({
        where: { status: "APPROVED", NOT: { district: null } },
        select: { district: true },
        distinct: ["district"],
        orderBy: { district: "asc" },
        take: 100,
      })
      .then((rows) => rows.map((r) => r.district).filter((d): d is string => !!d)),
    getCurrentUserHomeBase(),
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

  const hasFilters =
    city || district || sport || surface || indoor || maxPrice || amenities || date || time;

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
            <label className="mb-1.5 block text-sm font-medium">{tRoot("filters.district")}</label>
            <Input
              name="district"
              placeholder={tRoot("filters.districtPlaceholder")}
              defaultValue={district ?? ""}
              list="venues-filter-districts"
            />
            <datalist id="venues-filter-districts">
              {knownDistricts.map((d) => <option key={d} value={d} />)}
            </datalist>
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
            <label className="mb-1.5 block text-sm font-medium">{tRoot("filters.surface")}</label>
            <Select name="surface" defaultValue={surface ?? ""}>
              <option value="">{tRoot("filters.anySurface")}</option>
              {SURFACE_CATEGORIES.map((s) => (
                <option key={s} value={s}>{tRoot(`filters.surfaceOpts.${s}` as never)}</option>
              ))}
            </Select>
          </div>
          <div className="sm:w-44">
            <label className="mb-1.5 block text-sm font-medium">{tRoot("filters.cover")}</label>
            <Select name="indoor" defaultValue={indoor ?? ""}>
              <option value="">{t("any")}</option>
              <option value="indoor">{tRoot("filters.coverClosed")}</option>
              <option value="outdoor">{tRoot("filters.coverOpen")}</option>
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
        const centroid = cityCentroid(city);
        const mapVenues: MapVenue[] = filtered
          .map((v) => {
            const sportTags = Array.from(
              new Map(v.facilities.map((f) => [f.sport.id, f.sport])).values(),
            );
            const minPrice = v.facilities.length
              ? Math.min(...v.facilities.map((c) => c.pricePerHourGEL))
              : null;
            const photos = parseJSON<string[]>(v.photos, []);
            return {
              id: v.id,
              slug: v.slug,
              name: v.name,
              city: v.city,
              lat: typeof v.lat === "number" ? v.lat : null,
              lng: typeof v.lng === "number" ? v.lng : null,
              minPriceGEL: minPrice,
              sports: sportTags.map((s) => ({
                id: s.id,
                slug: s.slug,
                name: tSportName(tRoot, s.slug),
              })),
              primarySportSlug: sportTags[0]?.slug ?? "default",
              coverPhoto: photos[0] ?? null,
              facilityCount: v.facilities.length,
              facilityCountLabel: t("courts", { count: v.facilities.length }),
              minPriceLabel:
                minPrice !== null ? t("fromPrice", { price: formatGEL(minPrice) }) : null,
            };
          });

        return (
          <div className="mt-8">
            <VenuesView
              venues={mapVenues}
              initialCenter={centroid ?? undefined}
              initialZoom={centroid ? 12 : undefined}
              homeBase={homeBase}
            />
          </div>
        );
      })()}
    </Container>
  );
}
