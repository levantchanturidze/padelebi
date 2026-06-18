import { prisma } from "./prisma";

export type Slot = {
  start: Date;
  end: Date;
  available: boolean;
  priceGEL: number;
};

/** Build a Date at the given local Y/M/D with `minutes` from midnight. */
function dateAtMinutes(base: Date, minutes: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0);
  d.setMinutes(minutes);
  return d;
}

/** Start (inclusive) and end (exclusive) of the local day for `date`. */
function dayBounds(date: Date): { dayStart: Date; dayEnd: Date } {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return { dayStart, dayEnd };
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Compute bookable slots for a court on a given date from its weekly schedule,
 * subtracting existing (non-cancelled) bookings and blackouts. Past slots are
 * marked unavailable.
 */
export async function getCourtAvailability(
  courtId: string,
  date: Date,
  excludeBookingId?: string,
): Promise<Slot[]> {
  const court = await prisma.court.findUnique({
    where: { id: courtId },
    include: {
      schedules: true,
      bookings: true,
      blackouts: true,
    },
  });
  if (!court || !court.isActive) return [];

  const { dayStart, dayEnd } = dayBounds(date);
  const weekday = dayStart.getDay();
  const schedule = court.schedules.find((s) => s.dayOfWeek === weekday);
  if (!schedule) return []; // closed that day

  const bookings = court.bookings.filter(
    (b) =>
      b.status !== "CANCELLED" &&
      b.id !== excludeBookingId &&
      overlaps(b.startTime, b.endTime, dayStart, dayEnd),
  );
  const blackouts = court.blackouts.filter((bl) =>
    overlaps(bl.startTime, bl.endTime, dayStart, dayEnd),
  );

  const now = new Date();
  const slots: Slot[] = [];
  const durationHours = schedule.slotMinutes / 60;
  const priceGEL = Math.round(court.pricePerHourGEL * durationHours);

  for (let m = schedule.openMinutes; m + schedule.slotMinutes <= schedule.closeMinutes; m += schedule.slotMinutes) {
    const start = dateAtMinutes(dayStart, m);
    const end = dateAtMinutes(dayStart, m + schedule.slotMinutes);

    const taken =
      start < now ||
      bookings.some((b) => overlaps(start, end, b.startTime, b.endTime)) ||
      blackouts.some((bl) => overlaps(start, end, bl.startTime, bl.endTime));

    slots.push({ start, end, available: !taken, priceGEL });
  }

  return slots;
}
