import { redirect } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "./prisma";
import type { Role } from "./enums";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
};

/** Returns the current user or null (no redirect). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role as Role,
  };
}

/** Requires an authenticated user; redirects to /login otherwise. */
export async function requireUser(callbackUrl = "/"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  return user;
}

/**
 * Returns the signed-in user's saved home base coordinates, or null if not
 * signed in / no home saved. Used by venue listing pages to seed the map
 * position before the user grants live geolocation.
 */
export async function getCurrentUserHomeBase(): Promise<{ lat: number; lng: number } | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { homeLat: true, homeLng: true },
  });
  if (row?.homeLat == null || row?.homeLng == null) return null;
  return { lat: row.homeLat, lng: row.homeLng };
}

/** Requires one of the given roles; redirects home if the user lacks it. */
export async function requireRole(
  roles: Role[],
  callbackUrl = "/",
): Promise<SessionUser> {
  const user = await requireUser(callbackUrl);
  if (!roles.includes(user.role)) redirect("/");
  return user;
}
