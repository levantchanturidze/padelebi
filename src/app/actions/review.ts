"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const reviewSchema = z.object({
  venueId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

/**
 * Submit (or update) a review for a venue. One review per user per venue —
 * resubmitting updates the existing row.
 *
 * The current implementation accepts a review from any authenticated user.
 * In Phase 4 we'll gate this to users who have at least one confirmed booking
 * at the venue.
 */
export async function submitReviewAction(formData: FormData) {
  const user = await getCurrentUser();
  const venueIdRaw = String(formData.get("venueId") ?? "");
  const slug = String(formData.get("slug") ?? "");

  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/venues/${slug}`)}`);
  }

  const parsed = reviewSchema.parse({
    venueId: venueIdRaw,
    rating: Number(formData.get("rating") ?? 0),
    comment: formData.get("comment") ? String(formData.get("comment")) : undefined,
  });

  await prisma.review.upsert({
    where: { venueId_userId: { venueId: parsed.venueId, userId: user.id } },
    update: { rating: parsed.rating, comment: parsed.comment ?? "" },
    create: {
      venueId: parsed.venueId,
      userId: user.id,
      rating: parsed.rating,
      comment: parsed.comment ?? "",
    },
  });

  if (slug) revalidatePath(`/venues/${slug}`);
}
