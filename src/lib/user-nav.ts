import type { Role } from "./enums";

export type UserNavLink = { href: string; label: string };

/**
 * Top-level navigation for any signed-in user. Returns the role-specific
 * dashboard link (Admin / Manager) FIRST so it sits next to the always-
 * visible account links — never hidden in a dropdown.
 *
 * Used by:
 *  - The account-area DashboardShell on /account/bookings, /favorites, /profile
 *  - The sidebar (site-nav)
 *  - The mobile menu's role section
 */
export function userAreaNav(
  t: (key: "admin" | "clubDashboard" | "myBookings" | "favorites" | "profile") => string,
  role: Role | null | undefined,
): UserNavLink[] {
  const links: UserNavLink[] = [];

  if (role === "PLATFORM_ADMIN") {
    links.push({ href: "/admin", label: t("admin") });
  } else if (role === "CLUB_ADMIN") {
    links.push({ href: "/manager", label: t("clubDashboard") });
  }

  links.push({ href: "/account/bookings", label: t("myBookings") });
  links.push({ href: "/account/favorites", label: t("favorites") });
  links.push({ href: "/account/profile", label: t("profile") });

  return links;
}
