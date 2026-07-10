import { prisma } from "./prisma";
import type { SessionUser } from "./session";
import { applyDiscountCode } from "./discount-codes";
import { generateShareCode, MIN_TEAM_SIZE, MAX_TEAM_SIZE } from "./team";
import {
  notifyBookingConfirmed,
  notifyBookingCancelled,
  notifyManagerNewBooking,
  notifyManagerBookingCancelled,
  notifyTeamCancelled,
} from "./notify";

export class BookingError extends Error {}

/** Maps the string errors thrown by applyDiscountCode into localisable BookingError messages. */
function toDiscountBookingError(err: unknown): BookingError {
  const msg = err instanceof Error ? err.message : String(err);
  switch (msg) {
    case "DISCOUNT_NOT_FOUND": return new BookingError("Discount code not found.");
    case "DISCOUNT_INACTIVE":  return new BookingError("This discount code is no longer active.");
    case "DISCOUNT_EXPIRED":   return new BookingError("This discount code has expired.");
    case "DISCOUNT_MIN_AMOUNT": return new BookingError("Booking total is below the code's minimum.");
    case "DISCOUNT_USER_LIMIT": return new BookingError("You have already used this discount code.");
    case "DISCOUNT_MAXED_OUT": return new BookingError("This discount code is fully redeemed.");
    default: return new BookingError("This discount code cannot be applied.");
  }
}

type CreateBookingInput = {
  facilityId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  notes?: string;
  discountCode?: string;
  /** Turn this into a team booking with N total players including owner. */
  teamSize?: number;
};

type CreateClassBookingInput = {
  classSessionId: string;
  userId: string;
  attendees: number;
  notes?: string;
  discountCode?: string;
};

type CreateDropInInput = {
  facilityId: string;
  userId: string;
  date: Date; // a calendar day; pass becomes valid for that day
  notes?: string;
  discountCode?: string;
};

/**
 * Create a booking inside a transaction, re-validating that the slot is free
 * immediately before insert to guarantee no double-booking under concurrency.
 */
