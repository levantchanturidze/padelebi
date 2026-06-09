import Link from "next/link";
import { Logo } from "./logo";
import { Container } from "./ui/container";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <Container className="flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Logo />
          <p className="text-sm text-muted">
            Book padel courts across Georgia.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <Link href="/clubs" className="hover:text-foreground">
            Find courts
          </Link>
          <Link href="/register" className="hover:text-foreground">
            List your club
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Sign in
          </Link>
        </nav>
        <p className="text-xs text-muted">
          © {new Date().getFullYear()} Padelebi
        </p>
      </Container>
    </footer>
  );
}
