"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { userAreaNav } from "@/lib/user-nav";
import type { Role } from "@/lib/enums";

export function MobileMenu({
  role,
  isLoggedIn,
}: {
  role?: string;
  isLoggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations("nav");

  // close on navigation
  useEffect(() => setOpen(false), [pathname]);

  // lock scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const dashLinks = role ? userAreaNav(t, role as Role) : [];

  return (
    <>
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-muted hover:text-foreground md:hidden"
        onClick={() => setOpen((v) => !v)}
        aria-label="მენიუ"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />

          {/* Panel — drops down from header */}
          <div className="absolute left-0 right-0 top-16 bg-surface shadow-lg">
            <nav className="flex flex-col divide-y divide-border">
              {/* Main links */}
              <div className="space-y-1 px-4 py-3">
                <MobileLink href="/venues">{t("findCourts")}</MobileLink>
                <MobileLink href="/sports">{t("sports")}</MobileLink>
                <MobileLink href="/#how-it-works">{t("howItWorks")}</MobileLink>
              </div>

              {/* Role-based links */}
              {dashLinks.length > 0 && (
                <div className="space-y-1 px-4 py-3">
                  {dashLinks.map((l) => (
                    <MobileLink key={l.href} href={l.href}>{l.label}</MobileLink>
                  ))}
                </div>
              )}

              {/* Auth */}
              <div className="px-4 py-3">
                {isLoggedIn ? (
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      className="w-full rounded-[var(--radius-md)] px-3 py-2.5 text-left text-sm font-medium text-muted hover:bg-background hover:text-foreground"
                    >
                      {t("signOut")}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-1">
                    <MobileLink href="/login">{t("signIn")}</MobileLink>
                    <MobileLink href="/register">{t("signUp")}</MobileLink>
                  </div>
                )}
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

function MobileLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={[
        "block rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-brand-50 text-foreground"
          : "text-foreground hover:bg-background hover:text-foreground",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}
