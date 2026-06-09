import Link from "next/link";
import { Container } from "./ui/container";

export type NavItem = { href: string; label: string };

export function DashboardShell({
  title,
  subtitle,
  nav,
  current,
  children,
}: {
  title: string;
  subtitle?: string;
  nav: NavItem[];
  current: string;
  children: React.ReactNode;
}) {
  return (
    <Container className="py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      <div className="grid gap-8 md:grid-cols-[200px_1fr]">
        <nav className="flex flex-row gap-1 overflow-x-auto md:flex-col">
          {nav.map((item) => {
            const active = current === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "whitespace-nowrap rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-muted hover:bg-background hover:text-foreground",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}
