"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { userAreaNav } from "@/lib/user-nav";
import type { Role } from "@/lib/enums";

export function SiteNav({ role }: { role: string }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const links = userAreaNav(t, role as Role);

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
                  ? "bg-brand-50 text-foreground"
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
