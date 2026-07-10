"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { SKILL_LEVELS } from "@/lib/enums";

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().max(40).optional().or(z.literal("")),
  skillLevel: z.enum(SKILL_LEVELS).optional().or(z.literal("")),
  homeAddress: z.string().max(200).optional().or(z.literal("")),
  homeLat: z.string().optional().or(z.literal("")),
  homeLng: z.string().optional().or(z.literal("")),
});

export type ProfileState = { error?: string; success?: string } | undefined;

export async function updateProfileAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await requireUser("/account/profile");
  const parsed = schema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") ?? "",
    skillLevel: formData.get("skillLevel") ?? "",
    homeAddress: formData.get("homeAddress") ?? "",
    homeLat: formData.get("homeLat") ?? "",
    homeLng: formData.get("homeLng") ?? "",
  });
  if (!parsed.success) return { error: "Please check your details." };

  const { name, phone, skillLevel, homeAddress, homeLat, homeLng } = parsed.data;

  // Coordinates only stick if both parse as finite numbers within valid ranges.
  const lat = homeLat ? Number(homeLat) : NaN;
  const lng = homeLng ? Number(homeLng) : NaN;
  const coordsValid =
    Number.isFinite(lat) && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      phone: phone || null,
      skillLevel: skillLevel || null,
      homeAddress: homeAddress?.trim() || null,
      homeLat: coordsValid ? lat : null,
      homeLng: coordsValid ? lng : null,
    },
  });
  revalidatePath("/account/profile");
  return { success: "Profile updated." };
}

const passwordSchema = z.object({
  current: z.string().min(1),
  next: z.string().min(8),
  confirm: z.string().min(8),
});

export async function changePasswordAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await requireUser("/account/profile");
  const parsed = passwordSchema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: "Please fill in all fields (min 8 chars for new password)." };

  const { current, next, confirm } = parsed.data;
  if (next !== confirm) return { error: "New passwords do not match." };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "User not found." };

  const valid = await bcrypt.compare(current, dbUser.passwordHash);
  if (!valid) return { error: "Current password is incorrect." };

  const passwordHash = await bcrypt.hash(next, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  return { success: "Password changed successfully." };
}
