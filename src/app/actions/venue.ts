"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { getOwnedVenue, uniqueVenueSlug } from "@/lib/venue-access";
import { SURFACES, AMENITIES } from "@/lib/enums";
import { timeToMinutes } from "@/lib/utils";

const MANAGER_ROLES = ["CLUB_ADMIN", "PLATFORM_ADMIN"] as const;

/* ----------------------------- Venues ----------------------------- */

const venueSchema = z.object({
  name: z.string().min(2),
  description: z.string().max(2000).optional().or(z.literal("")),
  address: z.string().min(2),
  city: z.string().min(2).transform((c) => c.trim().replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())),
});

export async function createVenueAction(formData: FormData) {
  const user = await requireRole([...MANAGER_ROLES], "/manager");
  const parsed = venueSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    address: formData.get("address"),
    city: formData.get("city"),
  });

  const venue = await prisma.venue.create({
    data: {
      ...parsed,
      slug: await uniqueVenueSlug(parsed.name),
      status: "PENDING", // platform admin must approve
      ownerId: user.id,
    },
  });
  revalidatePath("/manager");
  redirect(`/manager/${venue.id}?tab=profile`);
}

export async function updateVenueAction(formData: FormData) {
  const user = await requireRole([...MANAGER_ROLES], "/manager");
  const venueId = String(formData.get("venueId"));
  if (!(await getOwnedVenue(venueId, user))) redirect("/manager");

  const parsed = venueSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    address: formData.get("address"),
    city: formData.get("city"),
  });
  const amenities = AMENITIES.filter((a) => formData.get(`amenity_${a}`) === "on");

  await prisma.venue.update({
    where: { id: venueId },
    data: { ...parsed, amenities: JSON.stringify(amenities) },
  });
  revalidatePath(`/manager/${venueId}`);
  redirect(`/manager/${venueId}?saved=1&tab=profile`);
}

/* ----------------------------- Photos ----------------------------- */

export async function updateVenuePhotosAction(formData: FormData) {
  const user = await requireRole([...MANAGER_ROLES], "/manager");
  const venueId = String(formData.get("venueId"));
  if (!(await getOwnedVenue(venueId, user))) redirect("/manager");

  const photos = JSON.parse(String(formData.get("photos") ?? "[]")) as string[];
  await prisma.venue.update({ where: { id: venueId }, data: { photos: JSON.stringify(photos) } });
  revalidatePath(`/manager/${venueId}`);
}

export async function updateFacilityPhotosAction(formData: FormData) {
  const user = await requireRole([...MANAGER_ROLES], "/manager");
  const facilityId = String(formData.get("facilityId"));
  const facility = await prisma.facility.findUnique({ where: { id: facilityId } });
  if (!facility || !(await getOwnedVenue(facility.venueId, user))) redirect("/manager");

  const photos = JSON.parse(String(formData.get("photos") ?? "[]")) as string[];
  await prisma.facility.update({ where: { id: facilityId }, data: { photos: JSON.stringify(photos) } });
  revalidatePath(`/manager/${facility.venueId}`);
}

/* ----------------------------- Facilities ----------------------------- */

const facilitySchema = z.object({
  name: z.string().min(1),
  sportId: z.string().min(1),
  surface: z.enum(SURFACES),
  isIndoor: z.boolean(),
  pricePerHourGEL: z.number().int().min(0).max(100000),
});

export async function createFacilityAction(formData: FormData) {
  const user = await requireRole([...MANAGER_ROLES], "/manager");
  const venueId = String(formData.get("venueId"));
  if (!(await getOwnedVenue(venueId, user))) redirect("/manager");

  const data = facilitySchema.parse({
    name: formData.get("name"),
    sportId: formData.get("sportId") ?? "sport_padel",
    surface: formData.get("surface"),
    isIndoor: formData.get("isIndoor") === "on",
    pricePerHourGEL: Number(formData.get("pricePerHourGEL")),
  });

  // New facility defaults to open every day 08:00–22:00, 90-min slots.
  await prisma.facility.create({
    data: {
      venueId,
      ...data,
      schedules: {
        create: Array.from({ length: 7 }, (_, dayOfWeek) => ({
          dayOfWeek,
          openMinutes: 8 * 60,
          closeMinutes: 22 * 60,
          slotMinutes: 90,
        })),
      },
    },
  });
  revalidatePath(`/manager/${venueId}`);
  redirect(`/manager/${venueId}?saved=1&tab=facilities`);
}

