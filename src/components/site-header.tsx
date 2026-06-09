import Link from "next/link";
import { Logo } from "./logo";
import { Container } from "./ui/container";
import { LinkButton } from "./ui/button";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/session";

function dashboardLink(role: string): { href: string; label: string } | null {
  switch (role) {
    case "PLATFORM_ADMIN":
      return { href: "/admin", label: "Admin" };
    case "CLUB_ADMIN":
      return { href: "/club", label: "Club dashboard" };
    case "PLAYER":
      return { href: "/account/bookings", label: "My bookings" };
    default:
      return null;
  }
}

export function SiteHeader({ user }: { user: SessionUser | null }) {
  const dash = user ? dashboardLink(user.role) : null;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted md:flex">
            <Link href="/clubs" className="hover:text-foreground">
              Find courts
            </Link>
            <Link href="/#how-it-works" className="hover:text-foreground">
              How it works
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {dash && (
                <Link
                  href={dash.href}
                  className="hidden text-sm font-medium text-foreground hover:text-brand-600 sm:inline"
                >
                  {dash.label}
                </Link>
              )}
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium text-muted hover:text-foreground"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-2 text-sm font-medium text-foreground hover:text-brand-600"
              >
                Sign in
              </Link>
              <LinkButton href="/register" size="sm">
                Sign up
              </LinkButton>
            </>
          )}
        </div>
      </Container>
    </header>
  );
}
