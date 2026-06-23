import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "./logo";
import { Container } from "./ui/container";
import { LinkButton } from "./ui/button";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileMenu } from "./mobile-menu";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/session";

export async function SiteHeader({ user, locale }: { user: SessionUser | null; locale: string }) {
  const t = await getTranslations("nav");

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-surface/80 backdrop-blur-xl backdrop-saturate-150 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted md:flex">
            <Link
              href="/venues"
              className="transition-colors duration-150 hover:text-foreground"
            >
              {t("findCourts")}
            </Link>
            <Link
              href="/#how-it-works"
              className="transition-colors duration-150 hover:text-foreground"
            >
              {t("howItWorks")}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <LocaleSwitcher current={locale} />
          {user ? (
            <form action={logoutAction} className="hidden md:block">
              <button
                type="submit"
                className="rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium text-muted transition-colors duration-150 hover:text-foreground"
              >
                {t("signOut")}
              </button>
            </form>
          ) : (
            <div className="hidden items-center gap-1 md:flex">
              <Link
                href="/login"
                className="rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium text-muted transition-colors duration-150 hover:text-foreground"
              >
                {t("signIn")}
              </Link>
              <LinkButton href="/register" size="sm">{t("signUp")}</LinkButton>
            </div>
          )}
          <MobileMenu role={user?.role} isLoggedIn={!!user} />
        </div>
      </Container>
    </header>
  );
}
