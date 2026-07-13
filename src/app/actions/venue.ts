"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { getOwnedVenue, uniqueVenueSlug } from "@/lib/venue-access";
import { AMENITIES, SURFACE_CATEGORIES } from "@/lib/enums";
import { timeToMinutes, parseJSON, sanitizePhotoUrls } from "@/lib/utils";
import { getAdapter } from "@/lib/sports";
import { geocodeVenue } from "@/lib/geocode";

const MANAGER_ROLES = ["CLUB_ADMIN", "PLATFORM_ADMIN"] as const;

/* ----------------------------- Venues ----------------------------- */

const venueSchema = z.object({
  name: z.string().min(2),
  description: z.string().max(2000).optional().or(z.literal("")),
  address: z.string().min(2),
  city: z.string().min(2).transform((c) => c.trim().replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())),
  district: z
    .string()
    .max(80)
    .optional()
    .transform((d) => (d ? d.trim() : "") || null),
});

export async function createVenueAction(formData: FormData) {
  const user = await requireRole([...MANAGER_ROLES], "/manager");
  const parsed = venueSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    address: formData.get("address"),
    city: formData.get("city"),
    district: formData.get("district") ?? undefined,
  });
  const amenities = AMENITIES.filter((a) => formData.get(`amenity_${a}`) === "on");
  const coords = await geocodeVenue(parsed);

  const venue = await prisma.venue.create({
    data: {
      ...parsed,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      amenities: JSON.stringify(amenities),
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
    district: formData.get("district") ?? undefined,
  });
  const amenities = AMENITIES.filter((a) => formData.get(`amenity_${a}`) === "on");
  // Re-geocode on save. Only overwrite coordinates when the lookup succeeds so
  // a transient geocoder failure never wipes previously good coordinates.
  const coords = await geocodeVenue(parsed);

  await prisma.venue.update({
    where: { id: venueId },
    data: {
      ...parsed,
      amenities: JSON.stringify(amenities),
      ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
    },
  });
  revalidatePath(`/manager/${venueId}`);
  redirect(`/manager/${venueId}?saved=1&tab=profile`);
}

/* ----------------------------- Photos ----------------------------- */

export async function updateVenuePhotosAction(formData: FormData) {
  const user = await requireRole([...MANAGER_ROLES], "/manager");
  const venueId = String(formData.get("venueId"));
  if (!(await getOwnedVenue(venueId, user))) redirect("/manager");

  const photos = sanitizePhotoUrls(parseJSON<unknown[]>(String(formData.get("photos") ?? "[]"), []));
  await prisma.venue.update({ where: { id: venueId }, data: { photos: JSON.stringify(photos) } });
  revalidatePath(`/manager/${venueId}`);
}

export async function updateFacilityPhotosAction(formData: FormData) {
  const user = await requireRole([...MANAGER_ROLES], "/manager");
  const facilityId = String(formData.get("facilityId"));
  const facility = await prisma.facility.findUnique({ where: { id: facilityId } });
  if (!facility || !(await getOwnedVenue(facility.venueId, user))) redirect("/manager");

  const photos = sanitizePhotoUrls(parseJSON<unknown[]>(String(formData.get("photos") ?? "[]"), []));
  await prisma.facility.update({ where: { id: facilityId }, data: { photos: JSON.stringify(photos) } });
  revalidatePath(`/manager/${facility.venueId}`);
}

/* ----------------------------- Facilities ----------------------------- */

const BOOKING_MODELS = ["TIME_SLOT", "CLASS", "DROP_IN"] as const;

const baseFacilitySchema = z.object({
  name: z.string().min(1),
  sportId: z.string().min(1),
  bookingModel: z.enum(BOOKING_MODELS),
  capacity: z.number().int().min(1).max(10000),
  isIndoor: z.boolean(),
  pricePerHourGEL: z.number().int().min(0).max(100000),
  surfaceCategory: z
    .union([z.enum(SURFACE_CATEGORIES), z.literal("")])
    .optional()
    .transform((v) => (v && v.length ? v : null)),
});

/**
 * Read sport-specific `attr_*` fields out of FormData and let the adapter
 * validate them.
 */
async function parseAttributesFromForm(formData: FormData, sportId: string) {
  const sport = await prisma.sport.findUnique({ where: { id: sportId } });
  const adapter = getAdapter(sport?.slug);

  const raw: Record<string, unknown> = {};
  for (const field of adapter.formFields) {
    const value = formData.get(`attr_${field.name}`);
    if (field.kind === "boolean") {
      raw[field.name] = value === "on";
    } else if (field.kind === "number") {
      const n = Number(value);
      raw[field.name] = Number.isFinite(n) ? n : undefined;
    } else if (value !== null && value !== "") {
      raw[field.name] = String(value);
    }
  }

  return adapter.attributesSchema.parse(raw) as Record<string, unknown>;
}

export async function createFacilityAction(formData: FormData) {
  const user = await requireRole([...MANAGER_ROLES], "/manager");
  const venueId = String(formData.get("venueId"));
  if (!(await getOwnedVenue(venueId, user))) redirect("/manager");

  const sportIdRaw = String(formData.get("sportId") ?? "sport_padel");
  const sport = await prisma.sport.findUnique({ where: { id: sportIdRaw } });
  const adapter = getAdapter(sport?.slug);

  const base = baseFacilitySchema.parse({
    name: formData.get("name"),
    sportId: sportIdRaw,
    bookingModel: String(formData.get("bookingModel") ?? adapter.defaults.bookingModel),
    capacity: Number(formData.get("capacity") ?? adapter.defaults.capacity),
    isIndoor: formData.get("isIndoor") === "on",
    pricePerHourGEL: Number(formData.get("pricePerHourGEL")),
    surfaceCategory: String(formData.get("surfaceCategory") ?? ""),
  });
  const attributes = await parseAttributesFromForm(formData, base.sportId);

  await prisma.facility.create({
    data: {
      venueId,
      sportId: base.sportId,
      name: base.name,
      bookingModel: base.bookingModel,
      capacity: base.capacity,
      isIndoor: base.isIndoor,
      pricePerHourGEL: base.pricePerHourGEL,
      surfaceCategory: base.surfaceCategory,
      attributes: JSON.stringify(attributes),
      // TIME_SLOT facilities get a default open-every-day schedule; CLASS/DROP_IN don't need slot grids.
      ...(base.bookingModel === "TIME_SLOT"
        ? {
            schedules: {
              create: Array.from({ length: 7 }, (_, dayOfWeek) => ({
                dayOfWeek,
                openMinutes: 8 * 60,
                closeMinutes: 22 * 60,
                slotMinutes: adapter.defaults.slotMinutes,
              })),
            },
          }
        : {}),
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

  const sportIdRaw = String(formData.get("sportId") ?? facility.sportId);

  const base = baseFacilitySchema.parse({
    name: formData.get("name"),
    sportId: sportIdRaw,
    bookingModel: String(formData.get("bookingModel") ?? facility.bookingModel),
    capacity: Number(formData.get("capacity") ?? facility.capacity),
    isIndoor: formData.get("isIndoor") === "on",
    pricePerHourGEL: Number(formData.get("pricePerHourGEL")),
    surfaceCategory: String(formData.get("surfaceCategory") ?? ""),
  });
  const attributes = await parseAttributesFromForm(formData, base.sportId);

  await prisma.facility.update({
    where: { id: facilityId },
    data: {
      ...base,
      attributes: JSON.stringify(attributes),
      isActive: formData.get("isActive") === "on",
    },
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
