"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

function linksForRole(role: string, t: ReturnType<typeof useTranslations<"nav">>) {
  switch (role) {
    case "PLATFORM_ADMIN":
      return [
        { href: "/admin", label: t("admin") },
        { href: "/account/bookings", label: t("myBookings") },
        { href: "/account/favorites", label: t("favorites") },
      ];
    case "CLUB_ADMIN":
      return [
        { href: "/manager", label: t("clubDashboard") },
        { href: "/account/bookings", label: t("myBookings") },
        { href: "/account/favorites", label: t("favorites") },
      ];
    default:
      return [
        { href: "/account/bookings", label: t("myBookings") },
        { href: "/account/favorites", label: t("favorites") },
      ];
  }
}

export function SiteNav({ role }: { role: string }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const links = linksForRole(role, t);

  return (
    <aside className="hidden w-48 shrink-0 border-r border-border bg-surface md:block">
      <nav className="sticky top-16 flex flex-col gap-1 p-4 pt-6">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={[
                "rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-muted hover:bg-background hover:text-foreground",
              ].join(" ")}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
