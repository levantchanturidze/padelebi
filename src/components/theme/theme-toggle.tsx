"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTranslations } from "next-intl";
import { THEME_COOKIE, isThemePref, type ThemePref } from "@/lib/theme";

const ORDER: ThemePref[] = ["light", "dark", "system"];

/**
 * Sun / Moon / Monitor cycle button.
 *
 *   light → dark → system → light → …
 *
 * On change:
 *  1. Persist preference in the `playtora.theme` cookie (1-year max-age).
 *  2. Resolve the effective theme (dark if dark, or system + OS dark) and
 *     toggle the `dark` class on <html> immediately — no reload needed.
 *
 * Reads the current cookie on mount so the icon reflects state without
 * requiring a server-prop drill.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const t = useTranslations("theme");
  const [pref, setPref] = useState<ThemePref>("system");

  useEffect(() => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]*)`));
    const raw = match ? decodeURIComponent(match[1]) : "system";
    if (isThemePref(raw)) setPref(raw);
  }, []);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
    setPref(next);

    // Persist for 1 year.
    document.cookie = `${THEME_COOKIE}=${next}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;

    // Apply immediately.
    const dark =
      next === "dark" ||
      (next === "system" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }

  const Icon = pref === "dark" ? Moon : pref === "system" ? Monitor : Sun;
  const label = t(pref);

  return (
    <button
      type="button"
      onClick={cycle}
      title={label}
      aria-label={label}
      className={[
        "inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-muted transition-colors hover:bg-background hover:text-foreground",
        className,
      ].join(" ")}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
