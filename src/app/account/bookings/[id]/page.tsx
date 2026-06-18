import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { Check, CalendarDays, Clock, MapPin, CreditCard, FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { cancelBookingAction } from "@/app/actions/booking";
import { formatGEL } from "@/lib/utils";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/account/bookings/${id}`);
  const t = await getTranslations("bookingDetail");

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { court: { include: { club: true } } },
  });

  if (!booking) notFound();
  // Only the owner (or future: admins) may view this page
  if (booking.userId !== user.id) redirect("/account/bookings");

  const durationMs = booking.endTime.getTime() - booking.startTime.getTime();
  const durationH = durationMs / 3_600_000;
  const durationLabel = Number.isInteger(durationH) ? `${durationH}h` : `${durationH}h`;

  const now = new Date();
  const cancellable =
    booking.status === "CONFIRMED" &&
    booking.endTime >= now &&
    booking.startTime.getTime() - now.getTime() > 2 * 3_600_000;

  const isCancelled = booking.status === "CANCELLED";
  const isUpcoming = !isCancelled && booking.endTime >= now;

  const rows: { icon: React.ReactNode; label: string; value: string }[] = [
    {
      icon: <MapPin className="h-4 w-4 text-muted" />,
      label: t("club"),
      value: booking.court.club.name,
    },
    {
      icon: <MapPin className="h-4 w-4 text-muted opacity-0" />,
      label: t("court"),
      value: booking.court.name,
    },
    {
      icon: <CalendarDays className="h-4 w-4 text-muted" />,
      label: t("date"),
      value: format(booking.startTime, "EEEE, d MMMM yyyy"),
    },
    {
      icon: <Clock className="h-4 w-4 text-muted" />,
      label: t("time"),
      value: `${format(booking.startTime, "HH:mm")}–${format(booking.endTime, "HH:mm")}`,
    },
    {
      icon: <Clock className="h-4 w-4 text-muted opacity-0" />,
      label: t("duration"),
      value: durationLabel,
    },
    {
      icon: <CreditCard className="h-4 w-4 text-muted" />,
      label: t("total"),
      value: `${formatGEL(booking.priceGEL)} · ${t("payAtClub")}`,
    },
  ];

  if (booking.notes) {
    rows.push({
      icon: <FileText className="h-4 w-4 text-muted" />,
      label: t("notes"),
      value: booking.notes,
    });
  }

  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto max-w-md">

        {/* Status badge */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div
            className={[
              "flex h-16 w-16 items-center justify-center rounded-full shadow-brand",
              isCancelled
                ? "bg-red-100"
                : "bg-gradient-to-b from-brand-400 to-brand-600",
            ].join(" ")}
          >
            <Check className={["h-8 w-8", isCancelled ? "text-red-500" : "text-white"].join(" ")} />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            {isCancelled ? t("cancelled") : t("confirmed")}
          </h1>
          {isUpcoming && (
            <p className="mt-1 text-sm text-muted">{t("payAtClub")} · {booking.court.club.address}</p>
          )}
        </div>

        {/* Details card */}
        <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface shadow-card-md">
          <div className="border-b border-border px-5 py-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              {t("title")}
            </span>
            <Badge tone={isCancelled ? "danger" : isUpcoming ? "success" : "muted"}>
              {booking.status.toLowerCase()}
            </Badge>
          </div>

          <dl className="divide-y divide-border">
            {rows.map((row, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3">
                <div className="mt-0.5 shrink-0">{row.icon}</div>
                <dt className="w-24 shrink-0 text-sm text-muted">{row.label}</dt>
                <dd className="flex-1 text-sm font-medium text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3">
          <LinkButton href="/account/bookings" variant="primary" size="lg" className="w-full">
            {t("viewBookings")}
          </LinkButton>
          <LinkButton href="/clubs" variant="outline" size="lg" className="w-full">
            {t("bookAnother")}
          </LinkButton>

          {cancellable && (
            <>
              <LinkButton
                href={`/account/bookings/${booking.id}/reschedule`}
                variant="outline"
                size="lg"
                className="w-full"
              >
                {t("reschedule")}
              </LinkButton>
              <div>
                <form action={cancelBookingAction}>
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <input type="hidden" name="redirectTo" value="/account/bookings" />
                  <Button type="submit" variant="ghost" size="sm" className="w-full text-danger hover:bg-red-50">
                    {t("cancel")}
                  </Button>
                </form>
                <p className="mt-1 text-center text-xs text-muted">{t("cancelNote")}</p>
              </div>
            </>
          )}
        </div>

      </div>
    </Container>
  );
}
