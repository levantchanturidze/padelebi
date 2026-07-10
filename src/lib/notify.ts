/**
 * Notification side-effects layer. Wraps email sends with the locale lookup,
 * URL building, and date formatting needed to render each template, so the
 * booking / auth code only sees a one-liner per event.
 *
 * Every function here is fire-and-forget: it catches its own errors and
 * never throws back into the caller's transaction.
 */
import { format } from "date-fns";
import { prisma } from "./prisma";
import { sendEmail, normalizeLocale } from "./email";
import { absoluteUrl } from "./seo";
import { BookingConfirmedEmail } from "@/emails/booking-confirmed";
import { BookingReminderEmail } from "@/emails/booking-reminder";
import { BookingCancelledEmail } from "@/emails/booking-cancelled";
import { PasswordResetEmail } from "@/emails/password-reset";
import { ManagerNewBookingEmail } from "@/emails/manager-new-booking";
import { ManagerBookingCancelledEmail } from "@/emails/manager-booking-cancelled";

function whenLabel(start: Date, end: Date): string {
  return `${format(start, "EEE, d MMM · HH:mm")}–${format(end, "HH:mm")}`;
}

function formatGEL(amount: number): string {
  return `₾${amount}`;
}

const SUBJECTS = {
  confirmed: {
    en: (venue: string) => `You're booked at ${venue}`,
    ka: (venue: string) => `${venue} — ჯავშანი დადასტურდა`,
  },
  reminder: {
    en: (venue: string) => `Tomorrow at ${venue}`,
    ka: (venue: string) => `ხვალ — ${venue}`,
  },
  cancelled: {
    en: () => "Your booking was cancelled",
    ka: () => "ჯავშანი გაუქმდა",
  },
  reset: {
    en: () => "Reset your Playtora password",
    ka: () => "Playtora — პაროლის აღდგენა",
  },
  managerNew: {
    en: (venue: string) => `New booking at ${venue}`,
    ka: (venue: string) => `${venue} — ახალი ჯავშანი`,
  },
  managerCancelled: {
    en: (venue: string) => `Booking cancelled at ${venue}`,
    ka: (venue: string) => `${venue} — ჯავშანი გაუქმდა`,
  },
} as const;

// ────────────────────────────────────────────────────────────────────────
// Booking confirmation — sent on every successful createBooking* call.
// ────────────────────────────────────────────────────────────────────────
export async function notifyBookingConfirmed(bookingId: string): Promise<void> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        facility: { include: { venue: true } },
        discountCode: true,
      },
    });
    if (!booking?.user.email) return;

    const locale = normalizeLocale(booking.user.locale);
    const bookingUrl = absoluteUrl(`/account/bookings/${booking.id}`);
    const discountLabel =
      booking.discountAmountGEL && booking.discountAmountGEL > 0
        ? `${booking.discountCode?.code ?? "—"} · −${formatGEL(booking.discountAmountGEL)}`
        : null;

    await sendEmail({
      to: booking.user.email,
      subject: SUBJECTS.confirmed[locale](booking.facility.venue.name),
      tag: "booking-confirmed",
      react: BookingConfirmedEmail({
        locale,
        userName: booking.user.name,
        venueName: booking.facility.venue.name,
        facilityName: booking.facility.name,
        whenLabel: whenLabel(booking.startTime, booking.endTime),
        totalLabel: formatGEL(booking.priceGEL),
        discountLabel,
        bookingUrl,
      }),
    });
  } catch (err) {
    console.error("notifyBookingConfirmed failed:", err);
  }
}

// ────────────────────────────────────────────────────────────────────────
// Booking reminder — fired by the 24h cron.
// ────────────────────────────────────────────────────────────────────────
export async function notifyBookingReminder(bookingId: string): Promise<boolean> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        facility: { include: { venue: true } },
      },
    });
    if (!booking?.user.email) return false;
    if (booking.status === "CANCELLED") return false;

    const locale = normalizeLocale(booking.user.locale);
    const bookingUrl = absoluteUrl(`/account/bookings/${booking.id}`);

    const id = await sendEmail({
      to: booking.user.email,
      subject: SUBJECTS.reminder[locale](booking.facility.venue.name),
      tag: "booking-reminder",
      react: BookingReminderEmail({
        locale,
        venueName: booking.facility.venue.name,
        whenLabel: whenLabel(booking.startTime, booking.endTime),
        bookingUrl,
      }),
    });
    return id !== null;
  } catch (err) {
    console.error("notifyBookingReminder failed:", err);
    return false;
  }
}

