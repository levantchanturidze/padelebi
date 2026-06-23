"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

/**
 * Toggle the current user's favorite state for a venue. Idempotent; returns
 * nothing — the calling form revalidates the visible path.
 */
export async function toggleFavoriteAction(formData: FormData) {
  const user = await getCurrentUser();
  const venueId = String(formData.get("venueId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "");

  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(redirectTo || "/account/favorites")}`);
  }
  if (!venueId) return;

  const existing = await prisma.favorite.findUnique({
    where: { userId_venueId: { userId: user.id, venueId } },
  });
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
  } else {
    await prisma.favorite.create({ data: { userId: user.id, venueId } });
  }
  if (redirectTo) revalidatePath(redirectTo);
}
