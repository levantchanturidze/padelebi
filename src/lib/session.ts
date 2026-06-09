import { redirect } from "next/navigation";
import { auth } from "./auth";
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

/** Requires one of the given roles; redirects home if the user lacks it. */
export async function requireRole(
  roles: Role[],
  callbackUrl = "/",
): Promise<SessionUser> {
  const user = await requireUser(callbackUrl);
  if (!roles.includes(user.role)) redirect("/");
  return user;
}
