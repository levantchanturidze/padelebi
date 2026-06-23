"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { getOwnedVenue } from "@/lib/venue-access";

const MANAGER_ROLES = ["CLUB_ADMIN", "PLATFORM_ADMIN"] as const;

const createSessionSchema = z.object({
  facilityId: z.string().min(1),
  title: z.string().min(1).max(80),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  capacity: z.number().int().min(1).max(500),
  priceGEL: z.number().int().min(0).max(100000),
  instructor: z.string().max(80).optional(),
});

export async function createClassSessionAction(formData: FormData) {
  const user = await requireRole([...MANAGER_ROLES], "/manager");
  const parsed = createSessionSchema.parse({
    facilityId: String(formData.get("facilityId") ?? ""),
    title: String(formData.get("title") ?? ""),
    startTime: String(formData.get("startTime") ?? ""),
    endTime: String(formData.get("endTime") ?? ""),
    capacity: Number(formData.get("capacity") ?? 1),
    priceGEL: Number(formData.get("priceGEL") ?? 0),
    instructor: formData.get("instructor") ? String(formData.get("instructor")) : undefined,
  });

  const facility = await prisma.facility.findUnique({ where: { id: parsed.facilityId } });
  if (!facility || !(await getOwnedVenue(facility.venueId, user))) redirect("/manager");

  const startTime = new Date(parsed.startTime);
  const endTime = new Date(parsed.endTime);
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime()) || endTime <= startTime) {
    redirect(`/manager/${facility.venueId}?error=session&tab=facilities`);
  }

  await prisma.classSession.create({
    data: {
      facilityId: facility.id,
      title: parsed.title,
      startTime,
      endTime,
      capacity: parsed.capacity,
      priceGEL: parsed.priceGEL,
      instructor: parsed.instructor || null,
    },
  });
  revalidatePath(`/manager/${facility.venueId}`);
  redirect(`/manager/${facility.venueId}?saved=1&tab=facilities`);
}

export async function cancelClassSessionAction(formData: FormData) {
  const user = await requireRole([...MANAGER_ROLES], "/manager");
  const id = String(formData.get("sessionId") ?? "");
  const session = await prisma.classSession.findUnique({
    where: { id },
    include: { facility: true },
  });
  if (!session || !(await getOwnedVenue(session.facility.venueId, user))) redirect("/manager");

  // Cancel the session AND all its non-cancelled bookings in one tx.
  await prisma.$transaction([
    prisma.classSession.update({ where: { id }, data: { isCancelled: true } }),
    prisma.booking.updateMany({
      where: { classSessionId: id, status: { not: "CANCELLED" } },
      data: { status: "CANCELLED" },
    }),
  ]);

  revalidatePath(`/manager/${session.facility.venueId}`);
  redirect(`/manager/${session.facility.venueId}?saved=1&tab=facilities`);
}
