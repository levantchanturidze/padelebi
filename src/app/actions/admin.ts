"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { CLUB_STATUSES, ROLES } from "@/lib/enums";

export async function setClubStatusAction(formData: FormData) {
  await requireRole(["PLATFORM_ADMIN"], "/admin");
  const clubId = String(formData.get("clubId"));
  const status = z.enum(CLUB_STATUSES).parse(formData.get("status"));

  await prisma.club.update({ where: { id: clubId }, data: { status } });
  revalidatePath("/admin/clubs");
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
