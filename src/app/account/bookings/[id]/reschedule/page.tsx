import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { addDays, format } from "date-fns";
import { ArrowLeft, CalendarDays, Clock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { ReschedulePanel } from "@/components/reschedule-panel";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getCourtAvailability } from "@/lib/availability";
import { PLAYER_CANCELLATION_WINDOW_MS } from "@/lib/booking";
import { formatGEL } from "@/lib/utils";
import type { ClientSlot } from "@/components/booking-panel";

function parseDateParam(date?: string): Date {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export default async function ReschedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { id } = await params;
  const { date } = await searchParams;
  const user = await requireUser(`/account/bookings/${id}/reschedule`);
  const t = await getTranslations("reschedule");

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { court: { include: { club: true } } },
  });

  if (!booking) notFound();
  if (booking.userId !== user.id) redirect("/account/bookings");
  if (booking.status === "CANCELLED") redirect(`/account/bookings/${id}`);

  const now = new Date();
  const tooLate = Date.now() > booking.startTime.getTime() - PLAYER_CANCELLATION_WINDOW_MS;
  const isPast = booking.endTime < now;

  const selectedDate = parseDateParam(date);
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const days = Array.from({ length: 14 }, (_, i) => addDays(now, i));

  const slots: ClientSlot[] =
    tooLate || isPast
      ? []
      : (await getCourtAvailability(booking.court.id, selectedDate, booking.id)).map((s) => ({
          start: s.start.toISOString(),
          end: s.end.toISOString(),
          available: s.available,
          priceGEL: s.priceGEL,
        }));

  const durationMs = booking.endTime.getTime() - booking.startTime.getTime();
  const durationH = durationMs / 3_600_000;
  const durationLabel = Number.isInteger(durationH) ? `${durationH}h` : `${durationH}h`;

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-lg">

        {/* Back link */}
        <Link
          href={`/account/bookings/${id}`}
          className="mb-6 flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Link>

        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted">{booking.court.club.name} · {booking.court.name}</p>

        {/* Current slot */}
        <div className="mt-6 rounded-[var(--radius-lg)] border border-border bg-surface px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t("currentSlot")}</p>
          <div className="mt-2 flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm">
              <CalendarDays className="h-4 w-4 text-muted" />
              <span>{format(booking.startTime, "EEE, d MMM yyyy")}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className="h-4 w-4 text-muted" />
              <span>
                {format(booking.startTime, "HH:mm")}–{format(booking.endTime, "HH:mm")}
              </span>
            </div>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-xs text-muted">{durationLabel} · {formatGEL(booking.priceGEL)} · {t("payAtClub")}</span>
          </div>
        </div>

        {tooLate || isPast ? (
          <p className="mt-6 rounded-[var(--radius-md)] bg-red-50 px-4 py-3 text-sm text-danger">
            Bookings can only be rescheduled at least 2 hours before the start time.
          </p>
        ) : (
          <>
            {/* Section heading */}
            <h2 className="mt-8 text-base font-semibold">{t("pickNewTime")}</h2>

            {/* Date strip */}
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {days.map((d) => {
                const ds = format(d, "yyyy-MM-dd");
                const active = ds === dateStr;
                return (
                  <Link
                    key={ds}
                    href={`/account/bookings/${id}/reschedule?date=${ds}`}
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

            {/* Slot picker */}
            <div className="mt-5">
              <ReschedulePanel
                slots={slots}
                bookingId={id}
                originalDurationMs={durationMs}
                originalStartISO={booking.startTime.toISOString()}
                originalEndISO={booking.endTime.toISOString()}
                pricePerHourGEL={booking.court.pricePerHourGEL}
              />
            </div>
          </>
        )}

      </div>
    </Container>
  );
}
