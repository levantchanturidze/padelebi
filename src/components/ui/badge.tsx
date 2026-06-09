import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "muted";

const tones: Record<Tone, string> = {
  neutral: "bg-background text-foreground border border-border",
  brand: "bg-brand-50 text-brand-700 border border-brand-200",
  success: "bg-brand-50 text-success border border-brand-200",
  warning: "bg-amber-50 text-warning border border-amber-200",
  danger: "bg-red-50 text-danger border border-red-200",
  muted: "bg-background text-muted border border-border",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
