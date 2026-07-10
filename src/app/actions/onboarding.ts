"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { uniqueVenueSlug } from "@/lib/venue-access";
import { getAdapter } from "@/lib/sports";

const MANAGER_ROLES = ["CLUB_ADMIN", "PLATFORM_ADMIN"] as const;

/**
 * Wizard-scoped venue creation. Same shape as the /manager venue form but
 * routes to /onboarding/facility on success and uses PENDING status so the
 * admin still reviews the listing.
 */
const wizardVenueSchema = z.object({
  name: z.string().min(2).max(100),
  city: z
    .string()
    .min(2)
    .transform((c) =>
      c.trim().replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()),
    ),
  address: z.string().min(4).max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
});

export async function createOnboardingVenueAction(formData: FormData) {
  const user = await requireRole([...MANAGER_ROLES], "/onboarding");

  const parsed = wizardVenueSchema.parse({
    name: formData.get("name"),
    city: formData.get("city"),
    address: formData.get("address"),
    description: formData.get("description") ?? "",
  });

  await prisma.venue.create({
    data: {
      ...parsed,
      slug: await uniqueVenueSlug(parsed.name),
      status: "PENDING",
      ownerId: user.id,
    },
  });

  redirect("/onboarding/facility");
}

/**
 * Wizard-scoped facility creation. Locks the fields down to name + sport +
 * price + indoor/outdoor — everything else takes the sport adapter's
 * defaults (capacity, booking model, slot length). A default 08:00-22:00
 * weekly schedule is created for TIME_SLOT facilities.
 */
const wizardFacilitySchema = z.object({
  name: z.string().min(1).max(80),
  sportId: z.string().min(1),
  pricePerHourGEL: z.number().int().min(0).max(100000),
  isIndoor: z.boolean(),
});

export async function createOnboardingFacilityAction(formData: FormData) {
  const user = await requireRole([...MANAGER_ROLES], "/onboarding");

  // The wizard only ever binds this to the user's first venue.
  const venue = await prisma.venue.findFirst({
    where: { ownerId: user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!venue) redirect("/onboarding/venue");

  const parsed = wizardFacilitySchema.parse({
    name: formData.get("name"),
    sportId: formData.get("sportId"),
    pricePerHourGEL: Number(formData.get("pricePerHourGEL")),
    isIndoor: formData.get("isIndoor") === "on",
  });

  const sport = await prisma.sport.findUnique({ where: { id: parsed.sportId } });
  const adapter = getAdapter(sport?.slug);

  await prisma.facility.create({
    data: {
      venueId: venue.id,
      sportId: parsed.sportId,
      name: parsed.name,
      bookingModel: adapter.defaults.bookingModel,
      capacity: adapter.defaults.capacity,
      isIndoor: parsed.isIndoor,
      pricePerHourGEL: parsed.pricePerHourGEL,
      attributes: JSON.stringify({}),
      ...(adapter.defaults.bookingModel === "TIME_SLOT"
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

  redirect("/onboarding/photos");
}

/**
 * Marks the current CLUB_ADMIN's onboarding as complete and sends them to
 * the done screen. Called from both the "Finish" and "Skip" buttons on the
 * photos step — either way we want the wizard to stop showing up.
 * Idempotent: repeated calls just overwrite the same timestamp.
 */
export async function finishOnboardingAction() {
  const user = await requireRole([...MANAGER_ROLES], "/onboarding");
  await prisma.user.update({
    where: { id: user.id },
    data: { onboardingCompletedAt: new Date() },
  });
  redirect("/onboarding/done");
}
