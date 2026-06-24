import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "muted" | "info";

/**
 * Tones — Playtora palette.
 *  - brand: Volt fill, Obsidian text — for marketing emphasis and "from price" pills.
 *  - success: Field green — semantic ("confirmed booking", "approved").
 *  - info: Cobalt — for B2B / manager signals.
 *  - warning / danger: semantic.
 */
const tones: Record<Tone, string> = {
  neutral: "bg-background text-foreground border border-border",
  brand:   "bg-brand-500 text-foreground border border-brand-600/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]",
  success: "bg-emerald-50 text-success border border-emerald-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
  warning: "bg-amber-50 text-warning border border-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
  danger:  "bg-red-50 text-danger border border-red-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
  info:    "bg-cobalt-50 text-cobalt-700 border border-cobalt-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
  muted:   "bg-background text-muted border border-border",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
