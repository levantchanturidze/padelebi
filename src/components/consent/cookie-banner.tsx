"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { CONSENT_COOKIE, type ConsentPref } from "@/lib/consent";

/**
 * Cookie consent banner. Rendered only when the server-side layout finds
 * no consent cookie set. Client-side state hides the banner immediately on
 * click — the persistent cookie is what stops it from re-appearing on
 * subsequent page loads.
 */
export function CookieBanner() {
  const t = useTranslations("consent");
  const [dismissed, setDismissed] = useState(false);

  function persist(choice: ConsentPref) {
    document.cookie = `${CONSENT_COOKIE}=${choice}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:bottom-5 sm:left-5 sm:right-5 sm:mx-auto sm:max-w-2xl">
      <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-card-lg sm:p-5">
        <button
          type="button"
          onClick={() => persist("necessary")}
          aria-label={t("close")}
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-background hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="pr-8 text-sm font-semibold text-foreground">{t("title")}</p>
        <p className="mt-1 pr-8 text-sm text-muted">
          {t("body")}{" "}
          <Link href="/privacy" className="text-cobalt-600 underline hover:text-cobalt-700">
            {t("learnMore")}
          </Link>
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => persist("accepted")}
            className="inline-flex h-9 items-center rounded-[var(--radius-md)] bg-brand-500 px-4 text-sm font-bold text-foreground shadow-[0_2px_10px_rgba(196,255,61,0.45)] transition-all hover:bg-brand-400"
          >
            {t("acceptAll")}
          </button>
          <button
            type="button"
            onClick={() => persist("necessary")}
            className="inline-flex h-9 items-center rounded-[var(--radius-md)] border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-background"
          >
            {t("necessaryOnly")}
          </button>
        </div>
      </div>
    </div>
  );
}
