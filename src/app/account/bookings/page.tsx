import Link from "next/link";
import { format } from "date-fns";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { cancelBookingAction } from "@/app/actions/booking";
import { formatGEL } from "@/lib/utils";

const ACCOUNT_NAV = [
  { href: "/account/bookings", label: "My bookings" },
  { href: "/account/profile", label: "Profile" },
];

function BookingRow({
  booking,
  cancellable,
}: {
  booking: {
    id: string;
    startTime: Date;
    endTime: Date;
    priceGEL: number;
    status: string;
    court: { name: string; club: { name: string; slug: string } };
  };
  cancellable: boolean;
}) {
  const tone =
    booking.status === "CANCELLED" ? "danger" : booking.status === "CONFIRMED" ? "success" : "warning";
  return (
    <div className="flex flex-col gap-3 border-b border-border py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <Link href={`/clubs/${booking.court.club.slug}`} className="font-medium hover:underline">
            {booking.court.club.name}
          </Link>
          <Badge tone={tone}>{booking.status.toLowerCase()}</Badge>
        </div>
        <p className="mt-0.5 text-sm text-muted">
          {booking.court.name} · {format(booking.startTime, "EEE d MMM, HH:mm")}–
          {format(booking.endTime, "HH:mm")}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{formatGEL(booking.priceGEL)}</span>
        {cancellable && (
          <form action={cancelBookingAction}>
            <input type="hidden" name="bookingId" value={booking.id} />
            <input type="hidden" name="redirectTo" value="/account/bookings" />
            <Button type="submit" variant="outline" size="sm">
              Cancel
            </Button>
          </form>
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

  const bookings = await prisma.booking.findMany({
    where: { userId: user.id },
    include: { court: { include: { club: true } } },
    orderBy: { startTime: "desc" },
  });

  const now = new Date();
  const upcoming = bookings.filter((b) => b.endTime >= now && b.status !== "CANCELLED");
  const past = bookings.filter((b) => b.endTime < now || b.status === "CANCELLED");

  return (
    <DashboardShell title="My bookings" nav={ACCOUNT_NAV} current="/account/bookings">
      {booked && (
        <p className="mb-4 rounded-[var(--radius-md)] bg-brand-50 px-4 py-3 text-sm text-brand-700">
          Booking confirmed! Pay at the club when you arrive.
        </p>
      )}
      {error === "cancel" && (
        <p className="mb-4 rounded-[var(--radius-md)] bg-red-50 px-4 py-3 text-sm text-danger">
          Could not cancel — bookings must be cancelled at least 2 hours before start.
        </p>
      )}

      <Card>
        <CardContent>
          <h2 className="font-semibold">Upcoming</h2>
          {upcoming.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              No upcoming bookings.{" "}
              <Link href="/clubs" className="text-brand-600 hover:underline">
                Find a court
              </Link>
            </p>
          ) : (
            <div className="mt-2">
              {upcoming.map((b) => (
                <BookingRow key={b.id} booking={b} cancellable />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {past.length > 0 && (
        <Card className="mt-6">
          <CardContent>
            <h2 className="font-semibold">Past & cancelled</h2>
            <div className="mt-2 opacity-80">
              {past.map((b) => (
                <BookingRow key={b.id} booking={b} cancellable={false} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardShell>
  );
}
