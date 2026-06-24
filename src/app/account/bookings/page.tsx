import Link from "next/link";
import { format } from "date-fns";
import { getTranslations } from "next-intl/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { cancelBookingAction } from "@/app/actions/booking";
import { formatGEL } from "@/lib/utils";
import { userAreaNav } from "@/lib/user-nav";
import { getTranslations as getRootT } from "next-intl/server";

function BookingRow({
  booking,
  cancellable,
  cancelLabel,
  rescheduleLabel,
}: {
  booking: {
    id: string;
    startTime: Date;
    endTime: Date;
    priceGEL: number;
    status: string;
    facility: { name: string; venue: { name: string; slug: string } };
  };
  cancellable: boolean;
  cancelLabel: string;
  rescheduleLabel: string;
}) {
  const tone =
    booking.status === "CANCELLED" ? "danger" : booking.status === "CONFIRMED" ? "success" : "warning";
  return (
    <div className="flex flex-col gap-3 border-b border-border py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <Link href={`/account/bookings/${booking.id}`} className="font-medium hover:underline">
            {booking.facility.venue.name}
          </Link>
          <Badge tone={tone}>{booking.status.toLowerCase()}</Badge>
        </div>
        <p className="mt-0.5 text-sm text-muted">
          {booking.facility.name} · {format(booking.startTime, "EEE d MMM, HH:mm")}–
          {format(booking.endTime, "HH:mm")}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{formatGEL(booking.priceGEL)}</span>
        {cancellable && (
          <>
            <LinkButton
              href={`/account/bookings/${booking.id}/reschedule`}
              variant="outline"
              size="sm"
            >
              {rescheduleLabel}
            </LinkButton>
            <form action={cancelBookingAction}>
              <input type="hidden" name="bookingId" value={booking.id} />
              <input type="hidden" name="redirectTo" value="/account/bookings" />
              <Button type="submit" variant="outline" size="sm">{cancelLabel}</Button>
            </form>
          </>
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
  const [t, tNav] = await Promise.all([
    getTranslations("accountBookings"),
    getRootT("nav"),
  ]);

  const ACCOUNT_NAV = userAreaNav(tNav, user.role);

  const bookings = await prisma.booking.findMany({
    where: { userId: user.id },
    include: { facility: { include: { venue: true } } },
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
                const cancellable = b.startTime.getTime() - Date.now() > 2 * 3_600_000;
                return (
                  <BookingRow
                    key={b.id}
                    booking={b}
                    cancellable={cancellable}
                    cancelLabel={t("cancel")}
                    rescheduleLabel={t("reschedule")}
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
                <BookingRow key={b.id} booking={b} cancellable={false} cancelLabel={t("cancel")} rescheduleLabel={t("reschedule")} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardShell>
  );
}
