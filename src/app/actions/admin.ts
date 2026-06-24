"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { VENUE_STATUSES, ROLES } from "@/lib/enums";

export async function setVenueStatusAction(formData: FormData) {
  await requireRole(["PLATFORM_ADMIN"], "/admin");
  const venueId = String(formData.get("venueId"));
  const status = z.enum(VENUE_STATUSES).parse(formData.get("status"));

  await prisma.venue.update({ where: { id: venueId }, data: { status } });
  revalidatePath("/admin/venues");
  revalidatePath("/admin");
}

export async function setUserRoleAction(formData: FormData) {
  const admin = await requireRole(["PLATFORM_ADMIN"], "/admin");
  const userId = String(formData.get("userId"));
  const role = z.enum(ROLES).parse(formData.get("role"));

  // Prevent admins from demoting themselves (avoid lockout).
  if (userId === admin.id) return;

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/users");
}

export async function setUserActiveAction(formData: FormData) {
  const admin = await requireRole(["PLATFORM_ADMIN"], "/admin");
  const userId = String(formData.get("userId"));
  const isActive = formData.get("isActive") === "true";

  if (userId === admin.id) return;

  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  revalidatePath("/admin/users");
}

/* ----------------------------- Sports catalog ----------------------------- */

const SPORT_CATEGORIES = ["RACQUET", "TEAM", "FITNESS", "WATER", "INDIVIDUAL"] as const;

const sportSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z][a-z0-9-]*$/, "Use lowercase letters, numbers and dashes only"),
  name: z.string().min(2).max(60),
  category: z.enum(SPORT_CATEGORIES),
  icon: z.string().min(2).max(40).default("Activity"),
  sortOrder: z.number().int().min(0).max(10000).default(500),
});

export async function createSportAction(formData: FormData) {
  await requireRole(["PLATFORM_ADMIN"], "/admin/sports");

  const parsed = sportSchema.parse({
    slug: String(formData.get("slug") ?? "").trim().toLowerCase(),
    name: String(formData.get("name") ?? "").trim(),
    category: String(formData.get("category") ?? "INDIVIDUAL"),
    icon: String(formData.get("icon") ?? "Activity").trim(),
    sortOrder: Number(formData.get("sortOrder") ?? 500),
  });

  const existing = await prisma.sport.findUnique({ where: { slug: parsed.slug } });
  if (existing) {
    // Slug collision — treat as edit: re-activate + update name/category/icon/order.
    await prisma.sport.update({
      where: { id: existing.id },
      data: { ...parsed, isActive: true },
    });
  } else {
    await prisma.sport.create({ data: { ...parsed, isActive: true } });
  }

  revalidatePath("/admin/sports");
  revalidatePath("/sports");
  revalidatePath("/venues");
}

export async function updateSportAction(formData: FormData) {
  await requireRole(["PLATFORM_ADMIN"], "/admin/sports");
  const id = String(formData.get("sportId") ?? "");

  const parsed = sportSchema.parse({
    slug: String(formData.get("slug") ?? "").trim().toLowerCase(),
    name: String(formData.get("name") ?? "").trim(),
    category: String(formData.get("category") ?? "INDIVIDUAL"),
    icon: String(formData.get("icon") ?? "Activity").trim(),
    sortOrder: Number(formData.get("sortOrder") ?? 500),
  });

  await prisma.sport.update({ where: { id }, data: parsed });
  revalidatePath("/admin/sports");
  revalidatePath("/sports");
  revalidatePath("/venues");
}

export async function toggleSportActiveAction(formData: FormData) {
  await requireRole(["PLATFORM_ADMIN"], "/admin/sports");
  const id = String(formData.get("sportId") ?? "");
  const isActive = formData.get("isActive") === "true";

  await prisma.sport.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/sports");
  revalidatePath("/sports");
  revalidatePath("/venues");
}