export async function updateFacilityAction(formData: FormData) {
  const user = await requireRole([...MANAGER_ROLES], "/manager");
  const facilityId = String(formData.get("facilityId"));
  const facility = await prisma.facility.findUnique({ where: { id: facilityId } });
  if (!facility || !(await getOwnedVenue(facility.venueId, user))) redirect("/manager");

  const data = facilitySchema.parse({
    name: formData.get("name"),
    sportId: formData.get("sportId") ?? facility.sportId,
    surface: formData.get("surface"),
    isIndoor: formData.get("isIndoor") === "on",
    pricePerHourGEL: Number(formData.get("pricePerHourGEL")),
  });
  await prisma.facility.update({
    where: { id: facilityId },
    data: { ...data, isActive: formData.get("isActive") === "on" },
  });
  revalidatePath(`/manager/${facility.venueId}`);
  redirect(`/manager/${facility.venueId}?saved=1&tab=facilities`);
}

export async function deleteFacilityAction(formData: FormData) {
  const user = await requireRole([...MANAGER_ROLES], "/manager");
  const facilityId = String(formData.get("facilityId"));
  const facility = await prisma.facility.findUnique({ where: { id: facilityId } });
  if (!facility || !(await getOwnedVenue(facility.venueId, user))) redirect("/manager");

  await prisma.facility.delete({ where: { id: facilityId } });
  revalidatePath(`/manager/${facility.venueId}`);
  redirect(`/manager/${facility.venueId}?saved=1&tab=facilities`);
}

/* --------------------------- Schedules --------------------------- */

export async function updateScheduleAction(formData: FormData) {
  const user = await requireRole([...MANAGER_ROLES], "/manager");
  const facilityId = String(formData.get("facilityId"));
  const facility = await prisma.facility.findUnique({ where: { id: facilityId } });
  if (!facility || !(await getOwnedVenue(facility.venueId, user))) redirect("/manager");

  const openMinutes = timeToMinutes(String(formData.get("open") ?? "08:00"));
  const closeMinutes = timeToMinutes(String(formData.get("close") ?? "22:00"));
  const slotMinutes = Number(formData.get("slotMinutes") ?? 90);
  const openDays = Array.from({ length: 7 }, (_, d) => formData.get(`day_${d}`) === "on");

  if (closeMinutes <= openMinutes) redirect(`/manager/${facility.venueId}?error=schedule&tab=facilities`);

  await prisma.$transaction([
    prisma.facilitySchedule.deleteMany({ where: { facilityId } }),
    prisma.facilitySchedule.createMany({
      data: openDays
        .map((open, dayOfWeek) =>
          open ? { facilityId, dayOfWeek, openMinutes, closeMinutes, slotMinutes } : null,
        )
        .filter((x): x is NonNullable<typeof x> => x !== null),
    }),
  ]);
  revalidatePath(`/manager/${facility.venueId}`);
  redirect(`/manager/${facility.venueId}?saved=1&tab=facilities`);
}

/* --------------------------- Blackouts --------------------------- */

export async function createBlackoutAction(formData: FormData) {
  const user = await requireRole([...MANAGER_ROLES], "/manager");
  const facilityId = String(formData.get("facilityId"));
  const facility = await prisma.facility.findUnique({ where: { id: facilityId } });
  if (!facility || !(await getOwnedVenue(facility.venueId, user))) redirect("/manager");

  const start = new Date(String(formData.get("start")));
  const end = new Date(String(formData.get("end")));
  const reason = String(formData.get("reason") ?? "");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    redirect(`/manager/${facility.venueId}?error=blackout&tab=facilities`);
  }

  await prisma.blackout.create({
    data: { facilityId, startTime: start, endTime: end, reason: reason || null },
  });
  revalidatePath(`/manager/${facility.venueId}`);
  redirect(`/manager/${facility.venueId}?saved=1&tab=facilities`);
}

export async function deleteBlackoutAction(formData: FormData) {
  const user = await requireRole([...MANAGER_ROLES], "/manager");
  const id = String(formData.get("blackoutId"));
  const blackout = await prisma.blackout.findUnique({
    where: { id },
    include: { facility: true },
  });
  if (!blackout || !(await getOwnedVenue(blackout.facility.venueId, user))) redirect("/manager");

  await prisma.blackout.delete({ where: { id } });
  revalidatePath(`/manager/${blackout.facility.venueId}`);
  redirect(`/manager/${blackout.facility.venueId}?saved=1&tab=facilities`);
}
