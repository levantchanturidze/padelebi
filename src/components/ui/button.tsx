import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: [
    "bg-gradient-to-b from-brand-500 to-brand-600 text-white",
    "shadow-[0_1px_3px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]",
    "hover:from-brand-400 hover:to-brand-500",
    "hover:shadow-[0_4px_18px_-3px_rgba(21,163,71,0.5),inset_0_1px_0_rgba(255,255,255,0.12)]",
    "active:from-brand-700 active:to-brand-700 active:scale-[0.98]",
    "transition-all duration-150",
  ].join(" "),
  secondary: [
    "bg-foreground text-white",
    "shadow-[0_1px_3px_rgba(0,0,0,0.15)]",
    "hover:opacity-85 hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)]",
    "active:scale-[0.98]",
    "transition-all duration-150",
  ].join(" "),
  outline: [
    "border border-border bg-surface text-foreground",
    "hover:bg-background hover:border-brand-400 hover:text-brand-700",
    "active:scale-[0.98]",
    "transition-all duration-150",
  ].join(" "),
  ghost: [
    "text-foreground",
    "hover:bg-background hover:text-brand-700",
    "active:scale-[0.98]",
    "transition-all duration-150",
  ].join(" "),
  danger: [
    "bg-danger text-white",
    "shadow-[0_1px_3px_rgba(0,0,0,0.15)]",
    "hover:opacity-85 hover:shadow-[0_4px_12px_rgba(220,38,38,0.35)]",
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
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium focus-ring disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none";

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
