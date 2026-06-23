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
