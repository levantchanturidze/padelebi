import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

/**
 * Button variants — Playtora palette.
 *
 *  - primary: Volt fill with Obsidian text — the brand action color.
 *  - secondary: Obsidian fill, white text — for high-emphasis non-CTA buttons.
 *  - outline: Bone border, Cobalt hover — for "view / details / cancel" etc.
 *  - ghost: text-only with Cobalt hover.
 *  - danger: red fill for destructive actions.
 */
const variants: Record<Variant, string> = {
  primary: [
    "bg-brand-500 text-foreground",
    "shadow-[0_1px_3px_rgba(11,14,20,0.10),inset_0_1px_0_rgba(255,255,255,0.4)]",
    "hover:bg-brand-400",
    "hover:shadow-[0_4px_18px_-3px_rgba(196,255,61,0.55),inset_0_1px_0_rgba(255,255,255,0.5)]",
    "active:bg-brand-600 active:scale-[0.98]",
    "transition-all duration-150",
  ].join(" "),
  secondary: [
    "bg-foreground text-white",
    "shadow-[0_1px_3px_rgba(11,14,20,0.20)]",
    "hover:opacity-90 hover:shadow-[0_4px_14px_rgba(11,14,20,0.25)]",
    "active:scale-[0.98]",
    "transition-all duration-150",
  ].join(" "),
  outline: [
    "border border-border bg-surface text-foreground",
    "hover:bg-cobalt-50 hover:border-cobalt-200 hover:text-cobalt-700",
    "active:scale-[0.98]",
    "transition-all duration-150",
  ].join(" "),
  ghost: [
    "text-foreground",
    "hover:bg-background hover:text-cobalt-700",
    "active:scale-[0.98]",
    "transition-all duration-150",
  ].join(" "),
  danger: [
    "bg-danger text-white",
    "shadow-[0_1px_3px_rgba(11,14,20,0.15)]",
    "hover:opacity-90 hover:shadow-[0_4px_12px_rgba(220,38,38,0.35)]",
    "active:scale-[0.98]",
    "transition-all duration-150",
  ].join(" "),
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base font-semibold",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-semibold focus-ring disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

type LinkButtonProps = React.ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
};

export function LinkButton({
  className,
  variant = "primary",
  size = "md",
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
