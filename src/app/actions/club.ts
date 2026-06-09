"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { getOwnedClub, uniqueClubSlug } from "@/lib/club-access";
import { SURFACES, AMENITIES } from "@/lib/enums";
import { timeToMinutes } from "@/lib/utils";

const CLUB_ROLES = ["CLUB_ADMIN", "PLATFORM_ADMIN"] as const;

/* ----------------------------- Clubs ----------------------------- */

const clubSchema = z.object({
  name: z.string().min(2),
  description: z.string().max(2000).optional().or(z.literal("")),
  address: z.string().min(2),
  city: z.string().min(2),
});

export async function createClubAction(formData: FormData) {
  const user = await requireRole([...CLUB_ROLES], "/club");
  const parsed = clubSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    address: formData.get("address"),
    city: formData.get("city"),
  });

  const club = await prisma.club.create({
    data: {
      ...parsed,
      slug: await uniqueClubSlug(parsed.name),
      status: "PENDING", // platform admin must approve
      ownerId: user.id,
    },
  });
  revalidatePath("/club");
  redirect(`/club/${club.id}`);
}

export async function updateClubAction(formData: FormData) {
  const user = await requireRole([...CLUB_ROLES], "/club");
  const clubId = String(formData.get("clubId"));
  if (!(await getOwnedClub(clubId, user))) redirect("/club");

  const parsed = clubSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    address: formData.get("address"),
    city: formData.get("city"),
  });
  const amenities = AMENITIES.filter((a) => formData.get(`amenity_${a}`) === "on");

  await prisma.club.update({
    where: { id: clubId },
    data: { ...parsed, amenities: JSON.stringify(amenities) },
  });
  revalidatePath(`/club/${clubId}`);
  redirect(`/club/${clubId}?saved=1`);
}

/* ----------------------------- Courts ----------------------------- */

const courtSchema = z.object({
  name: z.string().min(1),
  surface: z.enum(SURFACES),
  isIndoor: z.boolean(),
  pricePerHourGEL: z.number().int().min(0).max(100000),
});

export async function createCourtAction(formData: FormData) {
  const user = await requireRole([...CLUB_ROLES], "/club");
  const clubId = String(formData.get("clubId"));
  if (!(await getOwnedClub(clubId, user))) redirect("/club");

  const data = courtSchema.parse({
    name: formData.get("name"),
    surface: formData.get("surface"),
    isIndoor: formData.get("isIndoor") === "on",
    pricePerHourGEL: Number(formData.get("pricePerHourGEL")),
  });

  // New court defaults to open every day 08:00–22:00, 90-min slots.
  await prisma.court.create({
    data: {
      clubId,
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
  revalidatePath(`/club/${clubId}`);
  redirect(`/club/${clubId}?saved=1`);
}

export async function updateCourtAction(formData: FormData) {
  const user = await requireRole([...CLUB_ROLES], "/club");
  const courtId = String(formData.get("courtId"));
  const court = await prisma.court.findUnique({ where: { id: courtId } });
  if (!court || !(await getOwnedClub(court.clubId, user))) redirect("/club");

  const data = courtSchema.parse({
    name: formData.get("name"),
    surface: formData.get("surface"),
    isIndoor: formData.get("isIndoor") === "on",
    pricePerHourGEL: Number(formData.get("pricePerHourGEL")),
  });
  await prisma.court.update({
    where: { id: courtId },
    data: { ...data, isActive: formData.get("isActive") === "on" },
  });
  revalidatePath(`/club/${court.clubId}`);
  redirect(`/club/${court.clubId}?saved=1`);
}

export async function deleteCourtAction(formData: FormData) {
  const user = await requireRole([...CLUB_ROLES], "/club");
  const courtId = String(formData.get("courtId"));
  const court = await prisma.court.findUnique({ where: { id: courtId } });
  if (!court || !(await getOwnedClub(court.clubId, user))) redirect("/club");

  await prisma.court.delete({ where: { id: courtId } });
  revalidatePath(`/club/${court.clubId}`);
  redirect(`/club/${court.clubId}?saved=1`);
}

/* --------------------------- Schedules --------------------------- */

export async function updateScheduleAction(formData: FormData) {
  const user = await requireRole([...CLUB_ROLES], "/club");
  const courtId = String(formData.get("courtId"));
  const court = await prisma.court.findUnique({ where: { id: courtId } });
  if (!court || !(await getOwnedClub(court.clubId, user))) redirect("/club");

  const openMinutes = timeToMinutes(String(formData.get("open") ?? "08:00"));
  const closeMinutes = timeToMinutes(String(formData.get("close") ?? "22:00"));
  const slotMinutes = Number(formData.get("slotMinutes") ?? 90);
  const openDays = Array.from({ length: 7 }, (_, d) => formData.get(`day_${d}`) === "on");

  if (closeMinutes <= openMinutes) redirect(`/club/${court.clubId}?error=schedule`);

  await prisma.$transaction([
    prisma.courtSchedule.deleteMany({ where: { courtId } }),
    prisma.courtSchedule.createMany({
      data: openDays
        .map((open, dayOfWeek) =>
          open ? { courtId, dayOfWeek, openMinutes, closeMinutes, slotMinutes } : null,
        )
        .filter((x): x is NonNullable<typeof x> => x !== null),
    }),
  ]);
  revalidatePath(`/club/${court.clubId}`);
  redirect(`/club/${court.clubId}?saved=1`);
}

/* --------------------------- Blackouts --------------------------- */

export async function createBlackoutAction(formData: FormData) {
  const user = await requireRole([...CLUB_ROLES], "/club");
  const courtId = String(formData.get("courtId"));
  const court = await prisma.court.findUnique({ where: { id: courtId } });
  if (!court || !(await getOwnedClub(court.clubId, user))) redirect("/club");

  const start = new Date(String(formData.get("start")));
  const end = new Date(String(formData.get("end")));
  const reason = String(formData.get("reason") ?? "");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    redirect(`/club/${court.clubId}?error=blackout`);
  }

  await prisma.blackout.create({
    data: { courtId, startTime: start, endTime: end, reason: reason || null },
  });
  revalidatePath(`/club/${court.clubId}`);
  redirect(`/club/${court.clubId}?saved=1`);
}

export async function deleteBlackoutAction(formData: FormData) {
  const user = await requireRole([...CLUB_ROLES], "/club");
  const id = String(formData.get("blackoutId"));
  const blackout = await prisma.blackout.findUnique({
    where: { id },
    include: { court: true },
  });
  if (!blackout || !(await getOwnedClub(blackout.court.clubId, user))) redirect("/club");

  await prisma.blackout.delete({ where: { id } });
  revalidatePath(`/club/${blackout.court.clubId}`);
  redirect(`/club/${blackout.court.clubId}?saved=1`);
}