// ────────────────────────────────────────────────────────────────────────
// Booking cancellation — sent on cancelBooking.
// ────────────────────────────────────────────────────────────────────────
export async function notifyBookingCancelled(bookingId: string): Promise<void> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        facility: { include: { venue: true } },
      },
    });
    if (!booking?.user.email) return;

    const locale = normalizeLocale(booking.user.locale);

    await sendEmail({
      to: booking.user.email,
      subject: SUBJECTS.cancelled[locale](),
      tag: "booking-cancelled",
      react: BookingCancelledEmail({
        locale,
        venueName: booking.facility.venue.name,
        whenLabel: whenLabel(booking.startTime, booking.endTime),
        venuesUrl: absoluteUrl("/venues"),
      }),
    });
  } catch (err) {
    console.error("notifyBookingCancelled failed:", err);
  }
}

// ────────────────────────────────────────────────────────────────────────
// Manager — new booking notification. Sent to the venue owner when a
// player books at their venue. Skipped if the owner IS the player
// (self-bookings shouldn't spam the manager's own inbox).
// ────────────────────────────────────────────────────────────────────────
export async function notifyManagerNewBooking(bookingId: string): Promise<void> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        facility: { include: { venue: { include: { owner: true } } } },
      },
    });
    if (!booking?.facility.venue.owner.email) return;
    if (booking.userId === booking.facility.venue.ownerId) return; // self-booking

    const locale = normalizeLocale(booking.facility.venue.owner.locale);
    const managerUrl = absoluteUrl(`/manager/bookings`);

    await sendEmail({
      to: booking.facility.venue.owner.email,
      subject: SUBJECTS.managerNew[locale](booking.facility.venue.name),
      tag: "manager-new-booking",
      react: ManagerNewBookingEmail({
        locale,
        playerName: booking.user.name,
        playerPhone: booking.user.phone,
        facilityName: `${booking.facility.venue.name} · ${booking.facility.name}`,
        whenLabel: whenLabel(booking.startTime, booking.endTime),
        totalLabel: formatGEL(booking.priceGEL),
        notes: booking.notes,
        managerUrl,
      }),
    });
  } catch (err) {
    console.error("notifyManagerNewBooking failed:", err);
  }
}

// ────────────────────────────────────────────────────────────────────────
// Manager — booking cancelled notification.
// ────────────────────────────────────────────────────────────────────────
export async function notifyManagerBookingCancelled(bookingId: string): Promise<void> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        facility: { include: { venue: { include: { owner: true } } } },
      },
    });
    if (!booking?.facility.venue.owner.email) return;
    if (booking.userId === booking.facility.venue.ownerId) return;

    const locale = normalizeLocale(booking.facility.venue.owner.locale);
    const managerUrl = absoluteUrl(`/manager/bookings`);

    await sendEmail({
      to: booking.facility.venue.owner.email,
      subject: SUBJECTS.managerCancelled[locale](booking.facility.venue.name),
      tag: "manager-booking-cancelled",
      react: ManagerBookingCancelledEmail({
        locale,
        playerName: booking.user.name,
        facilityName: `${booking.facility.venue.name} · ${booking.facility.name}`,
        whenLabel: whenLabel(booking.startTime, booking.endTime),
        managerUrl,
      }),
    });
  } catch (err) {
    console.error("notifyManagerBookingCancelled failed:", err);
  }
}

// ────────────────────────────────────────────────────────────────────────
// Password reset — sent on forgotPasswordAction.
// ────────────────────────────────────────────────────────────────────────
export async function notifyPasswordReset(args: {
  email: string;
  locale: string | null | undefined;
  token: string;
}): Promise<void> {
  try {
    const locale = normalizeLocale(args.locale);
    const resetUrl = absoluteUrl(`/reset-password?token=${args.token}`);

    await sendEmail({
      to: args.email,
      subject: SUBJECTS.reset[locale](),
      tag: "password-reset",
      react: PasswordResetEmail({ locale, resetUrl }),
    });
  } catch (err) {
    console.error("notifyPasswordReset failed:", err);
  }
}
