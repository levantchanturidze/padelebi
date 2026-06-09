"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { SKILL_LEVELS } from "@/lib/enums";

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().max(40).optional().or(z.literal("")),
  skillLevel: z.enum(SKILL_LEVELS).optional().or(z.literal("")),
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
  });
  if (!parsed.success) return { error: "Please check your details." };

  const { name, phone, skillLevel } = parsed.data;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      phone: phone || null,
      skillLevel: skillLevel || null,
    },
  });
  revalidatePath("/account/profile");
  return { success: "Profile updated." };
}
