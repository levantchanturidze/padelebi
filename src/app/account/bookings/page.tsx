import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays, Clock, MapPin, BadgePercent, FileText, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { SportBadge } from "@/components/sport/sport-badge";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { cancelBookingAction } from "@/app/actions/booking";
import { formatGEL } from "@/lib/utils";
import { userAreaNav } from "@/lib/user-nav";
import { tSportName } from "@/lib/sports";
import { getTranslations as getRootT } from "next-intl/server";

type Translator = (key: string, values?: Record<string, string | number>) => string;

function BookingRow({
  booking,
  sportName,
  cancellable,
  t,
}: {
  booking: {
    id: string;
    startTime: Date;
    endTime: Date;
    priceGEL: number;
    status: string;
    isTeam: boolean;
    teamSize: number | null;
    discountAmountGEL: number | null;
    notes: string | null;
    facility: {
      name: string;
      sport: { slug: string };
      venue: { name: string; slug: string; city: string; district: string | null };
    };
  };
  sportName: string;
  cancellable: boolean;
  t: Translator;
}) {
  const tone =
    booking.status === "CANCELLED" ? "danger" : booking.status === "CONFIRMED" ? "success" : "warning";

  const mins = Math.round((booking.endTime.getTime() - booking.startTime.getTime()) / 60_000);
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  const duration = rem ? `${hours}h ${rem}m` : `${hours}h`;

  const hasDiscount = !!booking.discountAmountGEL && booking.discountAmountGEL > 0;
  const originalGEL = booking.priceGEL + (booking.discountAmountGEL ?? 0);
  const ref = booking.id.slice(-6).toUpperCase();
  const location = [booking.facility.venue.district, booking.facility.venue.city]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex flex-col gap-3 border-b border-border py-4 last:border-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/account/bookings/${booking.id}`} className="font-medium hover:underline">
            {booking.facility.venue.name}
          </Link>
          <Badge tone={tone}>{booking.status.toLowerCase()}</Badge>
          {booking.isTeam && booking.teamSize && (
            <Badge tone="brand">
              <Users className="mr-1 h-3 w-3" />
              {t("players", { count: booking.teamSize })}
            </Badge>
          )}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <SportBadge name={sportName} slug={booking.facility.sport.slug} />
          <span>{booking.facility.name}</span>
          <span className="text-border">·</span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {format(booking.startTime, "EEE d MMM, HH:mm")}–{format(booking.endTime, "HH:mm")}
          </span>
          <span className="text-border">·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {duration}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {location}
            </span>
          )}
          {hasDiscount && (
            <span className="inline-flex items-center gap-1 text-brand-700">
              <BadgePercent className="h-3.5 w-3.5" />
              {t("saved", { amount: formatGEL(booking.discountAmountGEL!) })}
            </span>
          )}
          {booking.notes && (
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              {t("notesLabel")}
            </span>
          )}
          <span className="inline-flex items-center gap-1 tabular-nums">
            {t("ref")} {ref}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
        <div className="text-right">
          {hasDiscount && (
            <span className="mr-1 text-xs text-muted line-through">{formatGEL(originalGEL)}</span>
          )}
          <span className="text-sm font-medium">{formatGEL(booking.priceGEL)}</span>
        </div>
        {cancellable && (
          <div className="flex items-center gap-2">
            <LinkButton
              href={`/account/bookings/${booking.id}/reschedule`}
              variant="outline"
              size="sm"
            >
              {t("reschedule")}
            </LinkButton>
            <form action={cancelBookingAction}>
              <input type="hidden" name="bookingId" value={booking.id} />
              <input type="hidden" name="redirectTo" value="/account/bookings" />
              <Button type="submit" variant="outline" size="sm">{t("cancel")}</Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default async function MyBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ booked?: string; error?: string }>;
}) {
  const user = await requireUser("/account/bookings");
  const { booked, error } = await searchParams;
  const [t, tNav, tRoot] = await Promise.all([
    getTranslations("accountBookings"),
    getRootT("nav"),
    getRootT(),
  ]);

  const ACCOUNT_NAV = userAreaNav(tNav, user.role);

  const bookings = await prisma.booking.findMany({
    where: { userId: user.id },
    include: { facility: { include: { venue: true, sport: true } } },
    orderBy: { startTime: "desc" },
  });

  const now = new Date();
  const upcoming = bookings.filter((b) => b.endTime >= now && b.status !== "CANCELLED");
  const past = bookings.filter((b) => b.endTime < now || b.status === "CANCELLED");

  return (
    <DashboardShell title={t("title")} nav={ACCOUNT_NAV} current="/account/bookings">
      {booked && (
        <p className="mb-4 rounded-[var(--radius-md)] bg-brand-50 px-4 py-3 text-sm text-brand-700">
          {t("confirmed")}
        </p>
      )}
      {error === "cancel" && (
        <p className="mb-4 rounded-[var(--radius-md)] bg-red-50 px-4 py-3 text-sm text-danger">
          {t("cancelError")}
        </p>
      )}

      <Card>
        <CardContent>
          <h2 className="font-semibold">{t("upcoming")}</h2>
          {upcoming.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              {t("noUpcoming")}{" "}
              <Link href="/venues" className="text-brand-600 hover:underline">{t("findACourt")}</Link>
            </p>
          ) : (
            <div className="mt-2">
              {upcoming.map((b) => {
                const cancellable = b.startTime.getTime() - now.getTime() > 2 * 3_600_000;
                return (
                  <BookingRow
                    key={b.id}
                    booking={b}
                    sportName={tSportName(tRoot, b.facility.sport.slug, b.facility.sport.name)}
                    cancellable={cancellable}
                    t={t}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {past.length > 0 && (
        <Card className="mt-6">
          <CardContent>
            <h2 className="font-semibold">{t("pastCancelled")}</h2>
            <div className="mt-2 opacity-80">
              {past.map((b) => (
                <BookingRow
                  key={b.id}
                  booking={b}
                  sportName={tSportName(tRoot, b.facility.sport.slug, b.facility.sport.name)}
                  cancellable={false}
                  t={t}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardShell>
  );
}