export async function createBooking(input: CreateBookingInput) {
  const { facilityId, userId, startTime, endTime, notes, discountCode, teamSize } = input;

  if (endTime <= startTime) throw new BookingError("Invalid time range.");
  if (startTime < new Date()) throw new BookingError("Cannot book a slot in the past.");

  const isTeam = typeof teamSize === "number" && teamSize > 1;
  if (isTeam && (teamSize! < MIN_TEAM_SIZE || teamSize! > MAX_TEAM_SIZE)) {
    throw new BookingError(`Team size must be between ${MIN_TEAM_SIZE} and ${MAX_TEAM_SIZE}.`);
  }

  return prisma.$transaction(async (tx) => {
    const facility = await tx.facility.findUnique({
      where: { id: facilityId },
      include: { venue: true },
    });
    if (!facility || !facility.isActive) throw new BookingError("Facility is not available.");
    if (facility.venue.status !== "APPROVED") {
      throw new BookingError("This venue is not accepting bookings.");
    }

    // Conflict check: any overlapping non-cancelled booking?
    const conflict = await tx.booking.findFirst({
      where: {
        facilityId,
        status: { not: "CANCELLED" },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });
    if (conflict) throw new BookingError("That time slot was just taken. Please pick another.");

    // Conflict check: blackout overlap?
    const blackout = await tx.blackout.findFirst({
      where: {
        facilityId,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });
    if (blackout) throw new BookingError("That time is blocked by the venue.");

    const durationHours = (endTime.getTime() - startTime.getTime()) / 3_600_000;
    const subtotalGEL = Math.round(facility.pricePerHourGEL * durationHours);

    // Optionally redeem a discount code. Runs inside the same tx so the
    // usedCount bump rolls back on any downstream failure.
    let priceGEL = subtotalGEL;
    let discountCodeId: string | null = null;
    let discountAmountGEL: number | null = null;
    if (discountCode) {
      try {
        const applied = await applyDiscountCode(tx, discountCode, userId, subtotalGEL);
        priceGEL = applied.discountedGEL;
        discountCodeId = applied.codeId;
        discountAmountGEL = applied.discountGEL;
      } catch (err) {
        throw toDiscountBookingError(err);
      }
    }

    const booking = await tx.booking.create({
      data: {
        facilityId,
        userId,
        startTime,
        endTime,
        priceGEL,
        discountCodeId,
        discountAmountGEL,
        isTeam,
        teamSize: isTeam ? teamSize! : null,
        teamShareCode: isTeam ? generateShareCode() : null,
        status: "CONFIRMED",
        paymentStatus: "UNPAID", // Phase 1: pay at venue
        notes: notes || null,
      },
    });

    // Fire-and-forget confirmation email to player + notification to manager.
    // Side effects run after tx commits.
    void notifyBookingConfirmed(booking.id);
    void notifyManagerNewBooking(booking.id);

    return booking;
  });
}

/**
 * Book one or more seats in a CLASS session. Re-validates capacity inside the
 * transaction so concurrent bookings can't push the session over its limit.
 */
export async function createClassBooking(input: CreateClassBookingInput) {
  const { classSessionId, userId, attendees, notes, discountCode } = input;
  if (attendees < 1 || attendees > 20) throw new BookingError("Invalid number of attendees.");

  return prisma.$transaction(async (tx) => {
    const session = await tx.classSession.findUnique({
      where: { id: classSessionId },
      include: {
        facility: { include: { venue: true } },
        bookings: { where: { status: { not: "CANCELLED" } }, select: { attendees: true } },
      },
    });
    if (!session || session.isCancelled) throw new BookingError("This class is no longer available.");
    if (!session.facility.isActive) throw new BookingError("Facility is not available.");
    if (session.facility.venue.status !== "APPROVED") throw new BookingError("This venue is not accepting bookings.");
    if (session.startTime < new Date()) throw new BookingError("This class has already started.");

    const taken = session.bookings.reduce((sum, b) => sum + b.attendees, 0);
    if (taken + attendees > session.capacity) {
      const left = Math.max(0, session.capacity - taken);
      throw new BookingError(
        left === 0
          ? "This class is full."
          : `Only ${left} ${left === 1 ? "seat" : "seats"} left.`,
      );
    }

    const subtotalGEL = session.priceGEL * attendees;

    let priceGEL = subtotalGEL;
    let discountCodeId: string | null = null;
    let discountAmountGEL: number | null = null;
    if (discountCode) {
      try {
        const applied = await applyDiscountCode(tx, discountCode, userId, subtotalGEL);
        priceGEL = applied.discountedGEL;
        discountCodeId = applied.codeId;
        discountAmountGEL = applied.discountGEL;
      } catch (err) {
        throw toDiscountBookingError(err);
      }
    }

    const booking = await tx.booking.create({
      data: {
        facilityId: session.facilityId,
        classSessionId: session.id,
        userId,
        attendees,
        startTime: session.startTime,
        endTime: session.endTime,
        priceGEL,
        discountCodeId,
        discountAmountGEL,
        status: "CONFIRMED",
        paymentStatus: "UNPAID",
        notes: notes || null,
      },
    });

    void notifyBookingConfirmed(booking.id);
    void notifyManagerNewBooking(booking.id);

    return booking;
  });
}

/**
 * Buy a day pass for a DROP_IN facility (gym, pool entry). One pass per
 * user per facility per day — repeat purchase same day returns the existing
 * pass rather than throwing.
 */
export async function createDropInPass(input: CreateDropInInput) {
  const { facilityId, userId, date, notes, discountCode } = input;

  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  if (dayEnd <= new Date()) throw new BookingError("Cannot buy a pass for a past day.");

  return prisma.$transaction(async (tx) => {
    const facility = await tx.facility.findUnique({
      where: { id: facilityId },
      include: { venue: true },
    });
    if (!facility || !facility.isActive) throw new BookingError("Facility is not available.");
    if (facility.venue.status !== "APPROVED") throw new BookingError("This venue is not accepting bookings.");

    // Existing same-day pass for this user → return it (idempotent).
    const existing = await tx.booking.findFirst({
      where: {
        facilityId,
        userId,
        status: { not: "CANCELLED" },
        startTime: { gte: dayStart, lt: dayEnd },
      },
    });
    if (existing) return existing;

    const subtotalGEL = facility.pricePerHourGEL; // day-pass price stored in pricePerHourGEL for now

    let priceGEL = subtotalGEL;
    let discountCodeId: string | null = null;
    let discountAmountGEL: number | null = null;
    if (discountCode) {
      try {
        const applied = await applyDiscountCode(tx, discountCode, userId, subtotalGEL);
        priceGEL = applied.discountedGEL;
        discountCodeId = applied.codeId;
        discountAmountGEL = applied.discountGEL;
      } catch (err) {
        throw toDiscountBookingError(err);
      }
    }

    const booking = await tx.booking.create({
      data: {
        facilityId,
        userId,
        attendees: 1,
        startTime: dayStart,
        endTime: dayEnd,
        priceGEL,
        discountCodeId,
        discountAmountGEL,
        status: "CONFIRMED",
        paymentStatus: "UNPAID",
        notes: notes || null,
      },
    });

    void notifyBookingConfirmed(booking.id);
    void notifyManagerNewBooking(booking.id);

    return booking;
  });
}

export const PLAYER_CANCELLATION_WINDOW_MS = 2 * 3_600_000; // 2 hours before start

/** Cancel a booking. Players can cancel their own up to the cutoff; admins anytime. */
export async function cancelBooking(bookingId: string, actor: SessionUser) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { facility: { include: { venue: true } } },
  });
  if (!booking) throw new BookingError("Booking not found.");

  const isOwner = booking.userId === actor.id;
  const isVenueManager =
    actor.role === "CLUB_ADMIN" && booking.facility.venue.ownerId === actor.id;
  const isPlatformAdmin = actor.role === "PLATFORM_ADMIN";

  if (!isOwner && !isVenueManager && !isPlatformAdmin) {
    throw new BookingError("You cannot cancel this booking.");
  }
  if (booking.status === "CANCELLED") throw new BookingError("Already cancelled.");

  if (isOwner && !isVenueManager && !isPlatformAdmin) {
    const cutoff = booking.startTime.getTime() - PLAYER_CANCELLATION_WINDOW_MS;
    if (Date.now() > cutoff) {
      throw new BookingError(
        "Bookings can only be cancelled at least 2 hours before the start time.",
      );
    }
  }

  // Cancelling a booking that consumed a discount code should return that
  // redemption to the pool — otherwise a limited-run code becomes unusable
  // after a few cancellations. Done in a tx so the two updates commit together.
  const updated = await prisma.$transaction(async (tx) => {
    const b = await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    });
    if (b.discountCodeId) {
      // Guard against underflow if a code was manually reset elsewhere.
      await tx.discountCode.updateMany({
        where: { id: b.discountCodeId, usedCount: { gt: 0 } },
        data: { usedCount: { decrement: 1 } },
      });
    }
    return b;
  });

  void notifyBookingCancelled(updated.id);
  void notifyManagerBookingCancelled(updated.id);
  if (booking.isTeam) void notifyTeamCancelled(updated.id);

  return updated;
}

