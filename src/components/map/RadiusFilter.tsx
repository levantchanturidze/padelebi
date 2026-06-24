"use client";

import { useTranslations } from "next-intl";
import { usePosition } from "./use-position";

/**
 * Radius chip filter — only visible once a position is granted. Selecting a
 * chip narrows the venues list/map to that radius; the selection lives in
 * component state (Phase 6 keeps it client-side, no URL params).
 *
 * Phase 7 will move this to a URL param + server-side filter once we have
 * enough venues that client-side filtering hurts.
 */
export function RadiusFilter({
  value,
  onChange,
  className = "",
}: {
  value: number | null;
  onChange: (km: number | null) => void;
  className?: string;
}) {
  const t = useTranslations("geo");
  const { status } = usePosition();
  if (status !== "granted") return null;

  const options: { km: number | null; label: string }[] = [
    { km: null, label: t("anyDistance") },
    { km: 1, label: "1 km" },
    { km: 5, label: "5 km" },
    { km: 10, label: "10 km" },
    { km: 25, label: "25 km" },
  ];

  return (
    <div className={["inline-flex items-center gap-1", className].join(" ")}>
      {options.map((opt) => {
        const active = opt.km === value;
        return (
          <button
            key={opt.label}
            type="button"
            onClick={() => onChange(opt.km)}
            className={[
              "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
              active
                ? "bg-foreground text-white"
                : "bg-surface text-muted border border-border hover:text-foreground",
            ].join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
