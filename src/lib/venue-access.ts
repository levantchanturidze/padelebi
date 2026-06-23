import { prisma } from "./prisma";
import type { SessionUser } from "./session";

/** Returns the venue if the user owns it (or is platform admin), else null. */
export async function getOwnedVenue(venueId: string, user: SessionUser) {
  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!venue) return null;
  if (user.role === "PLATFORM_ADMIN") return venue;
  if (venue.ownerId === user.id) return venue;
  return null;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Generate a venue slug that is unique across the table. */
export async function uniqueVenueSlug(name: string): Promise<string> {
  const base = slugify(name) || "venue";
  let slug = base;
  let n = 1;
  while (await prisma.venue.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}
