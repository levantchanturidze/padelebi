"use client";

import { useTranslations } from "next-intl";
import { Loader2, MapPin, MapPinOff, Navigation } from "lucide-react";
import { usePosition } from "./use-position";

/**
 * One-button state machine for "use my location":
 *   idle    → trigger geolocation
 *   loading → spinner
 *   granted → pin filled, click clears
 *   denied  → tooltip + retry
 */
export function NearMeButton({ className = "" }: { className?: string }) {
  const t = useTranslations("geo");
  const { status, error, request, clear } = usePosition();

  if (status === "loading") {
    return (
      <button
        type="button"
        disabled
        className={["inline-flex h-9 items-center gap-2 rounded-full border border-border bg-surface px-3.5 text-sm font-semibold text-muted", className].join(" ")}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {t("finding")}
      </button>
    );
  }

  if (status === "granted") {
    return (
      <button
        type="button"
        onClick={clear}
        className={["inline-flex h-9 items-center gap-2 rounded-full border border-brand-500 bg-brand-50 px-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-brand-100", className].join(" ")}
        aria-label={t("clearLocation")}
      >
        <MapPin className="h-3.5 w-3.5 text-brand-700" />
        {t("nearMe")}
      </button>
    );
  }

  if (status === "denied") {
    return (
      <button
        type="button"
        onClick={request}
        title={error === "denied" ? t("permissionDenied") : t("unavailable")}
        className={["inline-flex h-9 items-center gap-2 rounded-full border border-border bg-surface px-3.5 text-sm font-semibold text-muted transition-colors hover:text-foreground", className].join(" ")}
      >
        <MapPinOff className="h-3.5 w-3.5" />
        {t("retry")}
      </button>
    );
  }

  // idle
  return (
    <button
      type="button"
      onClick={request}
      className={["inline-flex h-9 items-center gap-2 rounded-full border border-cobalt-200 bg-cobalt-50 px-3.5 text-sm font-semibold text-cobalt-700 transition-colors hover:bg-cobalt-100", className].join(" ")}
    >
      <Navigation className="h-3.5 w-3.5" />
      {t("useMyLocation")}
    </button>
  );
}
