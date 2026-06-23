import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "./logo";
import { Container } from "./ui/container";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <Container className="py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <Logo />
            <p className="text-sm text-muted">{t("tagline")}</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            <Link href="/venues" className="transition-colors duration-150 hover:text-foreground">
              {t("findCourts")}
            </Link>
            <Link href="/register" className="transition-colors duration-150 hover:text-foreground">
              {t("listYourClub")}
            </Link>
            <Link href="/login" className="transition-colors duration-150 hover:text-foreground">
              {t("signIn")}
            </Link>
          </nav>
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-border pt-5 text-xs text-muted/70">
          <p>© {new Date().getFullYear()} Padelebi. All rights reserved.</p>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            <span>Georgia</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
