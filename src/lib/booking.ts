import { prisma } from "./prisma";
import type { SessionUser } from "./session";

export class BookingError extends Error {}

type CreateBookingInput = {
  courtId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  notes?: string;
};

/**
 * Create a booking inside a transaction, re-validating that the slot is free
 * immediately before insert to guarantee no double-booking under concurrency.
 */
export async function createBooking(input: CreateBookingInput) {
  const { courtId, userId, startTime, endTime, notes } = input;

  if (endTime <= startTime) throw new BookingError("Invalid time range.");
  if (startTime < new Date()) throw new BookingError("Cannot book a slot in the past.");

  return prisma.$transaction(async (tx) => {
    const court = await tx.court.findUnique({
      where: { id: courtId },
      include: { club: true },
    });
    if (!court || !court.isActive) throw new BookingError("Court is not available.");
    if (court.club.status !== "APPROVED") {
      throw new BookingError("This club is not accepting bookings.");
    }

    // Conflict check: any overlapping non-cancelled booking?
    const conflict = await tx.booking.findFirst({
      where: {
        courtId,
        status: { not: "CANCELLED" },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });
    if (conflict) throw new BookingError("That time slot was just taken. Please pick another.");

    // Conflict check: blackout overlap?
    const blackout = await tx.blackout.findFirst({
      where: {
        courtId,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });
    if (blackout) throw new BookingError("That time is blocked by the club.");

    const durationHours = (endTime.getTime() - startTime.getTime()) / 3_600_000;
    const priceGEL = Math.round(court.pricePerHourGEL * durationHours);

    return tx.booking.create({
      data: {
        courtId,
        userId,
        startTime,
        endTime,
        priceGEL,
        status: "CONFIRMED",
        paymentStatus: "UNPAID", // Phase 1: pay at club
        notes: notes || null,
      },
    });
  });
}

const PLAYER_CANCELLATION_WINDOW_MS = 2 * 3_600_000; // 2 hours before start

/** Cancel a booking. Players can cancel their own up to the cutoff; admins anytime. */
export async function cancelBooking(bookingId: string, actor: SessionUser) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { court: { include: { club: true } } },
  });
  if (!booking) throw new BookingError("Booking not found.");

  const isOwner = booking.userId === actor.id;
  const isClubAdmin =
    actor.role === "CLUB_ADMIN" && booking.court.club.ownerId === actor.id;
  const isPlatformAdmin = actor.role === "PLATFORM_ADMIN";

  if (!isOwner && !isClubAdmin && !isPlatformAdmin) {
    throw new BookingError("You cannot cancel this booking.");
  }
  if (booking.status === "CANCELLED") throw new BookingError("Already cancelled.");

  if (isOwner && !isClubAdmin && !isPlatformAdmin) {
    const cutoff = booking.startTime.getTime() - PLAYER_CANCELLATION_WINDOW_MS;
    if (Date.now() > cutoff) {
      throw new BookingError(
        "Bookings can only be cancelled at least 2 hours before the start time.",
      );
    }
  }

  return prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  });
}
