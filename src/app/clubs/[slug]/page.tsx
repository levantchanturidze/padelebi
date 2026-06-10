import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, Check } from "lucide-react";
import { addDays, format } from "date-fns";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookingPanel, type ClientSlot } from "@/components/booking-panel";
import { PhotoGallery } from "@/components/photo-gallery";
import { prisma } from "@/lib/prisma";
import { getCourtAvailability } from "@/lib/availability";
import { getCurrentUser } from "@/lib/session";
import { parseJSON, formatGEL } from "@/lib/utils";
import { AMENITY_LABELS, SURFACE_LABELS, type Amenity, type Surface } from "@/lib/enums";

function parseDateParam(date?: string): Date {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export default async function ClubDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ courtId?: string; date?: string }>;
}) {
  const { slug } = await params;
  const { courtId, date } = await searchParams;
  const t = await getTranslations("clubDetail");

  const club = await prisma.club.findFirst({
    where: { slug, status: "APPROVED" },
    include: { courts: { where: { isActive: true }, orderBy: { name: "asc" } } },
  });
  if (!club) notFound();

  const user = await getCurrentUser();
  const amenities = parseJSON<Amenity[]>(club.amenities, []);
  const photos = parseJSON<string[]>(club.photos, []);

  const selectedCourt = club.courts.find((c) => c.id === courtId) ?? club.courts[0] ?? null;
  const selectedDate = parseDateParam(date);
  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const slots: ClientSlot[] = selectedCourt
    ? (await getCourtAvailability(selectedCourt.id, selectedDate)).map((s) => ({
        start: s.start.toISOString(),
        end: s.end.toISOString(),
        available: s.available,
        priceGEL: s.priceGEL,
      }))
    : [];

  const days = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));

  return (
    <>
      <PhotoGallery photos={photos} />
      <Container className="py-6 sm:py-8">
        {/* On mobile: booking first, info below. On lg: side-by-side. */}
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1.4fr_1fr] lg:items-start lg:gap-8">

          {/* Booking panel — order-1 on mobile (top), order-2 on lg (right) */}
          <Card className="h-fit lg:order-2 lg:sticky lg:top-20">
            <CardContent>
              <h2 className="text-lg font-semibold">{t("bookACourt")}</h2>

              {selectedCourt ? (
                <>
                  {/* Court selector */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {club.courts.map((c) => (
                      <Link
                        key={c.id}
                        href={`/clubs/${club.slug}?courtId=${c.id}&date=${dateStr}`}
                        scroll={false}
                        className={[
                          "rounded-full border px-3 py-1 text-sm",
                          c.id === selectedCourt.id
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-border text-muted hover:text-foreground",
                        ].join(" ")}
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>

                  {/* Date strip */}
                  <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {days.map((d) => {
                      const ds = format(d, "yyyy-MM-dd");
                      const active = ds === dateStr;
                      return (
                        <Link
                          key={ds}
                          href={`/clubs/${club.slug}?courtId=${selectedCourt.id}&date=${ds}`}
                          scroll={false}
                          className={[
                            "flex min-w-[3.25rem] flex-col items-center rounded-[var(--radius-md)] border px-2 py-1.5 text-center text-xs",
                            active
                              ? "border-brand-500 bg-brand-500 text-white"
                              : "border-border hover:border-brand-400",
                          ].join(" ")}
                        >
                          <span className="font-medium">{format(d, "EEE")}</span>
                          <span>{format(d, "d MMM")}</span>
                        </Link>
                      );
                    })}
                  </div>

                  <div className="mt-5">
                    <BookingPanel
                      slots={slots}
                      courtId={selectedCourt.id}
                      slug={club.slug}
                      isAuthenticated={!!user}
                    />
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm text-muted">{t("noActiveCourts")}</p>
              )}
            </CardContent>
          </Card>

          {/* Info — order-2 on mobile (below booking), order-1 on lg (left) */}
          <div className="lg:order-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{club.name}</h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted sm:text-base">
              <MapPin className="h-4 w-4 shrink-0" /> {club.address}, {club.city}
            </p>
            {club.description && (
              <p className="mt-4 text-sm leading-relaxed text-foreground/90 sm:text-base">
                {club.description}
              </p>
            )}

            {amenities.length > 0 && (
              <div className="mt-6">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {t("amenities")}
                </h2>
                <ul className="mt-3 grid grid-cols-2 gap-2">
                  {amenities.map((a) => (
                    <li key={a} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-brand-500" />
                      {AMENITY_LABELS[a] ?? a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                {t("courts")}
              </h2>
              <div className="mt-3 space-y-2">
                {club.courts.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{c.name}</span>
                      <span className="font-medium text-brand-600">{formatGEL(c.pricePerHourGEL)}/სთ</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge tone="muted">{SURFACE_LABELS[c.surface as Surface] ?? c.surface}</Badge>
                      <Badge tone={c.isIndoor ? "brand" : "neutral"}>
                        {c.isIndoor ? t("indoor") : t("outdoor")}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </Container>
    </>
  );
}
