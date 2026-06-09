import { prisma } from "./prisma";
import type { SessionUser } from "./session";

/** Returns the club if the user owns it (or is platform admin), else null. */
export async function getOwnedClub(clubId: string, user: SessionUser) {
  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) return null;
  if (user.role === "PLATFORM_ADMIN") return club;
  if (club.ownerId === user.id) return club;
  return null;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Generate a club slug that is unique across the table. */
export async function uniqueClubSlug(name: string): Promise<string> {
  const base = slugify(name) || "club";
  let slug = base;
  let n = 1;
  while (await prisma.club.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}
