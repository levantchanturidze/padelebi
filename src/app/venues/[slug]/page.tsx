import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, Check } from "lucide-react";
import { addDays, format } from "date-fns";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookingPanel, type ClientSlot } from "@/components/booking-panel";
import { ClassRoster, type ClientClassSession } from "@/components/booking/class-roster";
import { DropInCta } from "@/components/booking/dropin-cta";
import { PhotoGallery } from "@/components/photo-gallery";
import { SportBadge } from "@/components/sport/sport-badge";
import { FavoriteButton } from "@/components/favorite-button";
import { Rating } from "@/components/reviews/rating";
import { ReviewForm } from "@/components/reviews/review-form";
import { prisma } from "@/lib/prisma";
import { getFacilityAvailability } from "@/lib/availability";
import { getCurrentUser } from "@/lib/session";
import { parseJSON, formatGEL } from "@/lib/utils";
import { AMENITY_LABELS, type Amenity } from "@/lib/enums";
import { getAdapter, parseAttributes, tSportName, tSummaryValue } from "@/lib/sports";
import { canonical, venueOgImage, ogLocale } from "@/lib/seo";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

function bookingModelHeader(model: string, t: (k: string) => string): string {
  if (model === "CLASS") return t("venueDetail.joinClass");
  if (model === "DROP_IN") return t("venueDetail.dayPass");
  return t("venueDetail.book");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [venue, locale] = await Promise.all([
    prisma.venue.findFirst({
      where: { slug, status: "APPROVED" },
      select: { name: true, description: true, city: true, slug: true },
    }),
    getLocale(),
  ]);

  if (!venue) return { title: "Venue not found" };

  const description =
    venue.description?.slice(0, 160) ||
    `Book ${venue.name} in ${venue.city} on Playtora. Real-time availability, instant booking.`;

  const url = canonical(`/venues/${venue.slug}`);
  const og = venueOgImage(venue.slug);

  return {
    title: `${venue.name} · ${venue.city}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: venue.name,
      description,
      url,
      type: "website",
      locale: ogLocale(locale),
      images: [{ url: og, width: 1200, height: 630, alt: venue.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: venue.name,
      description,
      images: [og],
    },
  };
}

function parseDateParam(date?: string): Date {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export default async function VenueDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ facilityId?: string; courtId?: string; date?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const facilityId = sp.facilityId ?? sp.courtId;
  const date = sp.date;
  const t = await getTranslations("clubDetail");
  const tRoot = await getTranslations();

  const venue = await prisma.venue.findFirst({
    where: { slug, status: "APPROVED" },
    include: {
      facilities: {
        where: { isActive: true },
        orderBy: { name: "asc" },
        include: {
          sport: true,
          classes: {
            where: { isCancelled: false, endTime: { gte: new Date() } },
            orderBy: { startTime: "asc" },
            take: 20,
            include: { _count: { select: { bookings: { where: { status: { not: "CANCELLED" } } } } } },
          },
        },
      },
    },
  });
  if (!venue) notFound();

  const user = await getCurrentUser();
  const amenities = parseJSON<Amenity[]>(venue.amenities, []);
  const photos = parseJSON<string[]>(venue.photos, []);

  const [favorited, reviews, myReview, reviewAgg] = await Promise.all([
    user
      ? prisma.favorite.findUnique({
          where: { userId_venueId: { userId: user.id, venueId: venue.id } },
        }).then(Boolean)
      : Promise.resolve(false),
    prisma.review.findMany({
      where: { venueId: venue.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: { select: { name: true } } },
    }),
    user
      ? prisma.review.findUnique({
          where: { venueId_userId: { venueId: venue.id, userId: user.id } },
        })
      : Promise.resolve(null),
    prisma.review.aggregate({
      where: { venueId: venue.id },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);
  const avgRating = reviewAgg._avg.rating ?? 0;
  const reviewCount = reviewAgg._count._all;

  const selectedFacility = venue.facilities.find((c) => c.id === facilityId) ?? venue.facilities[0] ?? null;
  const selectedDate = parseDateParam(date);
  const dateStr = format(selectedDate, "yyyy-MM-dd");

  // Only TIME_SLOT facilities need the slot grid pre-computed.
  const slots: ClientSlot[] =
    selectedFacility && selectedFacility.bookingModel === "TIME_SLOT"
      ? (await getFacilityAvailability(selectedFacility.id, selectedDate)).map((s) => ({
          start: s.start.toISOString(),
          end: s.end.toISOString(),
          available: s.available,
          priceGEL: s.priceGEL,
        }))
      : [];

  const days = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));

  const sportTags = Array.from(
    new Map(venue.facilities.map((f) => [f.sport.id, f.sport])).values(),
  );

  // For CLASS, serialise class sessions for the client.
  const classSessions: ClientClassSession[] =
    selectedFacility && selectedFacility.bookingModel === "CLASS"
      ? selectedFacility.classes.map((cs) => ({
          id: cs.id,
          title: cs.title,
          startISO: cs.startTime.toISOString(),
          endISO: cs.endTime.toISOString(),
          capacity: cs.capacity,
          taken: cs._count.bookings,
          priceGEL: cs.priceGEL,
          instructor: cs.instructor,
        }))
      : [];

  // schema.org JSON-LD — SportsActivityLocation
  const minFacilityPrice = venue.facilities.length
    ? Math.min(...venue.facilities.map((f) => f.pricePerHourGEL))
    : null;
  const maxFacilityPrice = venue.facilities.length
    ? Math.max(...venue.facilities.map((f) => f.pricePerHourGEL))
    : null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: venue.name,
    description: venue.description || undefined,
    url: `/venues/${venue.slug}`,
    image: photos[0] ? [photos[0]] : undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: venue.address,
      addressLocality: venue.city,
      addressCountry: "GE",
    },
    geo:
      typeof venue.lat === "number" && typeof venue.lng === "number"
        ? {
            "@type": "GeoCoordinates",
            latitude: venue.lat,
            longitude: venue.lng,
          }
        : undefined,
    priceRange:
      minFacilityPrice !== null && maxFacilityPrice !== null
        ? `₾${minFacilityPrice}-${maxFacilityPrice}`
        : undefined,
    aggregateRating:
      reviewCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: Number(avgRating.toFixed(1)),
            reviewCount,
          }
        : undefined,
    sport: sportTags.map((s) => s.name),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // schema.org JSON-LD; safe — values come from our own DB.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PhotoGallery photos={photos} />
      <Container className="py-6 sm:py-8">
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1.4fr_1fr] lg:items-start lg:gap-8">

          {/* Booking panel */}
          <Card className="h-fit lg:order-2 lg:sticky lg:top-20">
            <CardContent>
              <h2 className="text-lg font-semibold">
                {selectedFacility
                  ? bookingModelHeader(selectedFacility.bookingModel, (k) => tRoot(k as never))
                  : t("bookACourt")}
              </h2>

              {selectedFacility ? (
                <>
                  {/* Facility selector — always available */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {venue.facilities.map((c) => (
                      <Link
                        key={c.id}
                        href={`/venues/${venue.slug}?facilityId=${c.id}&date=${dateStr}`}
                        scroll={false}
                        className={[
                          "rounded-full border px-3 py-1 text-sm",
                          c.id === selectedFacility.id
                            ? "border-brand-500 bg-brand-50 text-foreground"
                            : "border-border text-muted hover:text-foreground",
                        ].join(" ")}
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>

                  {/* TIME_SLOT — date strip + slot grid */}
                  {selectedFacility.bookingModel === "TIME_SLOT" && (
                    <>
                      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {days.map((d) => {
                          const ds = format(d, "yyyy-MM-dd");
                          const active = ds === dateStr;
                          return (
                            <Link
                              key={ds}
                              href={`/venues/${venue.slug}?facilityId=${selectedFacility.id}&date=${ds}`}
                              scroll={false}
                              className={[
                                "flex min-w-[3.25rem] flex-col items-center rounded-[var(--radius-md)] border px-2 py-1.5 text-center text-xs",
                                active
                                  ? "border-brand-600 bg-brand-500 text-foreground"
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
                          facilityId={selectedFacility.id}
                          slug={venue.slug}
                          isAuthenticated={!!user}
                        />
                      </div>
                    </>
                  )}

                  {/* CLASS — session list */}
                  {selectedFacility.bookingModel === "CLASS" && (
                    <div className="mt-5">
                      <ClassRoster
                        sessions={classSessions}
                        slug={venue.slug}
                        isAuthenticated={!!user}
                      />
                    </div>
                  )}

                  {/* DROP_IN — day pass CTA */}
                  {selectedFacility.bookingModel === "DROP_IN" && (
                    <div className="mt-5">
                      <DropInCta
                        facilityId={selectedFacility.id}
                        facilityName={selectedFacility.name}
                        priceGEL={selectedFacility.pricePerHourGEL}
                        slug={venue.slug}
                        isAuthenticated={!!user}
                      />
                    </div>
                  )}
                </>
              ) : (
                <p className="mt-4 text-sm text-muted">{t("noActiveCourts")}</p>
              )}
            </CardContent>
          </Card>

          {/* Info */}
          <div className="lg:order-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{venue.name}</h1>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-muted sm:text-base">
                  <MapPin className="h-4 w-4 shrink-0" /> {venue.address}, {venue.city}
                </p>
              </div>
              <FavoriteButton
                venueId={venue.id}
                initialFavorited={favorited}
                redirectTo={`/venues/${venue.slug}`}
                size="lg"
              />
            </div>

            {sportTags.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {sportTags.map((s) => (
                  <SportBadge key={s.id} name={tSportName(tRoot, s.slug)} slug={s.slug} />
                ))}
                {reviewCount > 0 && (
                  <Rating value={avgRating} count={reviewCount} />
                )}
              </div>
            )}

            {venue.description && (
              <p className="mt-4 text-sm leading-relaxed text-foreground/90 sm:text-base">
                {venue.description}
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
                      {AMENITY_LABELS[a as Amenity] ?? a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Reviews */}
            <div className="mt-6">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                {tRoot("venueDetail.reviews")}
                {reviewCount > 0 && <span className="text-foreground"> · {reviewCount}</span>}
              </h2>

              {user && (
                <Card className="mt-3">
                  <CardContent>
                    <ReviewForm
                      venueId={venue.id}
                      slug={venue.slug}
                      initialRating={myReview?.rating ?? 0}
                      initialComment={myReview?.comment ?? ""}
                    />
                  </CardContent>
                </Card>
              )}

              {reviews.length === 0 ? (
                <p className="mt-3 text-sm text-muted">{tRoot("venueDetail.noReviews")}</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {reviews.map((r) => (
                    <li key={r.id} className="rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{r.user.name}</span>
                        <Rating value={r.rating} size="sm" />
                      </div>
                      {r.comment && (
                        <p className="mt-1 text-sm text-foreground/85">{r.comment}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-6">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                {tRoot("venueDetail.facilities")}
              </h2>
              <div className="mt-3 space-y-2">
                {venue.facilities.map((c) => {
                  const adapter = getAdapter(c.sport.slug);
                  const attrs = parseAttributes(c.sport.slug, c.attributes);
                  const summary = adapter.summary(attrs);
                  const priceLabel =
                    c.bookingModel === "DROP_IN"
                      ? `${formatGEL(c.pricePerHourGEL)}${tRoot("venueDetail.perDay")}`
                      : c.bookingModel === "CLASS"
                        ? tRoot("venueDetail.fromPrice", { price: formatGEL(c.pricePerHourGEL) })
                        : `${formatGEL(c.pricePerHourGEL)}${tRoot("venueDetail.perHour")}`;
                  return (
                    <div
                      key={c.id}
                      className="rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{c.name}</span>
                          <SportBadge name={tSportName(tRoot, c.sport.slug)} slug={c.sport.slug} />
                        </div>
                        <span className="font-medium text-foreground">{priceLabel}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {summary.map((row) => (
                          <Badge key={row.labelKey + row.valueKey} tone="muted">
                            {tSummaryValue((k) => tRoot(k as never), row.valueKey)}
                          </Badge>
                        ))}
                        <Badge tone={c.isIndoor ? "brand" : "neutral"}>
                          {c.isIndoor ? t("indoor") : t("outdoor")}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </Container>
    </>
  );
}
