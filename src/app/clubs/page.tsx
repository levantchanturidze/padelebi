import Link from "next/link";
import { MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { parseJSON, formatGEL } from "@/lib/utils";
import { normalizeCity } from "@/lib/city-map";
import { SURFACES, AMENITIES, type Amenity, type Surface } from "@/lib/enums";

export default async function ClubsPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; indoor?: string; surface?: string; maxPrice?: string; amenities?: string }>;
}) {
  const { city, indoor, surface, maxPrice, amenities } = await searchParams;
  const t = await getTranslations("clubs");

  const cityQuery = city ? normalizeCity(city) : undefined;
  const selectedAmenities = amenities ? amenities.split(",").filter(Boolean) : [];
  const maxPriceNum = maxPrice ? parseInt(maxPrice, 10) : undefined;

  const clubs = await prisma.club.findMany({
    where: {
      status: "APPROVED",
      ...(cityQuery ? { city: { contains: cityQuery, mode: "insensitive" } } : {}),
      ...(surface ? { courts: { some: { surface, isActive: true } } } : {}),
    },
    include: { courts: { where: { isActive: true } } },
    orderBy: { name: "asc" },
  });

  const filtered = clubs.filter((club) => {
    if (indoor === "indoor" && !club.courts.some((c) => c.isIndoor)) return false;
    if (indoor === "outdoor" && !club.courts.some((c) => !c.isIndoor)) return false;

    if (maxPriceNum !== undefined) {
      const minPrice = club.courts.length ? Math.min(...club.courts.map((c) => c.pricePerHourGEL)) : Infinity;
      if (minPrice > maxPriceNum) return false;
    }

    if (selectedAmenities.length > 0) {
      const clubAmenities = parseJSON<string[]>(club.amenities, []);
      if (!selectedAmenities.every((a) => clubAmenities.includes(a))) return false;
    }

    return true;
  });

  const hasFilters = city || indoor || surface || maxPrice || amenities;

  return (
    <Container className="py-10">
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-1 text-muted">{t("clubsAvailable", { count: filtered.length })}</p>

      <form className="mt-6 space-y-4" action="/clubs">
        {/* Row 1: city, court type, surface, max price */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-44">
            <label className="mb-1.5 block text-sm font-medium">{t("city")}</label>
            <Input name="city" placeholder={t("cityPlaceholder")} defaultValue={city ?? ""} />
          </div>
          <div className="w-44">
            <label className="mb-1.5 block text-sm font-medium">{t("courtType")}</label>
            <Select name="indoor" defaultValue={indoor ?? ""}>
              <option value="">{t("any")}</option>
              <option value="indoor">{t("indoor")}</option>
              <option value="outdoor">{t("outdoor")}</option>
            </Select>
          </div>
          <div className="w-44">
            <label className="mb-1.5 block text-sm font-medium">{t("surface")}</label>
            <Select name="surface" defaultValue={surface ?? ""}>
              <option value="">{t("anySurface")}</option>
              {SURFACES.map((s) => (
                <option key={s} value={s}>{t(`surfaceLabels.${s}` as never)}</option>
              ))}
            </Select>
          </div>
          <div className="w-36">
            <label className="mb-1.5 block text-sm font-medium">{t("maxPrice")}</label>
            <Input name="maxPrice" type="number" min={0} placeholder={t("maxPricePlaceholder")} defaultValue={maxPrice ?? ""} />
          </div>
          <div className="flex items-end gap-2 pb-0.5">
            <Button type="submit">{t("apply")}</Button>
            {hasFilters && (
              <Link href="/clubs" className="text-sm text-muted hover:text-foreground">{t("clear")}</Link>
            )}
          </div>
        </div>

        {/* Row 2: amenities */}
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

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((club) => {
          const photos = parseJSON<string[]>(club.photos, []);
          const minPrice = club.courts.length
            ? Math.min(...club.courts.map((c) => c.pricePerHourGEL))
            : null;
          return (
            <Link key={club.id} href={`/clubs/${club.slug}`}>
              <Card className="overflow-hidden transition-shadow hover:shadow-md">
                <div
                  className="h-40 bg-brand-100 bg-cover bg-center"
                  style={photos[0] ? { backgroundImage: `url(${photos[0]})` } : undefined}
                />
                <CardContent>
                  <h3 className="font-semibold">{club.name}</h3>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                    <MapPin className="h-3.5 w-3.5" /> {club.city}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge tone="brand">{t("courts", { count: club.courts.length })}</Badge>
                    {minPrice !== null && (
                      <span className="text-sm font-medium">{t("fromPrice", { price: formatGEL(minPrice) })}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="mt-16 text-center text-muted">{t("noResults")}</p>
      )}
    </Container>
  );
}