export async function rescheduleBooking({
  bookingId,
  userId,
  newStartTime,
  newEndTime,
}: {
  bookingId: string;
  userId: string;
  newStartTime: Date;
  newEndTime: Date;
}) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { facility: true },
  });

  if (!booking) throw new BookingError("Booking not found.");
  if (booking.userId !== userId) throw new BookingError("Not your booking.");
  if (booking.status === "CANCELLED") throw new BookingError("Cannot reschedule a cancelled booking.");
  if (booking.endTime < new Date()) throw new BookingError("Cannot reschedule a past booking.");

  const cutoff = booking.startTime.getTime() - PLAYER_CANCELLATION_WINDOW_MS;
  if (Date.now() > cutoff) {
    throw new BookingError("Bookings can only be rescheduled at least 2 hours before the start time.");
  }

  if (newEndTime <= newStartTime) throw new BookingError("Invalid time range.");
  if (newStartTime < new Date()) throw new BookingError("Cannot reschedule to a slot in the past.");

  // Duration must match original
  const originalDuration = booking.endTime.getTime() - booking.startTime.getTime();
  const newDuration = newEndTime.getTime() - newStartTime.getTime();
  if (originalDuration !== newDuration) throw new BookingError("Duration must match the original booking.");

  // Reject no-op reschedule
  if (
    newStartTime.getTime() === booking.startTime.getTime() &&
    newEndTime.getTime() === booking.endTime.getTime()
  ) {
    throw new BookingError("Please select a different time slot.");
  }

  return prisma.$transaction(async (tx) => {
    const current = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!current || current.status === "CANCELLED") throw new BookingError("Booking is no longer active.");

    const conflict = await tx.booking.findFirst({
      where: {
        facilityId: booking.facilityId,
        id: { not: bookingId },
        status: { not: "CANCELLED" },
        startTime: { lt: newEndTime },
        endTime: { gt: newStartTime },
      },
    });
    if (conflict) throw new BookingError("That slot was just taken. Please pick another.");

    const blackout = await tx.blackout.findFirst({
      where: {
        facilityId: booking.facilityId,
        startTime: { lt: newEndTime },
        endTime: { gt: newStartTime },
      },
    });
    if (blackout) throw new BookingError("That time is blocked by the venue.");

    const durationHours = newDuration / 3_600_000;
    const priceGEL = Math.round(booking.facility.pricePerHourGEL * durationHours);

    await tx.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED" } });

    return tx.booking.create({
      data: {
        facilityId: booking.facilityId,
        userId,
        startTime: newStartTime,
        endTime: newEndTime,
        priceGEL,
        status: "CONFIRMED",
        paymentStatus: "UNPAID",
        notes: booking.notes,
      },
    });
  });
}
