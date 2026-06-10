import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "./logo";
import { Container } from "./ui/container";
import { LinkButton } from "./ui/button";
import { LocaleSwitcher } from "./locale-switcher";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/session";

function dashboardLinks(role: string, t: (k: string) => string): { href: string; label: string }[] {
  switch (role) {
    case "PLATFORM_ADMIN":
      return [
        { href: "/admin", label: t("admin") },
        { href: "/account/bookings", label: t("myBookings") },
      ];
    case "CLUB_ADMIN":
      return [
        { href: "/club", label: t("clubDashboard") },
        { href: "/account/bookings", label: t("myBookings") },
      ];
    case "PLAYER":
      return [{ href: "/account/bookings", label: t("myBookings") }];
    default:
      return [];
  }
}

export async function SiteHeader({ user, locale }: { user: SessionUser | null; locale: string }) {
  const t = await getTranslations("nav");
  const links = user ? dashboardLinks(user.role, t) : [];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted md:flex">
            <Link href="/clubs" className="hover:text-foreground">{t("findCourts")}</Link>
            <Link href="/#how-it-works" className="hover:text-foreground">{t("howItWorks")}</Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <LocaleSwitcher current={locale} />
          {user ? (
            <>
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="hidden text-sm font-medium text-foreground hover:text-brand-600 sm:inline"
                >
                  {link.label}
                </Link>
              ))}
              <form action={logoutAction}>
                <button type="submit" className="rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium text-muted hover:text-foreground">
                  {t("signOut")}
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="px-3 py-2 text-sm font-medium text-foreground hover:text-brand-600">
                {t("signIn")}
              </Link>
              <LinkButton href="/register" size="sm">{t("signUp")}</LinkButton>
            </>
          )}
        </div>
      </Container>
    </header>
  );
}
