"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createBooking,
  cancelBooking,
  rescheduleBooking,
  createClassBooking,
  createDropInPass,
  BookingError,
} from "@/lib/booking";
import { getCurrentUser } from "@/lib/session";

export type BookingActionState = { error?: string; success?: string } | undefined;

export async function createBookingAction(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const user = await getCurrentUser();
  const facilityId = String(formData.get("facilityId") ?? "");
  const start = String(formData.get("start") ?? "");
  const end = String(formData.get("end") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const notesRaw = formData.get("notes");
  const notes = notesRaw ? String(notesRaw).trim() || undefined : undefined;

  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/venues/${slug}`)}`);
  }

  const startTime = new Date(start);
  const endTime = new Date(end);
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    return { error: "Invalid time slot." };
  }

  let bookingId: string;
  try {
    const booking = await createBooking({ facilityId, userId: user.id, startTime, endTime, notes });
    bookingId = booking.id;
  } catch (err) {
    if (err instanceof BookingError) return { error: err.message };
    return { error: "Could not complete booking. Please try again." };
  }

  revalidatePath(`/venues/${slug}`);
  redirect(`/account/bookings/${bookingId}`);
}

export async function rescheduleBookingAction(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const user = await getCurrentUser();
  const bookingId = String(formData.get("bookingId") ?? "");
  const start = String(formData.get("start") ?? "");
  const end = String(formData.get("end") ?? "");

  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(`/account/bookings/${bookingId}/reschedule`)}`);

  const newStartTime = new Date(start);
  const newEndTime = new Date(end);
  if (Number.isNaN(newStartTime.getTime()) || Number.isNaN(newEndTime.getTime())) {
    return { error: "Invalid time slot." };
  }

  let newBookingId: string;
  try {
    const newBooking = await rescheduleBooking({ bookingId, userId: user.id, newStartTime, newEndTime });
    newBookingId = newBooking.id;
  } catch (err) {
    if (err instanceof BookingError) return { error: err.message };
    return { error: "Could not reschedule. Please try again." };
  }

  revalidatePath("/account/bookings");
  redirect(`/account/bookings/${newBookingId}`);
}

export async function createClassBookingAction(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const user = await getCurrentUser();
  const classSessionId = String(formData.get("classSessionId") ?? "");
  const attendeesRaw = Number(formData.get("attendees") ?? 1);
  const attendees = Math.max(1, Math.min(20, Number.isFinite(attendeesRaw) ? attendeesRaw : 1));
  const slug = String(formData.get("slug") ?? "");
  const notesRaw = formData.get("notes");
  const notes = notesRaw ? String(notesRaw).trim() || undefined : undefined;

  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/venues/${slug}`)}`);
  }

  let bookingId: string;
  try {
    const booking = await createClassBooking({ classSessionId, userId: user.id, attendees, notes });
    bookingId = booking.id;
  } catch (err) {
    if (err instanceof BookingError) return { error: err.message };
    return { error: "Could not join the class. Please try again." };
  }

  revalidatePath(`/venues/${slug}`);
  redirect(`/account/bookings/${bookingId}`);
}

export async function createDropInAction(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const user = await getCurrentUser();
  const facilityId = String(formData.get("facilityId") ?? "");
  const dateRaw = String(formData.get("date") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const notesRaw = formData.get("notes");
  const notes = notesRaw ? String(notesRaw).trim() || undefined : undefined;

  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/venues/${slug}`)}`);
  }

  // Default to today if no date supplied.
  let date: Date;
  if (dateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    const [y, m, d] = dateRaw.split("-").map(Number);
    date = new Date(y, m - 1, d);
  } else {
    const now = new Date();
    date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  let bookingId: string;
  try {
    const booking = await createDropInPass({ facilityId, userId: user.id, date, notes });
    bookingId = booking.id;
  } catch (err) {
    if (err instanceof BookingError) return { error: err.message };
    return { error: "Could not buy the day pass. Please try again." };
  }

  revalidatePath(`/venues/${slug}`);
  redirect(`/account/bookings/${bookingId}`);
}

export async function cancelBookingAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const bookingId = String(formData.get("bookingId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/account/bookings");

  try {
    await cancelBooking(bookingId, user);
  } catch {
    // Surface errors via query param to keep this a simple form action.
    redirect(`${redirectTo}?error=cancel`);
  }
  revalidatePath(redirectTo);
  redirect(redirectTo);
}
