import Link from "next/link";
import { MapPin } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { parseJSON, formatGEL } from "@/lib/utils";

export const metadata = { title: "Find padel courts — Padelebi" };

export default async function ClubsPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; indoor?: string }>;
}) {
  const { city, indoor } = await searchParams;

  const clubs = await prisma.club.findMany({
    where: {
      status: "APPROVED",
      ...(city ? { city: { contains: city } } : {}),
    },
    include: { courts: { where: { isActive: true } } },
    orderBy: { name: "asc" },
  });

  const filtered = clubs.filter((club) => {
    if (indoor === "indoor") return club.courts.some((c) => c.isIndoor);
    if (indoor === "outdoor") return club.courts.some((c) => !c.isIndoor);
    return true;
  });

  return (
    <Container className="py-10">
      <h1 className="text-3xl font-bold tracking-tight">Find padel courts</h1>
      <p className="mt-1 text-muted">{filtered.length} clubs available</p>

      <form className="mt-6 flex flex-wrap items-end gap-3" action="/clubs">
        <div className="w-48">
          <label className="mb-1.5 block text-sm font-medium">City</label>
          <Input name="city" placeholder="e.g. Tbilisi" defaultValue={city ?? ""} />
        </div>
        <div className="w-48">
          <label className="mb-1.5 block text-sm font-medium">Court type</label>
          <Select name="indoor" defaultValue={indoor ?? ""}>
            <option value="">Any</option>
            <option value="indoor">Indoor</option>
            <option value="outdoor">Outdoor</option>
          </Select>
        </div>
        <Button type="submit">Apply</Button>
        {(city || indoor) && (
          <Link href="/clubs" className="text-sm text-muted hover:text-foreground">
            Clear
          </Link>
        )}
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
                    <Badge tone="brand">{club.courts.length} courts</Badge>
                    {minPrice !== null && (
                      <span className="text-sm font-medium">from {formatGEL(minPrice)}/hr</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="mt-16 text-center text-muted">
          No clubs match your search. Try clearing filters.
        </p>
      )}
    </Container>
  );
}
