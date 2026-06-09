import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "./logo";
import { Container } from "./ui/container";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <Container className="flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Logo />
          <p className="text-sm text-muted">{t("tagline")}</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <Link href="/clubs" className="hover:text-foreground">{t("findCourts")}</Link>
          <Link href="/register" className="hover:text-foreground">{t("listYourClub")}</Link>
          <Link href="/login" className="hover:text-foreground">{t("signIn")}</Link>
        </nav>
        <p className="text-xs text-muted">© {new Date().getFullYear()} Padelebi</p>
      </Container>
    </footer>
  );
}
